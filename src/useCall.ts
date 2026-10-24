import { useCallback, useEffect, useRef, useState } from "react";
import { api, poll, sendEvent } from "./api";
import { createPeer } from "./media";
import { endpoint, publishableKey } from "./config";
import type { Message, Room, Session, WireEvent } from "./types";

export function useCall(
  session: Session | null,
  room: Room | null,
  stream: MediaStream | null,
  demo: boolean,
  onEnd: () => void,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [connection, setConnection] = useState("Connecting");
  const [error, setError] = useState("");
  const [attention, setAttention] = useState(false);
  const [peerMedia, setPeerMedia] = useState({ camera: true, mic: false });
  const pc = useRef<RTCPeerConnection | null>(null);
  const cursor = useRef(0);
  const ice = useRef<RTCIceCandidateInit[]>([]);
  const stopped = useRef(false);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const flash = useCallback(() => {
    setAttention(true);
  }, []);
  const add = useCallback(
    (text: string, from: Message["from"], speech = false) => {
      setMessages((old) => [
        ...old,
        { id: crypto.randomUUID(), text, from, time: Date.now(), speech },
      ]);
    },
    [],
  );
  const transmit = useCallback(
    async (kind: string, payload: Record<string, unknown>) => {
      if (!session || !room || stopped.current) return;
      await sendEvent(session, room.id, kind, payload);
    },
    [session, room],
  );

  useEffect(() => {
    if (demo) {
      setConnection("Practice demo");
      return;
    }
    if (!session || !room) return;
    stopped.current = false;
    let disposed = false;
    let timer: number;
    let failures = 0;
    const rtc = createPeer(
      stream,
      (kind, payload) => {
        void transmit(kind, payload).catch(() =>
          setError("Media connection interrupted. Text may still work."),
        );
      },
      setRemote,
      (state) => {
        if (state === "connected") {
          setConnection("Connected");
          setError("");
        } else if (state === "failed") {
          setConnection("Text connected");
          setError(
            "Video could not cross this network. You can keep using text, or try another Wi-Fi connection.",
          );
        } else if (state === "disconnected")
          setConnection("Reconnecting media");
      },
    );
    pc.current = rtc;
    const process = async (event: WireEvent) => {
      if (event.sender_id === session.id) return;
      if (event.kind === "message" && typeof event.payload.text === "string")
        add(event.payload.text, "peer", !!event.payload.speech);
      else if (event.kind === "attention") flash();
      else if (event.kind === "media")
        setPeerMedia({
          camera: !!event.payload.camera,
          mic: !!event.payload.mic,
        });
      else if (event.kind === "offer" || event.kind === "answer") {
        await rtc.setRemoteDescription(
          event.payload as unknown as RTCSessionDescriptionInit,
        );
        for (const candidate of ice.current.splice(0))
          await rtc.addIceCandidate(candidate);
        if (event.kind === "offer") {
          const answer = await rtc.createAnswer();
          await rtc.setLocalDescription(answer);
          await transmit("answer", { type: answer.type, sdp: answer.sdp });
        }
      } else if (event.kind === "ice") {
        if (rtc.remoteDescription) await rtc.addIceCandidate(event.payload);
        else ice.current.push(event.payload);
      }
    };
    const tick = async () => {
      if (disposed) return;
      try {
        const result = await poll(session, room.id, cursor.current);
        if (disposed) return;
        failures = 0;
        if (rtc.connectionState !== "connected")
          setConnection("Text connected");
        setError((old) => (old.startsWith("Connection lost") ? "" : old));
        if (result.room.state === "ended") {
          stopped.current = true;
          onEndRef.current();
          return;
        }
        for (const event of result.events) {
          try {
            await process(event);
          } catch {
            setError(
              "Video is unavailable on this network. Your text connection is still active.",
            );
          }
          cursor.current = Math.max(cursor.current, event.id);
        }
      } catch (e) {
        failures++;
        if (failures >= 2)
          setError(
            `Connection lost. Retrying… ${e instanceof Error ? e.message : ""}`,
          );
      }
      if (!disposed) timer = window.setTimeout(tick, failures ? 2400 : 850);
    };
    const begin = async () => {
      try {
        await transmit("media", {
          camera: !!stream?.getVideoTracks().some((t) => t.enabled),
          mic: !!stream?.getAudioTracks().some((t) => t.enabled),
        });
        if (session.role === "requester") {
          const offer = await rtc.createOffer();
          if (disposed) return;
          await rtc.setLocalDescription(offer);
          await transmit("offer", { type: offer.type, sdp: offer.sdp });
        }
      } catch {
        setError("Could not start video. You can still use text.");
      }
      void tick();
    };
    void begin();
    const leave = () => {
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: publishableKey },
        body: JSON.stringify({
          action: "end",
          sessionId: session.id,
          token: session.token,
          roomId: room.id,
        }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("pagehide", leave);
    return () => {
      disposed = true;
      stopped.current = true;
      clearTimeout(timer);
      rtc.close();
      window.removeEventListener("pagehide", leave);
    };
    // A call owns one fixed room, session, and media stream for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (text: string, speech = false) => {
    const clean = text.trim().slice(0, 2000);
    if (!clean) return;
    if (!demo) await transmit("message", { text: clean, speech });
    add(clean, "you", speech);
  };
  const signalAttention = async () => {
    if (!demo) await transmit("attention", {});
    add("Sent an attention signal.", "system");
    if (demo) flash();
  };
  const end = async (reason?: string) => {
    if (!demo && session && room)
      await api(reason ? "report" : "end", session, {
        roomId: room.id,
        reason,
      });
    stopped.current = true;
    pc.current?.close();
  };
  return {
    messages,
    remote,
    connection,
    error,
    attention,
    dismissAttention: () => setAttention(false),
    peerMedia,
    add,
    send,
    signalAttention,
    end,
    transmit,
    pc,
  };
}
