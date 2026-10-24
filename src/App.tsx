import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coffee,
  Copy,
  Ear,
  Heart,
  HeartHandshake,
  Headphones,
  History,
  Home,
  Info,
  Link2,
  LoaderCircle,
  MessageCircle,
  Mic,
  Play,
  Radio,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Type,
  Users,
  Video,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { api, createSession, match, poll } from "./api";
import { BridgeArt } from "./Illustrations";
import Call from "./Call";
import Modal from "./Modal";
import type {
  HistoryItem,
  Message,
  Role,
  Room,
  Session,
  Settings,
} from "./types";

type Screen =
  "home" | "history" | "settings" | "about" | "waiting" | "call" | "summary";
const contexts = [
  "At home",
  "Out & about",
  "An announcement",
  "Something else",
];
const defaults: Settings = {
  size: "standard",
  contrast: false,
  vibration: true,
  name: "",
};
function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}
function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing can disable persistent storage. */
  }
}
const durationText = (seconds: number) =>
  `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

function Preflight({
  role,
  settings,
  invite,
  onClose,
  onStart,
}: {
  role: Role;
  settings: Settings;
  invite: string | null;
  onClose: () => void;
  onStart: (
    name: string,
    context: string,
    stream: MediaStream | null,
  ) => Promise<void>;
}) {
  const [name, setName] = useState(settings.name);
  const [context, setContext] = useState("At home");
  const [details, setDetails] = useState("");
  const [consent, setConsent] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const preview = useRef<HTMLVideoElement>(null);
  const media = useRef<MediaStream | null>(null);
  const handedOff = useRef(false);
  const alive = useRef(true);
  const deviceAttempt = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (!handedOff.current)
        media.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (preview.current) preview.current.srcObject = stream;
  }, [stream]);
  const enable = async (audioOnly = false) => {
    setBusy(true);
    setStatus("");
    const attempt = ++deviceAttempt.current;
    let timeout: number | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera and microphone need HTTPS or localhost. You can continue with text.",
        );
      const request = navigator.mediaDevices
        .getUserMedia({
          video: audioOnly
            ? false
            : {
                facingMode: role === "requester" ? "environment" : "user",
                width: { ideal: 960 },
                height: { ideal: 540 },
              },
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
          },
        })
        .then((s) => {
          if (!alive.current || attempt !== deviceAttempt.current) {
            s.getTracks().forEach((t) => t.stop());
            throw new Error("Device request cancelled.");
          }
          return s;
        });
      const s = await Promise.race([
        request,
        new Promise<MediaStream>((_, reject) => {
          timeout = window.setTimeout(() => {
            deviceAttempt.current++;
            reject(
              new Error(
                "Your browser is waiting for device permission. Check its permission prompt, retry, or continue with text only.",
              ),
            );
          }, 12000);
        }),
      ]);
      // The volunteer hears the requester by default. The volunteer microphone starts muted.
      if (role === "volunteer")
        s.getAudioTracks().forEach((t) => (t.enabled = false));
      media.current?.getTracks().forEach((t) => t.stop());
      media.current = s;
      setStream(s);
      setStatus(
        audioOnly
          ? "Microphone ready. No video will be shared."
          : role === "volunteer"
            ? "Camera ready. Your microphone starts muted."
            : "Camera and microphone ready. You control them during the call.",
      );
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Permission was denied. Check your browser permissions, or continue with text.",
      );
    } finally {
      clearTimeout(timeout);
      if (alive.current) setBusy(false);
    }
  };
  const start = async () => {
    setStarting(true);
    setStatus("");
    handedOff.current = true;
    try {
      await onStart(
        name.trim(),
        [context, details.trim()].filter(Boolean).join(" · "),
        stream,
      );
    } catch (e) {
      handedOff.current = false;
      setStatus(
        e instanceof Error ? e.message : "Could not connect. Please try again.",
      );
      setStarting(false);
    }
  };
  return (
    <Modal
      title="Connection check"
      onClose={() => {
        if (!starting) onClose();
      }}
    >
      <button
        className="modal-close icon-button"
        aria-label="Close connection check"
        onClick={onClose}
        disabled={starting}
      >
        <X size={22} />
      </button>
      <div className="modal-icon">
        <Headphones size={26} />
      </div>
      <span className="eyebrow">A MOMENT BEFORE YOU CONNECT</span>
      <h2>
        {invite
          ? "Someone’s waiting for your ears."
          : role === "requester"
            ? "Let’s find your person."
            : "Your ears can make a difference."}
      </h2>
      <p>
        {role === "requester"
          ? "A volunteer will help describe the sound around you. You choose what to share."
          : "Listen with care. Describe what you hear in clear, specific text."}
      </p>
      <label htmlFor="display-name">
        What should we call you? <span>First name or nickname</span>
      </label>
      <input
        id="display-name"
        placeholder="Your name"
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {role === "requester" && (
        <>
          <label>What would you like help with?</label>
          <div className="context-options">
            {contexts.map((c) => (
              <button
                className={context === c ? "selected" : ""}
                key={c}
                onClick={() => setContext(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="context-details">
            More about the sound, optional
          </label>
          <input
            id="context-details"
            placeholder="A little more context (optional)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={240}
          />
        </>
      )}
      <div className="permission-card">
        <div className="permission-preview">
          {stream?.getVideoTracks().length ? (
            <video ref={preview} autoPlay muted playsInline />
          ) : stream ? (
            <Mic size={28} />
          ) : (
            <Video size={30} />
          )}
        </div>
        <div>
          <strong>
            {stream ? "You’re ready to share" : "Camera & microphone"}
          </strong>
          <p>
            {role === "requester"
              ? "Let your volunteer see and hear your surroundings."
              : "Hear the other person’s sound. Show a friendly face."}
          </p>
          <div className="device-choices">
            <button
              className="text-button"
              onClick={() => void enable()}
              disabled={busy || starting}
            >
              {busy ? (
                <>
                  <span className="spinner" /> Checking devices…
                </>
              ) : stream ? (
                <>
                  <Check size={16} /> Check again
                </>
              ) : (
                <>
                  Enable devices <ArrowRight size={16} />
                </>
              )}
            </button>
            {!stream && !busy && (
              <button
                className="text-button"
                onClick={() => void enable(true)}
                disabled={starting}
              >
                Audio only
              </button>
            )}
          </div>
        </div>
      </div>
      {status && (
        <div className="notice" role="status">
          {status}
        </div>
      )}
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          {role === "volunteer"
            ? "I’ll be respectful, protect privacy, and describe only what I can hear."
            : "I understand I’m connecting with a community volunteer, and I can leave at any time."}
        </span>
      </label>
      <button
        className="button primary wide"
        disabled={!name.trim() || !consent || starting || busy}
        onClick={() => void start()}
      >
        {starting ? (
          <>
            <span className="spinner" /> Connecting…
          </>
        ) : (
          <>
            {invite
              ? "Join the call"
              : role === "requester"
                ? "Find a volunteer"
                : "I’m ready to help"}
            <ArrowRight size={19} />
          </>
        )}
      </button>
      <p className="modal-footnote">
        {stream
          ? "Your devices are shared only after a match."
          : "Devices are off. You can continue with text only."}{" "}
        Everyday help, not an emergency service.
      </p>
    </Modal>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [role, setRole] = useState<Role>(() =>
    new URLSearchParams(location.search).has("invite")
      ? "volunteer"
      : "requester",
  );
  const [settings, setSettings] = useState<Settings>(() => ({
    ...defaults,
    ...readLocal("soundbridge-settings", defaults),
  }));
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    readLocal("soundbridge-history", []),
  );
  const [preflight, setPreflight] = useState(false);
  const [demo, setDemo] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [context, setContext] = useState("");
  const [waitingTime, setWaitingTime] = useState(0);
  const [waitingError, setWaitingError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [qr, setQr] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<{
    item: HistoryItem;
    messages: Message[];
    reason?: string;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [clearConfirm, setClearConfirm] = useState(false);
  const [invite, setInvite] = useState<string | null>(() =>
    new URLSearchParams(location.search).get("invite"),
  );
  const waitingActive = useRef(false);
  const inviteRoom = useRef<Room | null>(null);
  const main = useRef<HTMLElement>(null);
  useEffect(() => saveLocal("soundbridge-settings", settings), [settings]);
  useEffect(() => saveLocal("soundbridge-history", history), [history]);
  useEffect(() => {
    document.documentElement.dataset.contrast = String(settings.contrast);
    document.documentElement.dataset.text = settings.size;
  }, [settings.contrast, settings.size]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    main.current?.focus();
    window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => {
    if (screen !== "waiting" || !session) return;
    waitingActive.current = true;
    let disposed = false;
    let timer: number;
    let fails = 0;
    const start = Date.now();
    const interval = setInterval(
      () => setWaitingTime(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    const tick = async () => {
      try {
        const result = inviteRoom.current
          ? await poll(session, inviteRoom.current.id, 0)
          : await match(session, context);
        if (disposed) return;
        setWaitingError("");
        fails = 0;
        if (result.room?.state === "ended") {
          setWaitingError(
            "This invitation has ended. Return home to start again.",
          );
          return;
        }
        if (result.room?.peer) {
          waitingActive.current = false;
          setRoom(result.room);
          setContext(result.room.context);
          setScreen("call");
          return;
        }
      } catch (e) {
        if (!disposed) {
          fails++;
          setWaitingError(
            e instanceof Error
              ? e.message
              : "Connection interrupted. Retrying…",
          );
        }
      }
      if (!disposed) timer = window.setTimeout(tick, fails ? 3500 : 1800);
    };
    void tick();
    const cancelOnLeave = () => {
      void api("cancel", session).catch(() => {});
    };
    window.addEventListener("pagehide", cancelOnLeave);
    return () => {
      disposed = true;
      waitingActive.current = false;
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener("pagehide", cancelOnLeave);
    };
  }, [screen, session, context]);

  const navigate = (next: Screen) => {
    setScreen(next);
    setClearConfirm(false);
  };
  const start = async (
    name: string,
    ctx: string,
    media: MediaStream | null,
  ) => {
    const s = await createSession(name, role);
    setSettings((old) => ({ ...old, name }));
    setSession(s);
    setStream(media);
    setContext(ctx);
    setDemo(false);
    setWaitingTime(0);
    setWaitingError("");
    setInviteLink("");
    inviteRoom.current = null;
    if (invite) {
      const result = await api<{ room: Room }>("join", s, { invite });
      setRoom(result.room);
      setContext(result.room.context);
      setScreen("call");
      setInvite(null);
      window.history.replaceState({}, "", location.pathname);
    } else setScreen("waiting");
    setPreflight(false);
  };
  const startDemo = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setRoom(null);
    setSession(null);
    setDemo(true);
    setScreen("call");
  };
  const cancelWaiting = async () => {
    waitingActive.current = false;
    if (session)
      try {
        await api("cancel", session);
      } catch {
        setToast(
          "Left the queue on this device. Any disconnected request expires shortly.",
        );
      }
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setScreen("home");
    inviteRoom.current = null;
  };
  const makeInvite = async () => {
    if (!session || inviteBusy) return;
    setInviteBusy(true);
    try {
      const data = await api<{ invite: string; room: Room }>(
        "invite",
        session,
        { context },
      );
      if (!waitingActive.current) return;
      inviteRoom.current = data.room;
      const url = new URL(location.href);
      url.search = "";
      url.searchParams.set("invite", data.invite);
      setInviteLink(url.toString());
      setQr(
        await QRCode.toDataURL(url.toString(), {
          width: 180,
          margin: 2,
          color: { dark: "#2b382b", light: "#ffffff" },
        }),
      );
    } catch (e) {
      setWaitingError(
        e instanceof Error ? e.message : "Could not create invitation.",
      );
    } finally {
      setInviteBusy(false);
    }
  };
  const finish = (
    messages: Message[],
    duration: number,
    peer: string,
    reason?: string,
  ) => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      date: Date.now(),
      duration,
      peer,
      context: demo
        ? "Practice conversation"
        : context || room?.context || "Everyday sound help",
      demo,
      helpful: null,
    };
    setHistory((old) => [item, ...old].slice(0, 50));
    setSummary({ item, messages, reason });
    setScreen("summary");
    setRoom(null);
  };
  const rate = (helpful: boolean) => {
    if (!summary) return;
    setHistory((old) =>
      old.map((i) => (i.id === summary.item.id ? { ...i, helpful } : i)),
    );
    setSummary({ ...summary, item: { ...summary.item, helpful } });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setWaitingError(
        "Copy is unavailable. Select and copy the invitation link below.",
      );
    }
  };
  const exportSummary = () => {
    if (!summary) return;
    const lines = [
      `SoundBridge ${summary.item.demo ? "practice demo" : "conversation"}`,
      new Date(summary.item.date).toLocaleString(),
      "",
      ...summary.messages
        .filter((m) => m.from !== "system")
        .map(
          (m) => `${m.from === "you" ? "You" : summary.item.peer}: ${m.text}`,
        ),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "soundbridge-conversation.txt";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Transcript downloaded to this device.");
  };
  if (screen === "call")
    return (
      <Call
        key={room?.id || "demo"}
        session={session}
        room={room}
        stream={stream}
        demo={demo}
        role={role}
        settings={settings}
        onFinish={finish}
      />
    );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("home")}
          disabled={screen === "waiting"}
          aria-label="SoundBridge home"
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          SoundBridge<span className="brand-period">.</span>
        </button>
        <span className="sidebar-tagline">A little more connected.</span>
        <nav aria-label="Main navigation">
          {[
            { id: "home", icon: Home, label: "Connect" },
            { id: "history", icon: History, label: "Your moments" },
            { id: "settings", icon: Settings2, label: "Preferences" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`nav-item ${screen === id ? "active" : ""}`}
              onClick={() => navigate(id as Screen)}
              disabled={screen === "waiting"}
              aria-current={screen === id ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
              {screen === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-community">
          <div className="community-art">
            <span>✳</span>
            <HeartHandshake size={42} strokeWidth={1.3} />
            <span>✳</span>
          </div>
          <h3>
            Good people.
            <br />
            Small moments.
            <br />
            Real difference.
          </h3>
          <p>A community built on showing up for each other.</p>
          <button
            onClick={() => navigate("about")}
            disabled={screen === "waiting"}
          >
            Our little big idea <ArrowUpRightIcon />
          </button>
        </div>
        <button
          className={`nav-item sidebar-help ${screen === "about" ? "active" : ""}`}
          onClick={() => navigate("about")}
          disabled={screen === "waiting"}
        >
          <CircleHelp size={19} />
          How it works
        </button>
        <div className="sidebar-footer">
          <span className="tiny-sun">✳</span> MADE FOR A MORE CONNECTED WORLD
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <strong>SoundBridge.</strong>
          </div>
          <span className="topbar-note">
            <span className="status-dot" /> Everyday sounds. Human connection.
          </span>
          <div className="topbar-right">
            <span className="community-label">
              <Heart size={15} /> Community powered
            </span>
            <button
              className="profile-button"
              onClick={() => navigate("settings")}
              disabled={screen === "waiting"}
              aria-label="Open your preferences"
            >
              {settings.name ? (
                settings.name.slice(0, 1).toUpperCase()
              ) : (
                <Users size={18} />
              )}
            </button>
          </div>
        </header>
        <main
          id="main"
          className={`page-content page-${screen}`}
          ref={main}
          tabIndex={-1}
        >
          {screen === "home" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    A HELPING HAND. A LISTENING EAR.
                  </span>
                  <h1>
                    {settings.name
                      ? `Welcome back, ${settings.name}.`
                      : "A little help goes a long way."}
                  </h1>
                  <p>
                    Make sense of the sounds around you, with a little human
                    help.
                  </p>
                </div>
                <div className="role-toggle" aria-label="Choose your role">
                  <button
                    className={role === "requester" ? "active" : ""}
                    aria-pressed={role === "requester"}
                    onClick={() => setRole("requester")}
                  >
                    I need a hand
                  </button>
                  <button
                    className={role === "volunteer" ? "active" : ""}
                    aria-pressed={role === "volunteer"}
                    onClick={() => setRole("volunteer")}
                  >
                    I can help
                  </button>
                </div>
              </div>
              {invite && (
                <div className="invite-banner">
                  <Link2 size={22} />
                  <div>
                    <strong>You’ve been invited to be someone’s ears.</strong>
                    <span>
                      Check your devices, then join their private call.
                    </span>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => {
                      setRole("volunteer");
                      setPreflight(true);
                    }}
                  >
                    Join invitation <ArrowRight size={17} />
                  </button>
                </div>
              )}
              <section
                className={`hero-card ${role === "volunteer" ? "volunteer-hero" : ""}`}
              >
                <div className="hero-copy">
                  <div className="hero-label">
                    <span className="mini-wave">∿</span>{" "}
                    {role === "requester"
                      ? "YOUR WORLD, A LITTLE CLEARER"
                      : "YOUR TIME, A LITTLE KINDER"}
                  </div>
                  <h2>
                    {role === "requester" ? (
                      <>
                        A little sound.
                        <br />A lot of <em>connection.</em>
                      </>
                    ) : (
                      <>
                        Lend your ears.
                        <br />
                        Make a <em>difference.</em>
                      </>
                    )}
                  </h2>
                  <p>
                    {role === "requester"
                      ? "A doorbell. An announcement. A curious little noise. Connect with a volunteer who can listen and put it into words."
                      : "You don’t need a special skill to be someone’s ears. A few minutes and a little kindness can make an everyday moment easier."}
                  </p>
                  <button
                    className="button dark hero-cta"
                    onClick={() => setPreflight(true)}
                  >
                    {role === "requester" ? (
                      <Headphones size={21} />
                    ) : (
                      <HeartHandshake size={21} />
                    )}{" "}
                    {role === "requester"
                      ? "Find a volunteer"
                      : "Be someone’s ears"}
                    <ArrowRight size={19} />
                  </button>
                  <div className="hero-reassurance">
                    <span>
                      <Check size={14} /> Free to connect
                    </span>
                    <span>
                      <Check size={14} /> No account needed
                    </span>
                  </div>
                </div>
                <div className="hero-visual">
                  <BridgeArt />
                  <div className="art-caption">
                    <span className="little-star">✳</span> SOMETIMES,
                    UNDERSTANDING STARTS WITH A PERSON.
                  </div>
                </div>
              </section>
              <section className="quick-start-row">
                <button className="demo-card" onClick={startDemo}>
                  <div className="demo-card-icon">
                    <Play size={21} fill="currentColor" />
                  </div>
                  <div>
                    <span className="eyebrow">CURIOUS? TAKE A LOOK.</span>
                    <h3>Feel the connection.</h3>
                    <p>Try a guided demo. No devices needed.</p>
                  </div>
                  <span className="demo-duration">
                    ~60 sec <ArrowRight size={19} />
                  </span>
                </button>
                <div className="privacy-card">
                  <span className="privacy-icon">
                    <ShieldCheck size={27} strokeWidth={1.5} />
                  </span>
                  <div>
                    <h3>Your comfort comes first.</h3>
                    <p>
                      You choose what to share.
                      <br />
                      No recordings. Leave anytime.
                    </p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Learn about privacy"
                    onClick={() => navigate("about")}
                  >
                    <ArrowRight size={19} />
                  </button>
                </div>
              </section>
              <section className="how-section">
                <div className="section-heading">
                  <h2>Just a few moments, together.</h2>
                  <button
                    className="text-button"
                    onClick={() => navigate("about")}
                  >
                    How it works <ArrowRight size={15} />
                  </button>
                </div>
                <div className="steps-grid">
                  <div className="step">
                    <span className="step-number">01</span>
                    <div className="step-icon peach">
                      <Video size={22} />
                    </div>
                    <h3>Share your surroundings</h3>
                    <p>
                      Point your camera toward a sound, or explain what you
                      need.
                    </p>
                  </div>
                  <div className="step">
                    <span className="step-number">02</span>
                    <div className="step-icon sage">
                      <Ear size={24} />
                    </div>
                    <h3>Meet a listening ear</h3>
                    <p>
                      A community volunteer joins you for a short, friendly
                      call.
                    </p>
                  </div>
                  <div className="step">
                    <span className="step-number">03</span>
                    <div className="step-icon butter">
                      <MessageCircle size={23} />
                    </div>
                    <h3>See the sound in words</h3>
                    <p>
                      Read clear descriptions in real time. Ask questions your
                      way.
                    </p>
                  </div>
                </div>
              </section>
              <div className="home-bottom">
                <p>
                  <span>✳</span> More than a sound. A moment of independence.
                </p>
                <span>BUILT WITH CARE · SASEHACKS FOR GOOD</span>
              </div>
            </>
          )}
          {screen === "waiting" && (
            <section className="waiting-page">
              <span className="eyebrow">
                {inviteLink
                  ? "A PERSONAL INVITATION"
                  : "GOOD THINGS START WITH A CONNECTION"}
              </span>
              <div className="waiting-orbit">
                <span className="orbit one" />
                <span className="orbit two" />
                <span className="waiting-center">
                  <Headphones size={44} strokeWidth={1.4} />
                </span>
                <i className="orbit-person">☺</i>
                <i className="orbit-heart">
                  <Heart size={21} />
                </i>
              </div>
              <h1>
                {inviteLink
                  ? "Your invitation is ready."
                  : role === "requester"
                    ? "Finding a listening ear."
                    : "Someone will be glad you’re here."}
              </h1>
              <p>
                {inviteLink
                  ? "Share the link with a person you trust. They’ll join as your volunteer."
                  : role === "requester"
                    ? "We’re looking for an available volunteer. Your camera and microphone aren’t shared until you’re connected."
                    : "You’re available to help. We’ll connect you when someone requests a listening ear."}
              </p>
              <span className="waiting-time">
                <span className="status-dot" />
                {inviteLink
                  ? "Waiting for your invited volunteer"
                  : `Waiting · ${durationText(waitingTime)}`}
              </span>
              {waitingError && (
                <div className="notice" role="alert">
                  {waitingError}
                </div>
              )}
              {waitingTime > 15 && !inviteLink && (
                <div className="waiting-explanation">
                  <strong>A small community is growing.</strong>
                  <p>
                    There may not be anyone available yet. For a real demo, open
                    this app on a second device and choose the other role.
                  </p>
                </div>
              )}
              {inviteLink ? (
                <div className="invite-share">
                  {qr && (
                    <img
                      src={qr}
                      alt="QR code for the private volunteer invitation"
                      width="160"
                      height="160"
                    />
                  )}
                  <div>
                    <label htmlFor="invite-url">Private invitation link</label>
                    <input
                      id="invite-url"
                      readOnly
                      value={inviteLink}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button className="button dark" onClick={() => void copy()}>
                      {copied ? <CheckCheck size={17} /> : <Copy size={17} />}{" "}
                      {copied ? "Copied!" : "Copy invitation"}
                    </button>
                    <p>
                      Anyone with the link can join. It expires after 30
                      minutes.
                    </p>
                  </div>
                </div>
              ) : (
                role === "requester" && (
                  <button
                    className="button secondary"
                    disabled={inviteBusy}
                    onClick={() => void makeInvite()}
                  >
                    <Link2 size={18} />
                    {inviteBusy
                      ? "Creating invitation…"
                      : "Invite someone you know"}
                  </button>
                )
              )}
              <button
                className="text-button cancel-waiting"
                onClick={() => void cancelWaiting()}
              >
                <ArrowLeft size={17} /> Cancel and go back
              </button>
              <div className="waiting-facts">
                <span>
                  <ShieldCheck size={17} /> Your devices stay under your control
                </span>
                <span>
                  <Type size={17} /> Text is always available
                </span>
              </div>
            </section>
          )}
          {screen === "summary" && summary && (
            <section className="summary-page">
              <div className="summary-symbol">
                <HeartHandshake size={48} strokeWidth={1.25} />
                <span>✳</span>
              </div>
              <span className="eyebrow">
                A SMALL MOMENT. A REAL CONNECTION.
              </span>
              <h1>
                {role === "requester"
                  ? "A little more clarity."
                  : "You showed up. That matters."}
              </h1>
              <p>
                {summary.reason ||
                  (summary.item.demo
                    ? "You’ve experienced a little of what SoundBridge can do. Ready for a real connection?"
                    : role === "requester"
                      ? `Thanks for sharing a moment with ${summary.item.peer}. We hope your world feels a little clearer.`
                      : "A few minutes of your time helped someone understand their world.")}
              </p>
              <div className="summary-details">
                <span>
                  <Clock3 size={19} />
                  <strong>{durationText(summary.item.duration)}</strong>{" "}
                  together
                </span>
                <span>
                  <Users size={19} />
                  <strong>{summary.item.peer}</strong>
                  {summary.item.demo
                    ? "simulated volunteer"
                    : "community connection"}
                </span>
                <span>
                  <ShieldCheck size={19} />
                  <strong>No recording</strong>your moment stays yours
                </span>
              </div>
              <div className="feedback-card">
                <h3>Was this moment helpful?</h3>
                <p>Your answer stays on this device.</p>
                <div>
                  <button
                    className={summary.item.helpful === true ? "selected" : ""}
                    aria-pressed={summary.item.helpful === true}
                    onClick={() => rate(true)}
                  >
                    <ThumbsUp size={20} /> Yes, it helped
                  </button>
                  <button
                    className={summary.item.helpful === false ? "selected" : ""}
                    aria-pressed={summary.item.helpful === false}
                    onClick={() => rate(false)}
                  >
                    <ThumbsDown size={20} /> Could be better
                  </button>
                </div>
                {summary.item.helpful !== null && (
                  <span className="feedback-thanks">
                    <Check size={15} /> Thanks for letting us know.
                  </span>
                )}
              </div>
              <div className="summary-actions">
                <button
                  className="button dark"
                  onClick={() => {
                    setDemo(false);
                    navigate("home");
                  }}
                >
                  Back to your day <ArrowRight size={18} />
                </button>
                <button className="button secondary" onClick={exportSummary}>
                  <ArrowDownToLine size={18} /> Save conversation
                </button>
              </div>
              <p className="summary-note">
                {summary.item.demo
                  ? "Practice demo · no real person was connected."
                  : "Call text is cleared from the server when the call ends."}{" "}
                Save a copy now if you’d like to keep it.
              </p>
            </section>
          )}
          {screen === "history" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">LITTLE MOMENTS THAT MATTER</span>
                  <h1>Your moments.</h1>
                  <p>A small reminder of the connections you’ve made.</p>
                </div>
              </div>
              {history.length ? (
                <>
                  <div className="history-stats">
                    <div>
                      <span>{history.filter((i) => !i.demo).length}</span>
                      <p>real connections</p>
                    </div>
                    <div>
                      <span>
                        {Math.floor(
                          history
                            .filter((i) => !i.demo)
                            .reduce((s, i) => s + i.duration, 0) / 60,
                        )}
                      </span>
                      <p>minutes together</p>
                    </div>
                    <div>
                      <span>
                        {history.filter((i) => i.helpful === true).length}
                      </span>
                      <p>helpful moments</p>
                    </div>
                  </div>
                  <div className="history-list">
                    {history.map((i) => (
                      <article key={i.id} className="history-item">
                        <span
                          className={`history-icon ${i.demo ? "practice" : ""}`}
                        >
                          {i.demo ? (
                            <Sparkles size={23} />
                          ) : (
                            <Headphones size={23} />
                          )}
                        </span>
                        <div>
                          <h3>{i.context}</h3>
                          <p>
                            {i.demo ? "Practice with " : "Connected with "}
                            {i.peer} ·{" "}
                            {new Date(i.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            · {durationText(i.duration)}
                          </p>
                        </div>
                        <span className="history-tag">
                          {i.demo
                            ? "Practice"
                            : i.helpful
                              ? "Helpful"
                              : "Connected"}
                        </span>
                      </article>
                    ))}
                  </div>
                  <p className="storage-note">
                    <ShieldCheck size={16} /> Stored only in this browser.
                    Conversation text is not saved to history.
                  </p>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-illustration">
                    <History size={47} strokeWidth={1.2} />
                    <span>✳</span>
                  </div>
                  <h2>Your first moment is waiting.</h2>
                  <p>
                    Connect with a volunteer or try a practice conversation.
                    <br />
                    Your connections will appear here.
                  </p>
                  <button
                    className="button dark"
                    onClick={() => navigate("home")}
                  >
                    Make a connection <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
          {screen === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">MAKE YOURSELF AT HOME</span>
                  <h1>Your comfort. Your way.</h1>
                  <p>
                    A few little things to make SoundBridge work better for you.
                  </p>
                </div>
              </div>
              <div className="settings-grid">
                <section className="settings-card">
                  <div className="settings-heading">
                    <Type size={23} />
                    <h2>Reading & display</h2>
                  </div>
                  <label>Conversation text size</label>
                  <div className="text-size-options">
                    {(["standard", "large", "extra"] as const).map((size) => (
                      <button
                        key={size}
                        className={settings.size === size ? "selected" : ""}
                        onClick={() => setSettings({ ...settings, size })}
                        aria-pressed={settings.size === size}
                      >
                        <span
                          style={{
                            fontSize:
                              size === "standard"
                                ? 19
                                : size === "large"
                                  ? 24
                                  : 29,
                          }}
                        >
                          Aa
                        </span>
                        {size === "extra"
                          ? "Extra large"
                          : size[0].toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className={`text-preview text-${settings.size}`}>
                    <span>SOUND DESCRIPTION PREVIEW</span>
                    <p>
                      That’s your kettle.
                      <br />
                      Your tea is ready.
                    </p>
                  </div>
                  <label className="switch-row">
                    <span>
                      <strong>Higher contrast</strong>
                      <small>Darker text and stronger borders.</small>
                    </span>
                    <input
                      type="checkbox"
                      className="switch"
                      checked={settings.contrast}
                      onChange={(e) =>
                        setSettings({ ...settings, contrast: e.target.checked })
                      }
                    />
                  </label>
                  <label className="switch-row">
                    <span>
                      <strong>Vibration for attention</strong>
                      <small>Available on supported phones.</small>
                    </span>
                    <input
                      type="checkbox"
                      className="switch"
                      checked={settings.vibration}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          vibration: e.target.checked,
                        })
                      }
                    />
                  </label>
                </section>
                <div>
                  <section className="settings-card">
                    <div className="settings-heading">
                      <Users size={23} />
                      <h2>A little about you</h2>
                    </div>
                    <label htmlFor="settings-name">Your display name</label>
                    <input
                      id="settings-name"
                      placeholder="First name or nickname"
                      value={settings.name}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          name: e.target.value.slice(0, 40),
                        })
                      }
                    />
                    <p className="field-hint">
                      Saved on this device. Shared with your partner when you
                      connect.
                    </p>
                    <div className="saved-indicator">
                      <CheckCircle2 size={16} /> Preferences save automatically
                    </div>
                  </section>
                  <section className="settings-card privacy-settings">
                    <div className="settings-heading">
                      <ShieldCheck size={23} />
                      <h2>Your data, in your hands</h2>
                    </div>
                    <p>
                      Your moments and preferences stay in this browser. Call
                      media is never recorded. Call messages are removed from
                      the server at the end of a call, or expire after 30
                      minutes.
                    </p>
                    {clearConfirm ? (
                      <div className="clear-confirm">
                        <p>Clear your local history? This can’t be undone.</p>
                        <button
                          className="text-button danger-text"
                          onClick={() => {
                            setHistory([]);
                            setClearConfirm(false);
                            setToast("Local history cleared.");
                          }}
                        >
                          Yes, clear history
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setClearConfirm(false)}
                        >
                          Keep it
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-button danger-text"
                        onClick={() => setClearConfirm(true)}
                      >
                        Clear moments on this device
                      </button>
                    )}
                  </section>
                </div>
              </div>
            </>
          )}
          {screen === "about" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    A SIMPLE IDEA. A MORE CONNECTED WORLD.
                  </span>
                  <h1>Everyone deserves the context.</h1>
                  <p>
                    Sometimes a little human help can open up an everyday
                    moment.
                  </p>
                </div>
              </div>
              <section className="about-hero">
                <div>
                  <span className="mini-wave">∿</span>
                  <h2>
                    The world makes sound.
                    <br />
                    We make <em>connection.</em>
                  </h2>
                  <p>
                    SoundBridge connects Deaf and hard-of-hearing people with
                    community volunteers who describe everyday sounds through
                    video and text. The person asking for help leads the
                    conversation.
                  </p>
                </div>
                <BridgeArt />
              </section>
              <div className="about-grid">
                <section className="settings-card">
                  <h2>A few minutes. Three simple steps.</h2>
                  <ol className="about-steps">
                    <li>
                      <strong>Choose your role.</strong> Ask for sound help or
                      volunteer your ears. A nickname is all you need.
                    </li>
                    <li>
                      <strong>Check your devices.</strong> Choose whether to
                      share video and audio. Get matched randomly, or invite
                      someone you trust.
                    </li>
                    <li>
                      <strong>Connect in your own way.</strong> Read or type.
                      Volunteers can dictate a draft, review it, and send it as
                      text. Use the attention button for a visible cue.
                    </li>
                  </ol>
                </section>
                <section className="settings-card">
                  <h2>Built around your comfort.</h2>
                  <p>
                    Calls are not recorded. Only the two participants can access
                    a call’s text and connection information. Text is cleared
                    when either person ends the call. Disconnected call data
                    expires after 30 minutes and is removed during cleanup.
                  </p>
                  <p>
                    Voice typing depends on your browser and may use its speech
                    service. Always review the draft before sending. Your
                    microphone won’t start until you turn on a feature that
                    needs it.
                  </p>
                  <p>
                    Report & leave ends a call and stores your report for
                    review. This is a hackathon prototype: volunteers are not
                    verified, and there is no staffed moderation or emergency
                    response.
                  </p>
                </section>
                <section className="settings-card">
                  <h2>Little sounds. Many possibilities.</h2>
                  <div className="use-case">
                    <Home size={20} />
                    <div>
                      <strong>At home</strong>
                      <p>A doorbell, a kettle, a new appliance sound.</p>
                    </div>
                  </div>
                  <div className="use-case">
                    <Radio size={20} />
                    <div>
                      <strong>Out in the world</strong>
                      <p>
                        An announcement at a station or a name called at a café.
                      </p>
                    </div>
                  </div>
                  <div className="use-case">
                    <Users size={20} />
                    <div>
                      <strong>Across a community</strong>
                      <p>
                        Student volunteers, accessibility offices, libraries,
                        and neighbors showing up for one another.
                      </p>
                    </div>
                  </div>
                </section>
                <section className="settings-card about-cta">
                  <HeartHandshake size={36} strokeWidth={1.5} />
                  <h2>Good doesn’t have to be grand.</h2>
                  <p>
                    Sometimes it’s just being there for a minute. Free for the
                    person asking. Powered by people who care.
                  </p>
                  <button
                    className="button dark"
                    onClick={() => {
                      setRole("volunteer");
                      navigate("home");
                    }}
                  >
                    Be someone’s ears <ArrowRight size={17} />
                  </button>
                  <span>MADE FOR SASEHACKS FOR GOOD</span>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
      {screen !== "waiting" && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {[
            { id: "home", icon: Home, label: "Connect" },
            { id: "history", icon: History, label: "Moments" },
            { id: "settings", icon: Settings2, label: "Preferences" },
            { id: "about", icon: CircleHelp, label: "Our idea" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              className={screen === id ? "active" : ""}
              aria-current={screen === id ? "page" : undefined}
              key={id}
              onClick={() => navigate(id as Screen)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
      {preflight && (
        <Preflight
          role={role}
          settings={settings}
          invite={invite}
          onClose={() => setPreflight(false)}
          onStart={start}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </div>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 18 18 6M6 6h12v12" />
    </svg>
  );
}
