import { afterEach, describe, expect, it } from "vitest";
import { CapturedStream } from "@/lib/mediaSession";
import { resetMediaStore, useMediaStore } from "@/stores/mediaStore";

const matchId = "match-1";

function transport() {
    const published: { destination: string; body: Record<string, unknown> }[] = [];
    return {
        published,
        publish(destination: string, body: Record<string, unknown> = {}) {
            published.push({ destination, body });
        },
        subscribe() {
            return undefined;
        },
        unsubscribe() {
            return undefined;
        },
        isConnected: () => true,
    };
}

function stream(): CapturedStream {
    const tracks = [
        {
            kind: "video",
            enabled: true,
            readyState: "live",
            stop() { this.readyState = "ended"; },
            addEventListener() { return undefined; },
            removeEventListener() { return undefined; },
        },
        {
            kind: "audio",
            enabled: true,
            readyState: "live",
            stop() { this.readyState = "ended"; },
            addEventListener() { return undefined; },
            removeEventListener() { return undefined; },
        },
    ];
    return {
        getTracks: () => tracks,
        getVideoTracks: () => tracks.filter((track) => track.kind === "video"),
        getAudioTracks: () => tracks.filter((track) => track.kind === "audio"),
    };
}

describe("media store", () => {
    afterEach(() => {
        resetMediaStore();
    });

    it("tells the server once when the mime camera is denied and again when it returns", async () => {
        const link = transport();
        let allow = false;
        await useMediaStore.getState().join({
            matchId,
            localUserId: "aaaa",
            remoteUserIds: ["bbbb"],
            transport: link,
            getUserMedia: async () => {
                if (!allow) return Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
                return stream();
            },
            createPeer: () => ({
                iceConnectionState: "new",
                onicecandidate: null,
                ontrack: null,
                oniceconnectionstatechange: null,
                addTrack() { return undefined; },
                async createOffer() { return { type: "offer" as const, sdp: "offer" }; },
                async createAnswer() { return { type: "answer" as const, sdp: "answer" }; },
                async setLocalDescription() { return undefined; },
                async setRemoteDescription() { return undefined; },
                async addIceCandidate() { return undefined; },
                close() { return undefined; },
            }),
        });

        useMediaStore.getState().setMimeVideoRequired(true);
        useMediaStore.getState().setMimeVideoRequired(true);
        const mediaDestinations = () => link.published
            .map((entry) => entry.destination)
            .filter((destination) => destination.includes("/media/"));
        expect(mediaDestinations()).toEqual([
            `/app/match/${matchId}/media/unavailable`,
        ]);

        allow = true;
        await useMediaStore.getState().retry();
        expect(mediaDestinations()).toEqual([
            `/app/match/${matchId}/media/unavailable`,
            `/app/match/${matchId}/media/available`,
        ]);
    });

    it("stops local tracks when leaving the page session", async () => {
        const link = transport();
        const local = stream();
        await useMediaStore.getState().join({
            matchId,
            localUserId: "aaaa",
            remoteUserIds: ["bbbb"],
            transport: link,
            getUserMedia: async () => local,
            createPeer: () => ({
                iceConnectionState: "new",
                onicecandidate: null,
                ontrack: null,
                oniceconnectionstatechange: null,
                addTrack() { return undefined; },
                async createOffer() { return { type: "offer" as const, sdp: "offer" }; },
                async createAnswer() { return { type: "answer" as const, sdp: "answer" }; },
                async setLocalDescription() { return undefined; },
                async setRemoteDescription() { return undefined; },
                async addIceCandidate() { return undefined; },
                close() { return undefined; },
            }),
        });
        useMediaStore.getState().leave();
        expect(local.getTracks().every((track) => track.readyState === "ended")).toBe(true);
        expect(link.published.some((entry) => entry.body.kind === "LEAVE")).toBe(true);
    });

    it("does not pause the match when a guesser loses the camera", async () => {
        const link = transport();
        await useMediaStore.getState().join({
            matchId,
            localUserId: "bbbb",
            remoteUserIds: ["aaaa"],
            transport: link,
            getUserMedia: async () => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })),
        });
        useMediaStore.getState().setMimeVideoRequired(false);
        expect(link.published).toEqual([]);
        expect(useMediaStore.getState().phase).toBe("permission-denied");
    });
});
