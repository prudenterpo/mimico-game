import { describe, expect, it } from "vitest";
import { MediaReportInput, nextMediaReport } from "@/lib/mediaReport";

const base = (overrides: Partial<MediaReportInput> = {}): MediaReportInput => ({
    mimeVideoRequired: true,
    phase: "live",
    cameraOn: true,
    remotes: [{ link: "connected" }, { link: "connecting" }, { link: "connected" }],
    serverMediaPaused: false,
    unavailableReported: false,
    availableAnnounced: false,
    ...overrides,
});

describe("nextMediaReport", () => {
    it("sends unavailable once when the mime camera is blocked or the mesh fails", () => {
        expect(nextMediaReport(base({ phase: "permission-denied" })).command).toBe("unavailable");
        const denied = nextMediaReport(base({ phase: "permission-denied" }));
        expect(nextMediaReport(denied).command).toBeNull();
        expect(nextMediaReport(base({ phase: "permission-denied", mimeVideoRequired: false })).command).toBeNull();
        expect(nextMediaReport(base({ cameraOn: false })).command).toBe("unavailable");
        expect(nextMediaReport(base({ phase: "failed" })).command).toBe("unavailable");
        expect(nextMediaReport(base({
            remotes: [{ link: "failed" }, { link: "failed" }],
        })).command).toBe("unavailable");
        expect(nextMediaReport(base({
            remotes: [{ link: "failed" }, { link: "connecting" }],
        })).command).toBeNull();
    });

    it("sends available when mime video recovers or the server is still paused for media", () => {
        const blocked = nextMediaReport(base({ cameraOn: false }));
        expect(nextMediaReport({ ...blocked, cameraOn: true }).command).toBe("available");
        expect(nextMediaReport(base({ serverMediaPaused: true })).command).toBe("available");
        const announced = nextMediaReport(base({ serverMediaPaused: true }));
        expect(nextMediaReport(announced).command).toBeNull();
        expect(nextMediaReport({ ...announced, serverMediaPaused: false }).availableAnnounced).toBe(false);
    });
});
