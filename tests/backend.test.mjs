import test from "node:test";
import assert from "node:assert/strict";

const endpoint =
  "https://sqoytpwiasctmngskrgk.supabase.co/functions/v1/soundbridge";
const key = "sb_publishable_gdMxLzpG52z_gQiADirEQQ_OoL2WSqB";
async function request(action, session, data = {}) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({
      action,
      sessionId: session?.id,
      token: session?.token,
      ...data,
    }),
  });
  return { status: r.status, body: await r.json() };
}
async function ok(action, session, data) {
  const r = await request(action, session, data);
  assert.equal(r.status, 200, `${action}: ${JSON.stringify(r.body)}`);
  return r.body;
}
const session = (name, role) =>
  ok("session", null, { name: `QA ${name}`, role });

test(
  "live backend: matching, authentication, private chat, invitations, reports, and cleanup",
  { timeout: 90000 },
  async (t) => {
    const requester = await session("requester", "requester");
    const volunteer = await session("volunteer", "volunteer");
    const outsider = await session("outsider", "volunteer");
    let room;
    await t.test(
      "validates input and rejects forged session credentials",
      async () => {
        assert.equal(
          (await request("session", null, { name: "", role: "volunteer" }))
            .status,
          400,
        );
        assert.equal(
          (await request("match", { ...requester, token: "forged" })).status,
          401,
        );
        assert.equal((await request("match", null)).status, 401);
      },
    );
    await t.test(
      "matches opposite roles and returns the same room to both participants",
      async () => {
        assert.equal(
          (
            await ok("match", requester, {
              context: "At home · testing a kettle",
            })
          ).room,
          null,
        );
        const matched = await ok("match", volunteer, { context: "" });
        room = matched.room;
        assert.equal(room.peer.id, requester.id);
        const received = (await ok("match", requester, { context: "At home" }))
          .room;
        assert.equal(received.id, room.id);
        assert.equal(received.peer.id, volunteer.id);
        assert.equal(received.context, "At home · testing a kettle");
      },
    );
    await t.test(
      "rejects outsiders and delivers message, attention, and WebRTC signaling",
      async () => {
        assert.equal(
          (await request("poll", outsider, { roomId: room.id })).status,
          400,
        );
        assert.equal(
          (
            await request("event", outsider, {
              roomId: room.id,
              kind: "message",
              payload: { text: "intrusion" },
            })
          ).status,
          400,
        );
        await ok("event", volunteer, {
          roomId: room.id,
          kind: "message",
          payload: { text: "That is your kettle." },
        });
        await ok("event", volunteer, {
          roomId: room.id,
          kind: "attention",
          payload: {},
        });
        await ok("event", requester, {
          roomId: room.id,
          kind: "offer",
          payload: { type: "offer", sdp: "test SDP" },
        });
        const events = (
          await ok("poll", requester, { roomId: room.id, after: 0 })
        ).events;
        assert.equal(events.length, 3);
        assert.equal(events[0].payload.text, "That is your kettle.");
        assert.equal(events[1].kind, "attention");
        assert.equal(events[2].kind, "offer");
        assert.equal(
          (
            await ok("poll", requester, {
              roomId: room.id,
              after: events.at(-1).id,
            })
          ).events.length,
          0,
        );
        assert.equal(
          (
            await request("event", requester, {
              roomId: room.id,
              kind: "message",
              payload: { text: "" },
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "ending the call removes all events and rejects later sends",
      async () => {
        await ok("end", requester, { roomId: room.id });
        const result = await ok("poll", volunteer, { roomId: room.id });
        assert.equal(result.room.state, "ended");
        assert.equal(result.events.length, 0);
        assert.equal(
          (
            await request("event", volunteer, {
              roomId: room.id,
              kind: "message",
              payload: { text: "late" },
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "private invitations admit one volunteer and reports end the call",
      async () => {
        const invitation = await ok("invite", requester, {
          context: "Private invitation test",
        });
        assert.ok(invitation.invite);
        assert.equal(
          (await request("join", requester, { invite: invitation.invite }))
            .status,
          400,
        );
        const joined = await ok("join", volunteer, {
          invite: invitation.invite,
        });
        assert.equal(joined.room.id, invitation.room.id);
        assert.equal(
          (await request("join", outsider, { invite: invitation.invite }))
            .status,
          400,
        );
        await ok("report", requester, {
          roomId: joined.room.id,
          reason: "Automated QA report. No real incident.",
        });
        assert.equal(
          (await ok("poll", volunteer, { roomId: joined.room.id })).room.state,
          "ended",
        );
      },
    );
    await t.test(
      "browser key cannot read private database records",
      async () => {
        const r = await fetch(
          "https://sqoytpwiasctmngskrgk.supabase.co/rest/v1/sb_sessions?select=*",
          { headers: { apikey: key } },
        );
        assert.ok(
          r.status === 401 || r.status === 403,
          `unexpected status ${r.status}`,
        );
      },
    );
    await Promise.all(
      [requester, volunteer, outsider].map((s) => ok("cancel", s)),
    );
  },
);

test(
  "concurrent matching and call termination preserve room invariants",
  { timeout: 90000 },
  async (t) => {
    const [a, b, x, y] = await Promise.all([
      session("race requester A", "requester"),
      session("race requester B", "requester"),
      session("race volunteer X", "volunteer"),
      session("race volunteer Y", "volunteer"),
    ]);
    await Promise.all([
      ok("match", a, { context: "Race A" }),
      ok("match", b, { context: "Race B" }),
    ]);
    const [first, second] = await Promise.all([ok("match", x), ok("match", y)]);
    await t.test(
      "two simultaneous volunteers receive distinct requests",
      async () => {
        assert.notEqual(first.room.id, second.room.id);
        assert.notEqual(first.room.peer.id, second.room.peer.id);
        assert.deepEqual(
          new Set([first.room.peer.id, second.room.peer.id]),
          new Set([a.id, b.id]),
        );
      },
    );
    await t.test(
      "a message racing with call termination cannot survive cleanup",
      async () => {
        const peer = first.room.peer.id === a.id ? a : b;
        const results = await Promise.all([
          ok("end", x, { roomId: first.room.id }),
          ...Array.from({ length: 4 }, (_, i) =>
            request("event", peer, {
              roomId: first.room.id,
              kind: "message",
              payload: { text: `Race event ${i}` },
            }),
          ),
        ]);
        for (const result of results.slice(1))
          assert.ok([200, 400].includes(result.status));
        const ended = await ok("poll", peer, { roomId: first.room.id });
        assert.equal(ended.room.state, "ended");
        assert.deepEqual(ended.events, []);
      },
    );
    await t.test("cancellation invalidates its guest capability", async () => {
      await ok("cancel", x);
      assert.equal((await request("match", x)).status, 401);
    });
    await Promise.all([a, b, y].map((s) => ok("cancel", s)));
  },
);
