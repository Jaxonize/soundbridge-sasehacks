-- SoundBridge demo schema. Run once in a fresh Supabase project's SQL editor.
-- Tables are service-only: RLS denies browser access and the Edge Function
-- authenticates every request with a hashed session capability.
create table public.sb_sessions (
 id uuid primary key default gen_random_uuid(),
 secret_hash text not null,
 name text not null check(char_length(name) between 1 and 40),
 role text not null check(role in ('requester','volunteer')),
 expires_at timestamptz not null default now()+interval '4 hours'
);
create table public.sb_rooms (
 id uuid primary key default gen_random_uuid(),
 requester uuid references public.sb_sessions(id) on delete cascade,
 volunteer uuid references public.sb_sessions(id) on delete cascade,
 context text not null default '',
 state text not null default 'active' check(state in ('active','ended')),
 invite_key uuid unique,
 created_at timestamptz not null default now(), ended_at timestamptz
);
create table public.sb_queue (
 session_id uuid primary key references public.sb_sessions(id) on delete cascade,
 context text not null default '', updated_at timestamptz not null default now()
);
create table public.sb_events (
 id bigint generated always as identity primary key,
 room_id uuid not null references public.sb_rooms(id) on delete cascade,
 sender_id uuid not null references public.sb_sessions(id) on delete cascade,
 kind text not null check(kind in ('message','offer','answer','ice','attention','media')),
 payload jsonb not null, created_at timestamptz not null default now()
);
create index sb_events_room_cursor on public.sb_events(room_id,id);
create table public.sb_reports (
 id uuid primary key default gen_random_uuid(), room_id uuid, reporter uuid,
 reason text not null, created_at timestamptz not null default now()
);
alter table public.sb_sessions enable row level security;
alter table public.sb_rooms enable row level security;
alter table public.sb_queue enable row level security;
alter table public.sb_events enable row level security;
alter table public.sb_reports enable row level security;
revoke all on public.sb_sessions,public.sb_rooms,public.sb_queue,public.sb_events,public.sb_reports from anon,authenticated;
grant all on public.sb_sessions,public.sb_rooms,public.sb_queue,public.sb_events,public.sb_reports to service_role;
grant usage,select on sequence public.sb_events_id_seq to service_role;

-- Service-only transactional functions follow.
CREATE OR REPLACE FUNCTION public.sb_append(p_session uuid, p_room uuid, p_kind text, p_payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_room sb_rooms; v_id bigint;
begin
 select * into v_room from sb_rooms where id=p_room and (requester=p_session or volunteer=p_session) for update;
 if v_room.id is null or v_room.state<>'active' or v_room.volunteer is null or v_room.created_at<now()-interval '30 minutes' then raise exception 'Call not active'; end if;
 insert into sb_events(room_id,sender_id,kind,payload) values(p_room,p_session,p_kind,p_payload) returning id into v_id;
 return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.sb_cancel(p_session uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_room uuid;
begin
 perform pg_advisory_xact_lock(719042);
 update sb_sessions set expires_at=now() where id=p_session;
 delete from sb_queue where session_id=p_session;
 for v_room in select id from sb_rooms where (requester=p_session or volunteer=p_session) and state='active' loop
  perform sb_finish(p_session,v_room);
 end loop;
end $function$
;

CREATE OR REPLACE FUNCTION public.sb_finish(p_session uuid, p_room uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_room uuid;
begin
 select id into v_room from sb_rooms where id=p_room and (requester=p_session or volunteer=p_session) for update;
 if v_room is null then raise exception 'Room unavailable'; end if;
 if p_reason is not null then
  insert into sb_reports(room_id,reporter,reason) values(p_room,p_session,left(p_reason,500));
 end if;
 update sb_rooms set state='ended',ended_at=coalesce(ended_at,now()) where id=p_room;
 delete from sb_events where room_id=p_room;
 delete from sb_queue where session_id=p_session;
end $function$
;

CREATE OR REPLACE FUNCTION public.sb_invite(p_session uuid, p_context text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_room sb_rooms; v_role text;
begin
 perform pg_advisory_xact_lock(719042);
 select role into v_role from sb_sessions where id=p_session and expires_at>now();
 if v_role is distinct from 'requester' then raise exception 'Requester session required'; end if;
 select * into v_room from sb_rooms where requester=p_session and state='active' and created_at>now()-interval '30 minutes' order by created_at desc limit 1 for update;
 if v_room.volunteer is not null then raise exception 'Already matched. Your call is ready.'; end if;
 delete from sb_queue where session_id=p_session;
 if v_room.id is null then
  insert into sb_rooms(requester,context,invite_key) values(p_session,left(p_context,300),gen_random_uuid()) returning * into v_room;
 elsif v_room.invite_key is null then
  update sb_rooms set invite_key=gen_random_uuid() where id=v_room.id returning * into v_room;
 end if;
 return jsonb_build_object('id',v_room.id,'invite',v_room.invite_key);
end $function$
;

CREATE OR REPLACE FUNCTION public.sb_join(p_session uuid, p_invite uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_room uuid;
begin
 perform pg_advisory_xact_lock(719042);
 if not exists(select 1 from sb_sessions where id=p_session and role='volunteer' and expires_at>now()) then raise exception 'Volunteer session required'; end if;
 if exists(select 1 from sb_rooms where (requester=p_session or volunteer=p_session) and state='active' and created_at>now()-interval '30 minutes') then raise exception 'You already have an active call'; end if;
 update sb_rooms set volunteer=p_session where invite_key=p_invite and state='active' and volunteer is null and created_at>now()-interval '30 minutes' returning id into v_room;
 if v_room is null then raise exception 'This invitation has expired or is already in use.'; end if;
 delete from sb_queue where session_id=p_session;
 return v_room;
end $function$
;

CREATE OR REPLACE FUNCTION public.sb_match(p_session uuid, p_context text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_role text; v_partner uuid; v_room uuid;
begin
 perform pg_advisory_xact_lock(719042);
 delete from sb_queue where updated_at < now()-interval '45 seconds';
 select role into v_role from sb_sessions where id=p_session and expires_at>now();
 if v_role is null then raise exception 'Session expired'; end if;
 select id into v_room from sb_rooms where (requester=p_session or volunteer=p_session) and state='active' and created_at>now()-interval '30 minutes' order by created_at desc limit 1;
 if v_room is not null then return v_room; end if;
 select q.session_id into v_partner from sb_queue q join sb_sessions s on s.id=q.session_id
 where s.role<>v_role and s.expires_at>now() and q.session_id<>p_session
 and not exists (select 1 from sb_rooms r where (r.requester=q.session_id or r.volunteer=q.session_id) and r.state='active' and r.created_at>now()-interval '30 minutes')
 order by random() limit 1 for update of q skip locked;
 if v_partner is null then
  insert into sb_queue(session_id,context) values(p_session,left(p_context,300)) on conflict(session_id) do update set updated_at=now(),context=excluded.context;
  return null;
 end if;
 insert into sb_rooms(requester,volunteer,context)
 values(case when v_role='requester' then p_session else v_partner end,
 case when v_role='volunteer' then p_session else v_partner end,
 case when v_role='requester' then left(p_context,300) else coalesce((select context from sb_queue where session_id=v_partner),'') end)
 returning id into v_room;
 delete from sb_queue where session_id in (p_session,v_partner);
 return v_room;
end $function$
;

revoke all on function public.sb_match(uuid,text),public.sb_invite(uuid,text),public.sb_join(uuid,uuid),public.sb_cancel(uuid),public.sb_append(uuid,uuid,text,jsonb),public.sb_finish(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.sb_match(uuid,text),public.sb_invite(uuid,text),public.sb_join(uuid,uuid),public.sb_cancel(uuid),public.sb_append(uuid,uuid,text,jsonb),public.sb_finish(uuid,uuid,text) to service_role;
