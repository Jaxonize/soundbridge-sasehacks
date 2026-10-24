import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store' }
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(v)
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, '0')).join('')
const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const check = (result: { error: unknown }) => { if (result.error) throw new Error('Database temporarily unavailable. Please try again.') }

async function roomFor(id: string, sid: string) {
  if (!uuid(id)) throw new Error('Invalid room.')
  const r = await db.from('sb_rooms').select('*').eq('id', id).or(`requester.eq.${sid},volunteer.eq.${sid}`).maybeSingle()
  check(r)
  if (!r.data) throw new Error('This room is not available to your session.')
  return r.data
}

async function present(room: Record<string, unknown>, sid: string) {
  const peerId = room.requester === sid ? room.volunteer : room.requester
  const peer = peerId ? await db.from('sb_sessions').select('id,name,role').eq('id', peerId).maybeSingle() : null
  if (peer) check(peer)
  return { id: room.id, state: room.state, context: room.context, peer: peer?.data || null }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fail('Use POST.', 405)
  try {
    const raw = await req.text()
    if (raw.length > 25000) return fail('Request too large.', 413)
    const body = JSON.parse(raw)
    const { action, sessionId, token } = body
    let result: unknown = {}
    // Cleanup is opportunistic; expired rows are never returned by the API.
    // No call media is recorded. Ended-call message rows are removed immediately.
    if (action === 'session') {
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : ''
      if (!name || !['requester', 'volunteer'].includes(body.role)) return fail('Enter your name and choose a role.')
      const secret = crypto.randomUUID() + crypto.randomUUID()
      const created = await db.from('sb_sessions').insert({ name, role: body.role, secret_hash: await hash(secret) }).select('id,name,role').single()
      check(created)
      result = { ...created.data, token: secret }
      await db.from('sb_sessions').delete().lt('expires_at', new Date().toISOString())
      await db.from('sb_events').delete().lt('created_at', new Date(Date.now() - 30 * 60000).toISOString())
      await db.from('sb_rooms').update({ state: 'ended', ended_at: new Date().toISOString() }).eq('state', 'active').lt('created_at', new Date(Date.now() - 30 * 60000).toISOString())
    } else {
      if (!uuid(sessionId) || typeof token !== 'string' || token.length > 200) return fail('Your session has expired. Please reconnect.', 401)
      const auth = await db.from('sb_sessions').select('id,name,role').eq('id', sessionId).eq('secret_hash', await hash(token)).gt('expires_at', new Date().toISOString()).maybeSingle()
      check(auth)
      if (!auth.data) return fail('Your session has expired. Please reconnect.', 401)
      if (action === 'match') {
        const context = typeof body.context === 'string' ? body.context.slice(0, 300) : ''
        const m = await db.rpc('sb_match', { p_session: sessionId, p_context: context })
        check(m)
        result = { room: m.data ? await present(await roomFor(m.data, sessionId), sessionId) : null }
      } else if (action === 'cancel') {
        check(await db.rpc('sb_cancel', { p_session: sessionId }))
      } else if (action === 'invite') {
        if (auth.data.role !== 'requester') return fail('Only someone requesting help can create an invitation.')
        const invited = await db.rpc('sb_invite', { p_session: sessionId, p_context: String(body.context || '').slice(0,300) })
        if (invited.error) return fail('Could not create an invitation. You may already be matched.')
        result = { invite: invited.data.invite, room: await present(await roomFor(invited.data.id, sessionId), sessionId) }
      } else if (action === 'join') {
        if (auth.data.role !== 'volunteer' || !uuid(body.invite)) return fail('Open this invitation as a volunteer.')
        const r = await db.rpc('sb_join', { p_session: sessionId, p_invite: body.invite })
        if (r.error || !r.data) return fail('This invitation has expired, is already in use, or you have an active call.')
        result = { room: await present(await roomFor(r.data, sessionId), sessionId) }
      } else if (['poll', 'event', 'end', 'report'].includes(action)) {
        const room = await roomFor(body.roomId, sessionId)
        if (action === 'poll') {
          const events = await db.from('sb_events').select('id,sender_id,kind,payload').eq('room_id', room.id).gt('id', Math.max(0, Number(body.after) || 0)).order('id').limit(200)
          check(events)
          if (new Date(room.created_at).getTime() < Date.now()-30*60000 && room.state==='active') {
            room.state='ended'
            check(await db.from('sb_rooms').update({state:'ended',ended_at:new Date().toISOString()}).eq('id',room.id))
            check(await db.from('sb_events').delete().eq('room_id',room.id))
          }
          result = { room: await present(room, sessionId), events: room.state==='ended' ? [] : events.data }
        } else if (action === 'event') {
          if (room.state !== 'active' || !room.volunteer || new Date(room.created_at).getTime() < Date.now()-30*60000) return fail('This call is not active.')
          const kinds = ['message','offer','answer','ice','attention','media']
          if (!kinds.includes(body.kind) || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) return fail('Invalid call event.')
          if (body.kind === 'message' && (typeof body.payload.text !== 'string' || !body.payload.text.trim() || body.payload.text.length > 2000)) return fail('Messages must be between 1 and 2,000 characters.')
          const recent = await db.from('sb_events').select('id',{count:'exact',head:true}).eq('sender_id',sessionId).gt('created_at',new Date(Date.now()-10000).toISOString())
          check(recent)
          if ((recent.count||0)>100) return fail('Please slow down for a moment.',429)
          const inserted = await db.rpc('sb_append',{p_room:room.id,p_session:sessionId,p_kind:body.kind,p_payload:body.payload})
          if(inserted.error)return fail('This call is no longer active. Please reconnect.')
          result = {id:inserted.data}
        } else {
          const reason=action==='report'?String(body.reason||'').trim().slice(0,500):null
          if(action==='report'&&!reason)return fail('Please describe the issue.')
          check(await db.rpc('sb_finish',{p_session:sessionId,p_room:room.id,p_reason:reason}))
        }
      } else return fail('Unknown action.')
    }
    return new Response(JSON.stringify(result), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
    return fail(message.startsWith('Unexpected') ? 'Invalid request.' : message)
  }
})
