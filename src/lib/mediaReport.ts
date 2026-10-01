import { LocalMediaPhase, PeerLinkState } from "@/lib/mediaSession";

export interface MediaReportInput {
    mimeVideoRequired: boolean;
    phase: LocalMediaPhase;
    cameraOn: boolean;
    remotes: { link: PeerLinkState }[];
    serverMediaPaused: boolean;
    unavailableReported: boolean;
    availableAnnounced: boolean;
}

export interface MediaReportDecision extends MediaReportInput {
    command: "unavailable" | "available" | null;
}

export function nextMediaReport(state: MediaReportInput): MediaReportDecision {
    const meshFailed = state.remotes.length > 0 && state.remotes.every((remote) => remote.link === "failed");
    const healthy = state.phase === "live" && state.cameraOn && !meshFailed;
    const unhealthy = state.phase === "permission-denied"
        || state.phase === "failed"
        || (state.phase === "live" && (!state.cameraOn || meshFailed));

    let unavailableReported = state.unavailableReported;
    let availableAnnounced = state.availableAnnounced;
    let command: MediaReportDecision["command"] = null;

    if (state.mimeVideoRequired && unhealthy && !unavailableReported) {
        command = "unavailable";
        unavailableReported = true;
        availableAnnounced = false;
    } else if (
        state.mimeVideoRequired
        && healthy
        && (unavailableReported || (state.serverMediaPaused && !availableAnnounced))
    ) {
        command = "available";
        unavailableReported = false;
        availableAnnounced = true;
    } else if (!state.serverMediaPaused) {
        availableAnnounced = false;
    }

    return {
        ...state,
        command,
        unavailableReported,
        availableAnnounced,
    };
}
