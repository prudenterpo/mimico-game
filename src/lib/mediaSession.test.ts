import { afterEach, describe, expect, it, vi } from "vitest";
import {
    CapturedStream,
    CapturedTrack,
    MatchMediaSession,
    MediaTransport,
    readMediaSignal,
    readStunUrls,
    SessionPeer,
    SIGNAL_PAYLOAD_MAX,
} from "@/lib/mediaSession";

const secretSdp = "SDP-SECRET-do-not-log";

interface FakeTrack extends CapturedTrack {
    stopped: boolean;
    end(): void;
}

function createTrack(kind: "audio" | "video"): FakeTrack {
    const listeners = new Set<() => void>();
    return {
        kind,
        enabled: true,
        readyState: "live",
        stopped: false,
        stop() {
            this.stopped = true;
            this.readyState = "ended";
        },
        addEventListener(_type: "ended", listener: () => void) {
            listeners.add(listener);
        },
        removeEventListener(_type: "ended", listener: () => void) {
            listeners.delete(listener);
        },
        end() {
            this.readyState = "ended";
            listeners.forEach((listener) => listener());
        },
    };
}

function createStream() {
    const audio = createTrack("audio");
    const video = createTrack("video");
    const stream: CapturedStream = {
        getTracks: () => [audio, video],
        getAudioTracks: () => [audio],
        getVideoTracks: () => [video],
    };
    return { stream, audio, video };
}

class FakePeer implements SessionPeer {
    iceConnectionState = "new";
    onicecandidate: SessionPeer["onicecandidate"] = null;
    ontrack: SessionPeer["ontrack"] = null;
    oniceconnectionstatechange: (() => void) | null = null;
    closed = false;
    remote: RTCSessionDescriptionInit | null = null;
    readonly added: CapturedTrack[] = [];

    addTrack(track: CapturedTrack) {
        this.added.push(track);
    }

    async createOffer() {
        return { type: "offer" as const, sdp: secretSdp };
    }

    async createAnswer() {
        return { type: "answer" as const, sdp: secretSdp };
    }

    async setLocalDescription() {
        return undefined;
    }

    async setRemoteDescription(description: RTCSessionDescriptionInit) {
        this.remote = description;
        this.ontrack?.({ streams: [createStream().stream] });
        this.iceConnectionState = "connected";
        this.oniceconnectionstatechange?.();
    }

    async addIceCandidate() {
        return undefined;
    }

    close() {
        this.closed = true;
        this.iceConnectionState = "closed";
    }
}

function broker() {
    const handlers = new Map<string, (message: unknown) => void>();
    const delivered: { toUserId: string; fromUserId: string; kind: string; payload?: string }[] = [];

    function transport(matchId: string, localUserId: string): MediaTransport {
        return {
            publish(destination, body = {}) {
                if (!destination.endsWith("/signal")) return;
                const toUserId = String(body.toUserId);
                const kind = String(body.kind);
                const payload = typeof body.payload === "string" ? body.payload : undefined;
                delivered.push({ toUserId, fromUserId: localUserId, kind, payload });
                const message = {
                    type: "MEDIA_SIGNAL",
                    data: { matchId, fromUserId: localUserId, kind, payload: payload ?? null },
                    occurredAt: "2026-10-01T00:00:00Z",
                };
                handlers.get(toUserId)?.(message);
            },
            subscribe(_destination, callback) {
                handlers.set(localUserId, callback);
            },
            unsubscribe() {
                handlers.delete(localUserId);
            },
            isConnected: () => true,
        };
    }

    return { transport, delivered };
}

const ids = ["aaaa", "bbbb", "cccc", "dddd"];

async function settle(sessions: MatchMediaSession[]) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
        await Promise.all(sessions.map((session) => session.whenSettled()));
    }
}

describe("media signaling", () => {
    const sessions: MatchMediaSession[] = [];

    afterEach(() => {
        sessions.splice(0).forEach((session) => session.stop());
    });

    it("reads stun urls and ignores a shared-topic signal", () => {
        expect(readStunUrls(undefined)).toEqual(["stun:stun.l.google.com:19302"]);
        expect(readStunUrls(" stun:a:3478, stun:b:3478 ")).toEqual(["stun:a:3478", "stun:b:3478"]);
        expect(readMediaSignal({ type: "MATCH_STATE_UPDATED", data: { fromUserId: "a", kind: "OFFER" } })).toBeNull();
        expect(readMediaSignal({
            type: "MEDIA_SIGNAL",
            data: { fromUserId: "bbbb", kind: "OFFER", payload: "{}" },
        })).toEqual({ fromUserId: "bbbb", kind: "OFFER", payload: "{}" });
    });

    it("gives each of four players one local stream and three remote streams", async () => {
        const logs: string[] = [];
        const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
            logs.push(args.map(String).join(" "));
        });
        const info = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
            logs.push(args.map(String).join(" "));
        });
        const room = broker();
        const created: FakePeer[] = [];
        const snapshots = new Map<string, { local: boolean; remotes: number }>();

        try {
            for (const localUserId of ids) {
                const session = new MatchMediaSession({
                    matchId: "match-1",
                    localUserId,
                    remoteUserIds: ids,
                    transport: room.transport("match-1", localUserId),
                    stunUrls: ["stun:stun.l.google.com:19302"],
                    getUserMedia: async () => createStream().stream,
                    createPeer: () => {
                        const peer = new FakePeer();
                        created.push(peer);
                        return peer;
                    },
                    onChange: (snapshot) => {
                        snapshots.set(localUserId, {
                            local: Boolean(snapshot.localStream),
                            remotes: snapshot.remotes.filter((remote) => remote.stream && remote.link === "connected").length,
                        });
                    },
                });
                sessions.push(session);
            }

            await Promise.all(sessions.map((session) => session.start()));
            await settle(sessions);

            for (const localUserId of ids) {
                expect(snapshots.get(localUserId)).toEqual({ local: true, remotes: 3 });
            }
            expect(created).toHaveLength(12);
            const offers = room.delivered.filter((entry) => entry.kind === "OFFER");
            const joins = room.delivered.filter((entry) => entry.kind === "JOIN");
            expect(offers.length).toBeGreaterThan(0);
            expect(joins.length).toBeGreaterThan(0);
            expect(joins.every((entry) => entry.payload === undefined)).toBe(true);
            expect(offers.every((entry) => ids.includes(entry.toUserId) && entry.toUserId !== entry.fromUserId)).toBe(true);
            expect(logs.join("\n")).not.toContain(secretSdp);

            const first = sessions[0];
            const before = created.length;
            room.transport("match-1", "bbbb").publish(`/app/match/match-1/signal`, {
                toUserId: "aaaa",
                kind: "JOIN",
            });
            await settle(sessions);
            expect(created).toHaveLength(before);
            first.stop();
        } finally {
            spy.mockRestore();
            info.mockRestore();
        }
    });

    it("stops local tracks on leave and reports a failed camera without logging the payload", async () => {
        const room = broker();
        const { stream, audio, video } = createStream();
        let phase = "idle";
        const session = new MatchMediaSession({
            matchId: "match-1",
            localUserId: "aaaa",
            remoteUserIds: ["bbbb"],
            transport: room.transport("match-1", "aaaa"),
            getUserMedia: async () => stream,
            createPeer: () => new FakePeer(),
            onChange: (snapshot) => {
                phase = snapshot.phase;
            },
        });
        sessions.push(session);
        await session.start();
        video.end();
        expect(phase).toBe("failed");

        session.stop();
        expect(audio.stopped).toBe(true);
        expect(video.stopped).toBe(true);
        expect(room.delivered.some((entry) => entry.kind === "LEAVE" && entry.toUserId === "bbbb")).toBe(true);
        expect(room.delivered.some((entry) => entry.kind === "OFFER" && entry.payload && entry.payload.length > SIGNAL_PAYLOAD_MAX)).toBe(false);
    });

    it("records permission denial without opening a peer", async () => {
        const createPeer = vi.fn();
        let phase = "idle";
        const session = new MatchMediaSession({
            matchId: "match-1",
            localUserId: "aaaa",
            remoteUserIds: ["bbbb"],
            transport: broker().transport("match-1", "aaaa"),
            getUserMedia: async () => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })),
            createPeer,
            onChange: (snapshot) => {
                phase = snapshot.phase;
            },
        });
        sessions.push(session);
        await session.start();
        expect(phase).toBe("permission-denied");
        expect(createPeer).not.toHaveBeenCalled();
    });
});
