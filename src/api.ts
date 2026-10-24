import type { Session, Room, WireEvent } from "./types";
import { endpoint, publishableKey } from "./config";

export async function api<T = Record<string, unknown>>(
  action: string,
  session?: Session | null,
  data: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: publishableKey },
    body: JSON.stringify({
      action,
      sessionId: session?.id,
      token: session?.token,
      ...data,
    }),
    signal: AbortSignal.timeout(18000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Could not connect. Please try again.");
  return result as T;
}

export const createSession = (name: string, role: string) =>
  api<Session>("session", null, { name, role });
export const match = (session: Session, context: string) =>
  api<{ room: Room | null }>("match", session, { context });
export const poll = (session: Session, roomId: string, after: number) =>
  api<{ room: Room; events: WireEvent[] }>("poll", session, { roomId, after });
export const sendEvent = (
  session: Session,
  roomId: string,
  kind: string,
  payload: Record<string, unknown>,
) => api("event", session, { roomId, kind, payload });
