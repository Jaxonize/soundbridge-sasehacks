export const defaultIceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export function createPeer(
  stream: MediaStream | null,
  onSignal: (kind: string, payload: Record<string, unknown>) => void,
  onRemote: (stream: MediaStream) => void,
  onState: (state: RTCPeerConnectionState) => void,
) {
  const configured = import.meta.env.VITE_ICE_SERVERS;
  let iceServers = defaultIceServers;
  try {
    if (configured) iceServers = JSON.parse(configured);
  } catch {
    /* Use STUN if optional configuration is invalid. */
  }
  const pc = new RTCPeerConnection({ iceServers });
  if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  else {
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });
  }
  pc.onicecandidate = (event) => {
    if (event.candidate)
      onSignal("ice", event.candidate.toJSON() as Record<string, unknown>);
  };
  pc.ontrack = (event) =>
    onRemote(event.streams[0] || new MediaStream([event.track]));
  pc.onconnectionstatechange = () => onState(pc.connectionState);
  return pc;
}
