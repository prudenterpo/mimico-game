import { create } from "zustand";
import { nextMediaReport } from "@/lib/mediaReport";
import {
    CapturedStream,
    LocalMediaPhase,
    MatchMediaSession,
    MediaTransport,
    readStunUrls,
    RemoteMedia,
    SessionPeer,
} from "@/lib/mediaSession";
import { stompClient } from "@/lib/stomp";

export interface MediaJoinInput {
    matchId: string;
    localUserId: string;
    remoteUserIds: string[];
    transport?: MediaTransport;
    getUserMedia?: (constraints: MediaStreamConstraints) => Promise<CapturedStream>;
    createPeer?: (config: RTCConfiguration) => SessionPeer;
    stunUrls?: string[];
}

interface MediaStoreState {
    phase: LocalMediaPhase;
    localStream: CapturedStream | null;
    cameraOn: boolean;
    muted: boolean;
    remotes: RemoteMedia[];
    matchId: string | null;
    localUserId: string | null;
    mimeVideoRequired: boolean;
    serverMediaPaused: boolean;
    unavailableReported: boolean;
    availableAnnounced: boolean;
    join: (input: MediaJoinInput) => Promise<void>;
    leave: () => void;
    retry: () => Promise<void>;
    setMimeVideoRequired: (required: boolean) => void;
    setServerMediaPaused: (paused: boolean) => void;
    toggleMute: () => void;
    toggleCamera: () => void;
}

const stompTransport: MediaTransport = {
    publish: (destination, body) => stompClient.publish(destination, body ?? {}),
    subscribe: (destination, callback) => {
        stompClient.subscribe(destination, callback);
    },
    unsubscribe: (destination) => stompClient.unsubscribe(destination),
    isConnected: () => stompClient.isConnected(),
};

const initial = {
    phase: "idle" as LocalMediaPhase,
    localStream: null,
    cameraOn: true,
    muted: false,
    remotes: [] as RemoteMedia[],
    matchId: null as string | null,
    localUserId: null as string | null,
    mimeVideoRequired: false,
    serverMediaPaused: false,
    unavailableReported: false,
    availableAnnounced: false,
};

let activeSession: MatchMediaSession | null = null;
let transport: MediaTransport = stompTransport;

function publishMedia(matchId: string, command: "unavailable" | "available") {
    transport.publish(`/app/match/${matchId}/media/${command}`, {});
}

export const useMediaStore = create<MediaStoreState>((set, get) => {
    const syncPause = () => {
        const state = get();
        if (!state.matchId) return;
        const decision = nextMediaReport(state);
        if (decision.command && transport.isConnected && !transport.isConnected()) return;
        set({
            unavailableReported: decision.unavailableReported,
            availableAnnounced: decision.availableAnnounced,
        });
        if (decision.command) publishMedia(state.matchId, decision.command);
    };

    return {
        ...initial,

        join: async (input) => {
            transport = input.transport ?? stompTransport;
            if (
                activeSession
                && !activeSession.isStopped()
                && get().matchId === input.matchId
                && get().localUserId === input.localUserId
            ) {
                activeSession.setRemoteUserIds(input.remoteUserIds);
                await activeSession.start();
                return;
            }

            activeSession?.stop();
            const session = new MatchMediaSession({
                matchId: input.matchId,
                localUserId: input.localUserId,
                remoteUserIds: input.remoteUserIds,
                transport,
                getUserMedia: input.getUserMedia,
                createPeer: input.createPeer,
                stunUrls: input.stunUrls ?? readStunUrls(),
                onChange: (snapshot) => {
                    set(snapshot);
                    syncPause();
                },
            });
            activeSession = session;
            set({
                matchId: input.matchId,
                localUserId: input.localUserId,
                unavailableReported: false,
                availableAnnounced: false,
            });
            await session.start();
        },

        leave: () => {
            activeSession?.stop();
            activeSession = null;
            set({ ...initial });
        },

        retry: async () => {
            if (!activeSession || activeSession.isStopped()) return;
            await activeSession.retry();
        },

        setMimeVideoRequired: (mimeVideoRequired) => {
            set({ mimeVideoRequired });
            syncPause();
        },

        setServerMediaPaused: (serverMediaPaused) => {
            set({ serverMediaPaused });
            syncPause();
        },

        toggleMute: () => {
            const muted = !get().muted;
            activeSession?.setMuted(muted);
            if (!activeSession) set({ muted });
        },

        toggleCamera: () => {
            const cameraOn = !get().cameraOn;
            activeSession?.setCameraOn(cameraOn);
            if (!activeSession) set({ cameraOn });
        },
    };
});

export function resetMediaStore() {
    useMediaStore.getState().leave();
    transport = stompTransport;
}
