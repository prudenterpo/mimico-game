export const SIGNAL_PAYLOAD_MAX = 20000;

export const DEFAULT_STUN_URL = "stun:stun.l.google.com:19302";

export type SignalKind = "OFFER" | "ANSWER" | "CANDIDATE" | "JOIN" | "LEAVE";

export type LocalMediaPhase = "idle" | "requesting" | "live" | "permission-denied" | "failed";

export type PeerLinkState = "connecting" | "connected" | "failed";

const SIGNAL_KINDS = new Set<SignalKind>(["OFFER", "ANSWER", "CANDIDATE", "JOIN", "LEAVE"]);

export interface CapturedTrack {
    kind: string;
    enabled: boolean;
    readyState: string;
    stop(): void;
    addEventListener(type: "ended", listener: () => void): void;
    removeEventListener(type: "ended", listener: () => void): void;
}

export interface CapturedStream {
    getTracks(): CapturedTrack[];
    getAudioTracks(): CapturedTrack[];
    getVideoTracks(): CapturedTrack[];
}

export interface RemoteMedia {
    userId: string;
    stream: CapturedStream | null;
    link: PeerLinkState;
}

export interface MediaSessionSnapshot {
    phase: LocalMediaPhase;
    localStream: CapturedStream | null;
    cameraOn: boolean;
    muted: boolean;
    remotes: RemoteMedia[];
}

export interface MediaTransport {
    publish(destination: string, body?: Record<string, unknown>): void;
    subscribe(destination: string, callback: (message: unknown) => void): void;
    unsubscribe(destination: string): void;
    isConnected?(): boolean;
}

export interface SessionPeer {
    iceConnectionState: string;
    onicecandidate: ((event: { candidate: { toJSON?: () => RTCIceCandidateInit } | null }) => void) | null;
    ontrack: ((event: { streams: CapturedStream[] }) => void) | null;
    oniceconnectionstatechange: (() => void) | null;
    addTrack(track: CapturedTrack, stream: CapturedStream): void;
    createOffer(): Promise<RTCSessionDescriptionInit>;
    createAnswer(): Promise<RTCSessionDescriptionInit>;
    setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
    setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
    addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
    close(): void;
}

export interface MediaSessionOptions {
    matchId: string;
    localUserId: string;
    remoteUserIds: string[];
    transport: MediaTransport;
    getUserMedia?: (constraints: MediaStreamConstraints) => Promise<CapturedStream>;
    createPeer?: (config: RTCConfiguration) => SessionPeer;
    stunUrls?: string[];
    onChange?: (snapshot: MediaSessionSnapshot) => void;
}

export interface IncomingMediaSignal {
    fromUserId: string;
    kind: SignalKind;
    payload: string | null;
}

export function readStunUrls(raw: string | undefined = process.env.NEXT_PUBLIC_STUN_URLS): string[] {
    const urls = (raw ?? "")
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean);
    return urls.length > 0 ? urls : [DEFAULT_STUN_URL];
}

export function readMediaSignal(message: unknown): IncomingMediaSignal | null {
    if (!message || typeof message !== "object") return null;
    const envelope = message as { type?: unknown; data?: unknown };
    if (envelope.type !== "MEDIA_SIGNAL" || !envelope.data || typeof envelope.data !== "object") return null;
    const data = envelope.data as { fromUserId?: unknown; kind?: unknown; payload?: unknown };
    if (typeof data.fromUserId !== "string" || !SIGNAL_KINDS.has(data.kind as SignalKind)) return null;
    const payload = typeof data.payload === "string" ? data.payload : null;
    return { fromUserId: data.fromUserId, kind: data.kind as SignalKind, payload };
}

function isPermissionDenied(error: unknown): boolean {
    if (!error || typeof error !== "object" || !("name" in error)) return false;
    const name = String((error as { name: unknown }).name);
    return name === "NotAllowedError" || name === "PermissionDeniedError";
}

function defaultGetUserMedia(constraints: MediaStreamConstraints): Promise<CapturedStream> {
    const devices = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!devices?.getUserMedia) {
        const error = new Error("Camera is unavailable");
        error.name = "NotAllowedError";
        return Promise.reject(error);
    }
    return devices.getUserMedia(constraints);
}

function defaultCreatePeer(config: RTCConfiguration): SessionPeer {
    if (typeof RTCPeerConnection === "undefined") {
        throw new Error("RTCPeerConnection is unavailable");
    }
    return new RTCPeerConnection(config) as unknown as SessionPeer;
}

function stopStream(stream: CapturedStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
}

export class MatchMediaSession {
    private readonly peers = new Map<string, SessionPeer>();
    private readonly pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
    private readonly offered = new Set<string>();
    private readonly announced = new Set<string>();
    private readonly remoteReady = new Set<string>();
    private readonly remoteStreams = new Map<string, CapturedStream>();
    private readonly links = new Map<string, PeerLinkState>();
    private remoteUserIds: string[];
    private localStream: CapturedStream | null = null;
    private phase: LocalMediaPhase = "idle";
    private cameraOn = true;
    private muted = false;
    private stopped = false;
    private signalingReady = false;
    private starting: Promise<void> | null = null;
    private chain: Promise<void> = Promise.resolve();
    private readonly endedListener = () => {
        if (this.stopped) return;
        this.phase = "failed";
        this.emit();
    };

    constructor(private readonly options: MediaSessionOptions) {
        this.remoteUserIds = uniqueRemotes(options.remoteUserIds, options.localUserId);
    }

    isStopped() {
        return this.stopped;
    }

    setRemoteUserIds(remoteUserIds: string[]) {
        this.remoteUserIds = uniqueRemotes(remoteUserIds, this.options.localUserId);
        if (this.signalingReady) this.announce();
    }

    start(): Promise<void> {
        if (this.stopped) return Promise.resolve();
        if (this.phase === "live") {
            this.ensureSignaling();
            return Promise.resolve();
        }
        if (this.phase === "permission-denied" || this.phase === "failed") return Promise.resolve();
        if (this.starting) return this.starting;
        this.starting = this.capture().then((ready) => {
            this.starting = null;
            if (ready) this.ensureSignaling();
        });
        return this.starting;
    }

    async retry() {
        this.stopped = true;
        this.unwatchTracks();
        stopStream(this.localStream);
        this.localStream = null;
        this.transport.unsubscribe(this.queue());
        this.signalingReady = false;
        this.offered.clear();
        this.announced.clear();
        this.closePeers();
        this.phase = "idle";
        this.cameraOn = true;
        this.stopped = false;
        await this.start();
    }

    stop() {
        if (this.stopped) return;
        this.stopped = true;
        for (const remoteId of this.announced) this.send(remoteId, "LEAVE");
        this.transport.unsubscribe(this.queue());
        this.signalingReady = false;
        this.closePeers();
        this.unwatchTracks();
        stopStream(this.localStream);
        this.localStream = null;
        this.phase = "idle";
        this.emit();
    }

    setMuted(muted: boolean) {
        this.muted = muted;
        this.localStream?.getAudioTracks().forEach((track) => {
            track.enabled = !muted;
        });
        this.emit();
    }

    setCameraOn(cameraOn: boolean) {
        this.cameraOn = cameraOn;
        this.localStream?.getVideoTracks().forEach((track) => {
            track.enabled = cameraOn;
        });
        this.emit();
    }

    whenSettled() {
        return this.chain;
    }

    private get transport() {
        return this.options.transport;
    }

    private queue() {
        return `/user/queue/match/${this.options.matchId}/signal`;
    }

    private async capture() {
        this.phase = "requesting";
        this.emit();
        try {
            const getUserMedia = this.options.getUserMedia ?? defaultGetUserMedia;
            const stream = await getUserMedia({ audio: true, video: true });
            if (this.stopped) {
                stopStream(stream);
                return false;
            }
            this.localStream = stream;
            this.applyTrackEnabled();
            this.watchTracks();
            this.phase = "live";
            this.emit();
            return true;
        } catch (error) {
            if (this.stopped) return false;
            this.phase = isPermissionDenied(error) ? "permission-denied" : "failed";
            this.emit();
            return false;
        }
    }

    private ensureSignaling() {
        if (this.stopped || this.phase !== "live") return;
        if (this.transport.isConnected && !this.transport.isConnected()) return;
        if (!this.signalingReady) {
            this.transport.subscribe(this.queue(), (message) => {
                this.track(() => this.handleSignal(message));
            });
            this.signalingReady = true;
        }
        this.announce();
    }

    private announce() {
        for (const remoteId of this.remoteUserIds) {
            if (this.announced.has(remoteId)) continue;
            this.announced.add(remoteId);
            this.ensurePeer(remoteId);
            this.send(remoteId, "JOIN");
        }
        for (const remoteId of [...this.announced]) {
            if (this.remoteUserIds.includes(remoteId)) continue;
            this.announced.delete(remoteId);
            this.offered.delete(remoteId);
            this.remoteReady.delete(remoteId);
            this.send(remoteId, "LEAVE");
            this.dropPeer(remoteId);
        }
    }

    private ensurePeer(remoteId: string) {
        if (remoteId === this.options.localUserId || this.peers.has(remoteId)) return;
        const createPeer = this.options.createPeer ?? defaultCreatePeer;
        const peer = createPeer({ iceServers: [{ urls: this.options.stunUrls ?? readStunUrls() }] });
        this.localStream?.getTracks().forEach((track) => peer.addTrack(track, this.localStream as CapturedStream));
        peer.onicecandidate = (event) => {
            if (!event.candidate) return;
            const body = typeof event.candidate.toJSON === "function" ? event.candidate.toJSON() : event.candidate;
            this.send(remoteId, "CANDIDATE", JSON.stringify(body));
        };
        peer.ontrack = (event) => {
            const stream = event.streams[0] ?? null;
            if (!stream) return;
            this.remoteStreams.set(remoteId, stream);
            this.emit();
        };
        peer.oniceconnectionstatechange = () => {
            this.links.set(remoteId, linkFromIce(peer.iceConnectionState));
            this.emit();
        };
        this.peers.set(remoteId, peer);
        this.links.set(remoteId, "connecting");
    }

    private async handleSignal(message: unknown) {
        if (this.stopped) return;
        const signal = readMediaSignal(message);
        if (!signal || signal.fromUserId === this.options.localUserId) return;
        if (!this.remoteUserIds.includes(signal.fromUserId)) return;

        if (signal.kind === "JOIN") {
            this.ensurePeer(signal.fromUserId);
            await this.maybeOffer(signal.fromUserId);
            return;
        }
        if (signal.kind === "LEAVE") {
            this.announced.delete(signal.fromUserId);
            this.offered.delete(signal.fromUserId);
            this.remoteReady.delete(signal.fromUserId);
            this.dropPeer(signal.fromUserId);
            return;
        }

        const peer = this.peers.get(signal.fromUserId);
        if (!peer || !signal.payload) return;
        try {
            if (signal.kind === "OFFER") {
                if (this.shouldOffer(signal.fromUserId)) return;
                await peer.setRemoteDescription(parseDescription(signal.payload));
                this.remoteReady.add(signal.fromUserId);
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                this.send(signal.fromUserId, "ANSWER", serializeDescription(answer));
                await this.flushCandidates(signal.fromUserId);
                return;
            }
            if (signal.kind === "ANSWER") {
                await peer.setRemoteDescription(parseDescription(signal.payload));
                this.remoteReady.add(signal.fromUserId);
                await this.flushCandidates(signal.fromUserId);
                return;
            }
            if (signal.kind === "CANDIDATE") {
                const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
                if (!this.remoteReady.has(signal.fromUserId)) {
                    const queued = this.pendingCandidates.get(signal.fromUserId) ?? [];
                    queued.push(candidate);
                    this.pendingCandidates.set(signal.fromUserId, queued);
                    return;
                }
                await peer.addIceCandidate(candidate);
            }
        } catch {
            this.links.set(signal.fromUserId, "failed");
            this.emit();
        }
    }

    private async maybeOffer(remoteId: string) {
        if (!this.shouldOffer(remoteId) || this.offered.has(remoteId)) return;
        const peer = this.peers.get(remoteId);
        if (!peer) return;
        this.offered.add(remoteId);
        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            this.send(remoteId, "OFFER", serializeDescription(offer));
        } catch {
            this.offered.delete(remoteId);
            this.links.set(remoteId, "failed");
            this.emit();
        }
    }

    private async flushCandidates(remoteId: string) {
        const peer = this.peers.get(remoteId);
        const queued = this.pendingCandidates.get(remoteId) ?? [];
        this.pendingCandidates.delete(remoteId);
        if (!peer) return;
        for (const candidate of queued) {
            await peer.addIceCandidate(candidate);
        }
    }

    private shouldOffer(remoteId: string) {
        return this.options.localUserId < remoteId;
    }

    private send(remoteId: string, kind: SignalKind, payload?: string) {
        if (this.transport.isConnected && !this.transport.isConnected()) return;
        if (payload && payload.length > SIGNAL_PAYLOAD_MAX) {
            this.links.set(remoteId, "failed");
            this.emit();
            return;
        }
        const body: Record<string, string> = { toUserId: remoteId, kind };
        if (payload) body.payload = payload;
        this.transport.publish(`/app/match/${this.options.matchId}/signal`, body);
    }

    private dropPeer(remoteId: string) {
        const peer = this.peers.get(remoteId);
        this.peers.delete(remoteId);
        this.pendingCandidates.delete(remoteId);
        this.remoteStreams.delete(remoteId);
        this.remoteReady.delete(remoteId);
        this.links.delete(remoteId);
        peer?.close();
        this.emit();
    }

    private closePeers() {
        for (const peer of this.peers.values()) peer.close();
        this.peers.clear();
        this.pendingCandidates.clear();
        this.remoteStreams.clear();
        this.remoteReady.clear();
        this.links.clear();
    }

    private watchTracks() {
        this.localStream?.getVideoTracks().forEach((track) => {
            track.addEventListener("ended", this.endedListener);
        });
    }

    private unwatchTracks() {
        this.localStream?.getVideoTracks().forEach((track) => {
            track.removeEventListener("ended", this.endedListener);
        });
    }

    private applyTrackEnabled() {
        this.localStream?.getAudioTracks().forEach((track) => {
            track.enabled = !this.muted;
        });
        this.localStream?.getVideoTracks().forEach((track) => {
            track.enabled = this.cameraOn;
        });
    }

    private track(work: () => Promise<void>) {
        this.chain = this.chain.then(work).catch(() => undefined);
    }

    private emit() {
        this.options.onChange?.({
            phase: this.phase,
            localStream: this.localStream,
            cameraOn: this.cameraOn,
            muted: this.muted,
            remotes: this.remoteUserIds.map((userId) => ({
                userId,
                stream: this.remoteStreams.get(userId) ?? null,
                link: this.links.get(userId) ?? "connecting",
            })),
        });
    }
}

function uniqueRemotes(remoteUserIds: string[], localUserId: string) {
    return [...new Set(remoteUserIds.filter((userId) => userId && userId !== localUserId))];
}

function linkFromIce(state: string): PeerLinkState {
    if (state === "connected" || state === "completed") return "connected";
    if (state === "failed") return "failed";
    return "connecting";
}

function serializeDescription(description: RTCSessionDescriptionInit) {
    return JSON.stringify({ type: description.type, sdp: description.sdp ?? "" });
}

function parseDescription(payload: string): RTCSessionDescriptionInit {
    const parsed = JSON.parse(payload) as { type?: unknown; sdp?: unknown };
    if (typeof parsed.type !== "string" || typeof parsed.sdp !== "string") {
        throw new Error("invalid description");
    }
    return { type: parsed.type as RTCSdpType, sdp: parsed.sdp };
}
