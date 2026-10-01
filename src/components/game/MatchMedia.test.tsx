import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import MatchMedia from "@/components/game/MatchMedia";
import { resetMediaStore, useMediaStore } from "@/stores/mediaStore";

const players = [
    { userId: "11111111-1111-4111-8111-111111111111", nickname: "host_1" },
    { userId: "22222222-2222-4222-8222-222222222222", nickname: "friend_2" },
    { userId: "33333333-3333-4333-8333-333333333333", nickname: "friend_3" },
    { userId: "44444444-4444-4444-8444-444444444444", nickname: "friend_4" },
];

describe("MatchMedia", () => {
    beforeEach(() => {
        resetMediaStore();
    });

    it("keeps the mime video primary and shows a permission failure", () => {
        useMediaStore.setState({ phase: "permission-denied", cameraOn: false });
        render(
            <MatchMedia
                selfId={players[1].userId}
                mimeUserId={players[0].userId}
                players={players}
            />
        );

        expect(screen.getByTestId(`media-tile-${players[0].userId}`)).toHaveAttribute("data-primary", "true");
        expect(screen.getByTestId(`media-tile-${players[1].userId}`)).toHaveAttribute("data-primary", "false");
        expect(screen.getByTestId("media-phase")).toHaveTextContent("camera foi bloqueada");
        expect(screen.getByRole("button", { name: "Tentar camera de novo" })).toBeInTheDocument();
    });

    it("shows a failed media state", () => {
        useMediaStore.setState({ phase: "failed" });
        render(<MatchMedia selfId={players[0].userId} mimeUserId={players[0].userId} players={players} />);
        expect(screen.getByTestId("media-phase")).toHaveTextContent("video falhou");
        expect(screen.getByTestId(`media-tile-${players[0].userId}`)).toHaveAttribute("data-primary", "true");
    });
});
