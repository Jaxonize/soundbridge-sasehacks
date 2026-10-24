import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Bell,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  Download,
  Flag,
  Headphones,
  Maximize2,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Type,
  Video,
  Volume2,
  X,
} from "lucide-react";
import { KettleArt } from "./Illustrations";
import { useCall } from "./useCall";
import Modal from "./Modal";
import type { Message, Role, Room, Session, Settings } from "./types";

const scenarios = [
  {
    name: "A sound at home",
    context: "There’s a sound in my kitchen. What is it?",
    caption: "That’s your kettle whistling. Your tea is ready! ☕",
    detail: "It’s coming from the counter, to the right of the window.",
    followup:
      "It has stopped now. There aren’t any other new sounds that I can hear.",
  },
  {
    name: "An announcement",
    context: "I’m at the station. What did that announcement say?",
    caption: "The next train is arriving on platform 2 in three minutes.",
    detail: "The announcement said to stand behind the yellow line.",
    followup:
      "The train is approaching from your left. The announcement is repeating the platform number.",
  },
  {
    name: "Someone at the door",
    context: "Something is making a sound near my front door.",
    caption: "That’s your doorbell. Someone rang it twice.",
    detail: "The sound is coming from the small chime above the door.",
    followup:
      "I can hear a person say “delivery” outside. I can’t confirm who they are, so check before opening the door.",
  },
];

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: {
        resultIndex: number;
        results: {
          length: number;
          [n: number]: {
            isFinal: boolean;
            [n: number]: { transcript: string };
          };
        };
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type Props = {
  session: Session | null;
  room: Room | null;
  stream: MediaStream | null;
  demo: boolean;
  role: Role;
  settings: Settings;
  onFinish: (
    messages: Message[],
    duration: number,
    peer: string,
    reason?: string,
  ) => void;
};

export default function Call({
  session,
  room,
  stream,
  demo,
  role,
  settings,
  onFinish,
}: Props) {
  const [duration, setDuration] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [camera, setCamera] = useState(
    !!stream?.getVideoTracks().some((t) => t.enabled),
  );
  const [mic, setMic] = useState(
    !!stream?.getAudioTracks().some((t) => t.enabled),
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [big, setBig] = useState(false);
  const [scenario, setScenario] = useState(0);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("");
  const [ending, setEnding] = useState(false);
  const [mutedRemote, setMutedRemote] = useState(false);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const liveMessages = useRef<Message[]>([]);
  const liveDuration = useRef(0);
  const name = demo ? "Alex" : room?.peer?.name || "Your volunteer";
  const call = useCall(session, room, stream, demo, () =>
    onFinish(
      liveMessages.current,
      liveDuration.current,
      name,
      "Your partner ended the call.",
    ),
  );
  liveMessages.current = call.messages;
  liveDuration.current = duration;
  const latest = call.messages.filter((m) => m.from === "peer").at(-1);
  const recognitionCtor =
    (
      window as unknown as {
        SpeechRecognition?: new () => Recognition;
        webkitSpeechRecognition?: new () => Recognition;
      }
    ).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => Recognition })
      .webkitSpeechRecognition;

  useEffect(() => {
    const start = Date.now();
    const t = window.setInterval(
      () => setDuration(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    if (remoteVideo.current && call.remote) {
      remoteVideo.current.srcObject = call.remote;
      void remoteVideo.current.play().catch(() => setAutoPlayBlocked(true));
    }
  }, [call.remote]);
  useEffect(() => {
    feed.current?.scrollTo({
      top: feed.current.scrollHeight,
      behavior: "smooth",
    });
  }, [call.messages, interim]);
  useEffect(() => {
    if (call.attention && settings.vibration && "vibrate" in navigator)
      navigator.vibrate([180, 120, 180]);
  }, [call.attention, settings.vibration]);
  useEffect(
    () => () => {
      recognition.current?.stop();
    },
    [],
  );
  useEffect(() => {
    if (!demo) return;
    const s = scenarios[scenario];
    const timers = [
      window.setTimeout(
        () => call.add(s.context, role === "requester" ? "you" : "peer"),
        450,
      ),
      window.setTimeout(
        () =>
          call.add(
            role === "requester"
              ? "Hi! I’m Alex. I’m listening to the sound around you."
              : "Could you help me understand that sound?",
            "peer",
          ),
        1500,
      ),
      window.setTimeout(
        () =>
          call.add(
            role === "requester"
              ? s.caption
              : "Try typing a description below, or use the microphone to turn your voice into text.",
            "peer",
          ),
        3600,
      ),
    ];
    return () => timers.forEach(clearTimeout);
    // Demo scenarios are deliberately scripted and labeled in the UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  const send = async (text = draft, speech = false) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setNotice("");
    try {
      await call.send(text, speech);
      setDraft("");
      if (demo) {
        const lower = text.toLowerCase();
        const s = scenarios[scenario];
        const reply =
          role === "volunteer"
            ? "Thank you! Having that in text makes a difference."
            : lower.includes("where") || lower.includes("closer")
              ? s.detail
              : lower.includes("thank")
                ? "You’re welcome. Happy to be your ears for a moment!"
                : lower.includes("again") || lower.includes("repeat")
                  ? s.caption
                  : s.followup;
        window.setTimeout(() => call.add(reply, "peer"), 1100);
      }
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Message not sent. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };
  const toggleMedia = async (kind: "camera" | "mic") => {
    const tracks =
      kind === "camera" ? stream?.getVideoTracks() : stream?.getAudioTracks();
    if (!tracks?.length) {
      setNotice(
        `No ${kind === "camera" ? "camera" : "microphone"} was shared. End this call and enable it in the connection check, or continue with text.`,
      );
      return;
    }
    const enabled = kind === "camera" ? !camera : !mic;
    tracks.forEach((t) => (t.enabled = enabled));
    if (kind === "camera") setCamera(enabled);
    else setMic(enabled);
    try {
      await call.transmit("media", {
        camera: kind === "camera" ? enabled : camera,
        mic: kind === "mic" ? enabled : mic,
      });
    } catch {
      setNotice("Your device changed, but your partner could not be notified.");
    }
  };
  const flipCamera = async () => {
    if (!stream || !camera) {
      setNotice("Enable your camera before switching it.");
      return;
    }
    try {
      const current = stream.getVideoTracks()[0];
      const facing =
        current.getSettings().facingMode === "environment"
          ? "user"
          : "environment";
      const replacement = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
        audio: false,
      });
      const next = replacement.getVideoTracks()[0];
      const sender = call.pc.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(next);
      stream.removeTrack(current);
      current.stop();
      stream.addTrack(next);
      if (localVideo.current)
        localVideo.current.srcObject = new MediaStream(stream.getTracks());
    } catch {
      setNotice("Could not switch cameras on this device.");
    }
  };
  const startDictation = () => {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    if (!recognitionCtor) {
      setNotice(
        "Voice typing is not supported in this browser. Type a message, or use Chrome or Edge.",
      );
      return;
    }
    const r = new recognitionCtor();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal)
          setDraft((old) =>
            (old + " " + e.results[i][0].transcript).trim().slice(0, 2000),
          );
        else partial += e.results[i][0].transcript;
      }
      setInterim(partial);
    };
    r.onerror = (e) => {
      setNotice(
        e.error === "not-allowed"
          ? "Microphone permission was denied. You can still type."
          : `Voice typing stopped (${e.error}). You can retry or type.`,
      );
      setListening(false);
      setInterim("");
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    recognition.current = r;
    try {
      r.start();
      setListening(true);
      setNotice(
        "Voice typing adds words to your draft. Review them, then send.",
      );
    } catch {
      setNotice("Could not start voice typing. Please try again.");
    }
  };
  const finish = async (reportReason?: string) => {
    setEnding(true);
    recognition.current?.stop();
    try {
      await call.end(reportReason);
      onFinish(
        call.messages,
        duration,
        name,
        reportReason ? "Report received. This call has ended." : undefined,
      );
    } catch (e) {
      setReport(false);
      setNotice(
        `Could not notify the server: ${e instanceof Error ? e.message : "Please retry."} You can leave locally below.`,
      );
      setEnding(false);
    }
  };
  const exportText = () => {
    const text = [
      "SoundBridge — " + (demo ? "Practice demo" : "Call transcript"),
      new Date().toLocaleString(),
      "",
      ...call.messages
        .filter((m) => m.from !== "system")
        .map((m) => `${m.from === "you" ? "You" : name}: ${m.text}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `soundbridge-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setMenu(false);
  };
  const quick =
    role === "requester"
      ? ["Where is it coming from?", "Could you repeat that?", "Thank you!"]
      : [
          "I’m listening.",
          "One moment, please.",
          "Could you move closer to the sound?",
        ];

  return (
    <main
      className={`call-page ${call.attention ? "attention-active" : ""} ${big ? "caption-focus" : ""}`}
    >
      <header className="call-header">
        <a href="#" className="brand" onClick={(e) => e.preventDefault()}>
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          SoundBridge<span className="brand-period">.</span>
        </a>
        <span className={`status-pill ${demo ? "demo-pill" : ""}`}>
          <span className="status-dot" />
          {call.connection}
        </span>
        <div className="call-header-right">
          <span className="timer">
            {Math.floor(duration / 60)
              .toString()
              .padStart(2, "0")}
            :{(duration % 60).toString().padStart(2, "0")}
          </span>
          <button
            className="icon-button"
            aria-label="Call options"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <MoreHorizontal size={22} />
          </button>
          {menu && (
            <div className="popover">
              <button onClick={exportText}>
                <Download size={17} /> Save transcript
              </button>
              <button
                onClick={() => {
                  setReport(true);
                  setMenu(false);
                }}
              >
                <Flag size={17} /> Report & leave
              </button>
            </div>
          )}
        </div>
      </header>
      {demo && (
        <div className="demo-banner">
          <Sparkles size={16} />
          <span>
            <strong>Practice mode</strong> · Alex and the scene are simulated.
            No camera or microphone is shared.
          </span>
          <button onClick={() => void finish()}>
            Exit demo <X size={16} />
          </button>
        </div>
      )}
      <div className="call-title">
        <div>
          <span className="eyebrow">
            {role === "requester"
              ? "YOUR MOMENT OF CLARITY"
              : "A LITTLE OF YOUR TIME. A BIG DIFFERENCE."}
          </span>
          <h1>
            {role === "requester"
              ? `You’re with ${name}.`
              : `You’re helping ${name}.`}
          </h1>
        </div>
        <span className="call-context">
          {demo
            ? scenarios[scenario].name
            : room?.context || "Everyday sound help"}
        </span>
      </div>
      {call.attention && (
        <div className="attention-banner" role="alert">
          <Bell size={22} />
          <span>
            {demo
              ? "This is what a visual attention signal looks like."
              : `${name} wants your attention.`}
          </span>
          <button
            className="icon-button"
            aria-label="Dismiss attention signal"
            onClick={call.dismissAttention}
          >
            <X size={20} />
          </button>
        </div>
      )}
      {(call.error || notice) && (
        <div className="notice" role="status">
          {notice || call.error}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="call-grid">
        <section className="video-column" aria-label="Video call">
          <div className={`main-video ${demo ? "demo-scene" : ""}`}>
            {demo ? (
              <KettleArt scenario={scenario} />
            ) : (
              <>
                <video
                  ref={remoteVideo}
                  autoPlay
                  playsInline
                  muted={mutedRemote}
                  aria-label={`${name}'s call video`}
                />
                {(!call.remote || !call.peerMedia.camera) && (
                  <div className="video-placeholder">
                    <div className="person-avatar">
                      {name[0]?.toUpperCase()}
                    </div>
                    <h2>{name}</h2>
                    <p>
                      {!call.peerMedia.camera
                        ? "Camera is off. You’re still connected."
                        : "Connecting video. Your text chat is ready."}
                    </p>
                    <span className="sound-lines">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="video-label">
              <span className="status-dot" />
              {demo ? "Your surroundings · illustrated scene" : name}
            </div>
            {!demo && (
              <div className="self-video">
                <video ref={localVideo} autoPlay playsInline muted />
                {!camera && <CameraOff size={23} />}
                <span>You {mic ? "" : "· muted"}</span>
              </div>
            )}
            {!demo && (
              <button
                className="video-audio"
                aria-label={
                  mutedRemote ? "Unmute partner audio" : "Mute partner audio"
                }
                onClick={() => {
                  setMutedRemote(!mutedRemote);
                  if (remoteVideo.current)
                    void remoteVideo.current
                      .play()
                      .catch(() => setAutoPlayBlocked(true));
                }}
              >
                <Volume2 size={17} />
                {mutedRemote ? "Sound off" : "Sound on"}
              </button>
            )}
            {autoPlayBlocked && (
              <button
                className="play-audio button"
                onClick={() => {
                  void remoteVideo.current
                    ?.play()
                    .then(() => setAutoPlayBlocked(false));
                }}
              >
                Tap to enable call audio
              </button>
            )}
          </div>
          {demo ? (
            <div className="scenario-picker">
              <span>Explore a moment</span>
              {scenarios.map((s, i) => (
                <button
                  key={s.name}
                  className={i === scenario ? "selected" : ""}
                  onClick={() => setScenario(i)}
                >
                  {["At home", "On the go", "At the door"][i]}
                </button>
              ))}
            </div>
          ) : (
            <div className="video-controls">
              <button
                className={`control-button ${!camera ? "off" : ""}`}
                onClick={() => void toggleMedia("camera")}
                aria-label={camera ? "Turn camera off" : "Turn camera on"}
                aria-pressed={camera}
              >
                {camera ? <Camera size={21} /> : <CameraOff size={21} />}
                <span>Camera</span>
              </button>
              <button
                className={`control-button ${!mic ? "off" : ""}`}
                onClick={() => void toggleMedia("mic")}
                aria-label={mic ? "Mute microphone" : "Unmute microphone"}
                aria-pressed={mic}
              >
                {mic ? <Mic size={21} /> : <MicOff size={21} />}
                <span>Microphone</span>
              </button>
              <button
                className="control-button"
                onClick={() => void flipCamera()}
                aria-label="Switch front and back camera"
              >
                <RotateCcw size={21} />
                <span>Flip</span>
              </button>
              <button
                className="control-button"
                onClick={() =>
                  void call
                    .signalAttention()
                    .catch(() =>
                      setNotice("Attention signal not sent. Please retry."),
                    )
                }
              >
                <Bell size={21} />
                <span>Attention</span>
              </button>
            </div>
          )}
          <div className="call-tip">
            <ShieldCheck size={20} />
            <p>
              <strong>A private moment, on your terms.</strong>
              <br />
              {demo
                ? "This is a scripted preview. Start a real connection to meet a volunteer."
                : "No call recording. End the call anytime. Volunteers offer everyday help, not emergency assistance."}
            </p>
          </div>
          {demo && (
            <button
              className="text-button demo-attention"
              onClick={() => void call.signalAttention()}
            >
              <Bell size={16} /> Try the visual attention signal
            </button>
          )}
        </section>
        <section
          className={`transcript-panel text-${settings.size}`}
          aria-label="Conversation"
        >
          <div className="transcript-heading">
            <div>
              <span className="green-icon">
                <Type size={18} />
              </span>
              <h2>Words that connect</h2>
            </div>
            <button
              className="icon-button"
              aria-label={big ? "Show video and text" : "Focus on text"}
              aria-pressed={big}
              onClick={() => setBig(!big)}
            >
              <Maximize2 size={18} />
            </button>
          </div>
          <div className="latest-caption" aria-live="polite" aria-atomic="true">
            <span className="eyebrow">
              {role === "requester"
                ? "LATEST SOUND DESCRIPTION"
                : "LATEST MESSAGE"}
            </span>
            <p>
              {latest?.text ||
                "Your conversation will appear here. You can start with a message below."}
            </p>
            {latest && (
              <span className="caption-author">
                {name} <Check size={13} />
              </span>
            )}
          </div>
          <div
            className="chat-feed"
            ref={feed}
            role="log"
            aria-label="Message history"
            aria-live="polite"
            aria-relevant="additions"
          >
            <div className="chat-start">
              <span>
                {demo ? "Practice conversation" : "Connected securely"}
              </span>
              <p>
                {role === "requester"
                  ? "Share what you’d like to understand."
                  : "Describe the sound, where it is, and what it means."}
              </p>
            </div>
            {call.messages.map((m) =>
              m.from === "system" ? (
                <div className="system-message" key={m.id}>
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className={`chat-message ${m.from}`}>
                  <div className="message-meta">
                    {m.from === "you" ? "You" : name}
                    <span>
                      {new Date(m.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {m.speech && <Mic size={12} />}
                  </div>
                  <p>{m.text}</p>
                </div>
              ),
            )}
          </div>
          <div className="compose-area">
            <div className="quick-replies" aria-label="Quick replies">
              {quick.map((t) => (
                <button key={t} disabled={sending} onClick={() => void send(t)}>
                  {t}
                </button>
              ))}
            </div>
            {interim && (
              <p className="interim" aria-live="polite">
                Hearing: {interim}
              </p>
            )}
            <form
              className="message-input"
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft, listening);
              }}
            >
              <label className="sr-only" htmlFor="message">
                Message to {name}
              </label>
              <textarea
                id="message"
                rows={1}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  role === "requester"
                    ? "Ask about a sound…"
                    : "Describe what you hear…"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(draft, listening);
                  }
                }}
              />
              <button
                className={`dictation-button ${listening ? "listening" : ""}`}
                type="button"
                onClick={startDictation}
                aria-label={
                  listening ? "Stop voice typing" : "Start voice typing"
                }
                aria-pressed={listening}
              >
                {listening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button
                className="send-button"
                disabled={!draft.trim() || sending}
                aria-label="Send message"
              >
                {sending ? <span className="spinner" /> : <ArrowUp size={22} />}
              </button>
            </form>
            <span className="input-hint">
              {listening
                ? "Listening · review your words before sending"
                : "Type, or tap the mic to turn your voice into text."}
            </span>
          </div>
        </section>
      </div>
      <footer className="call-footer">
        <span>
          <Headphones size={17} />
          {demo
            ? "A small preview of a more connected world."
            : "Human connection. A little more understanding."}
        </span>
        <button
          className="end-call"
          onClick={() => void finish()}
          disabled={ending}
        >
          <PhoneOff size={19} />
          {ending ? "Ending…" : demo ? "Finish demo" : "End call"}
        </button>
      </footer>
      {notice.startsWith("Could not notify") && (
        <button
          className="leave-local"
          onClick={() =>
            onFinish(
              call.messages,
              duration,
              name,
              "Call ended on this device. The server could not be reached.",
            )
          }
        >
          Leave on this device
        </button>
      )}
      {report && (
        <Modal
          title="Report and leave"
          onClose={() => {
            if (!ending) setReport(false);
          }}
        >
          <button
            className="modal-close icon-button"
            aria-label="Close report"
            onClick={() => setReport(false)}
            disabled={ending}
          >
            <X size={22} />
          </button>
          <Flag className="orange" size={28} />
          <h2>Something didn’t feel right?</h2>
          <p>
            Tell us what happened. Submitting ends this call. Reports are stored
            for review; this hackathon prototype has no staffed moderation team.
          </p>
          <label htmlFor="report-reason">What happened?</label>
          <textarea
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Describe the issue…"
          />
          <button
            className="button danger wide"
            disabled={!reason.trim() || ending}
            onClick={() => void finish(reason)}
          >
            {ending ? "Sending report…" : "Submit report & leave"}
          </button>
        </Modal>
      )}
    </main>
  );
}
