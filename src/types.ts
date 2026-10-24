export type Role = "requester" | "volunteer";
export type Session = { id: string; token: string; name: string; role: Role };
export type Peer = { id: string; name: string; role: Role };
export type Room = {
  id: string;
  state: "active" | "ended";
  context: string;
  peer: Peer | null;
};
export type WireEvent = {
  id: number;
  sender_id: string;
  kind: string;
  payload: Record<string, unknown>;
};
export type Message = {
  id: string;
  text: string;
  from: "you" | "peer" | "system";
  time: number;
  speech?: boolean;
};
export type HistoryItem = {
  id: string;
  date: number;
  duration: number;
  peer: string;
  context: string;
  demo: boolean;
  helpful: boolean | null;
};
export type Settings = {
  size: "standard" | "large" | "extra";
  contrast: boolean;
  vibration: boolean;
  name: string;
};
