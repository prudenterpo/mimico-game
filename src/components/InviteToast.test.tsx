import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InviteToast from "./InviteToast";

const invite = {
    id: "33333333-3333-4333-8333-333333333333",
    tableId: "44444444-4444-4444-8444-444444444444",
    tableName: "Mesa da rodada",
    hostId: "22222222-2222-4222-8222-222222222222",
    hostName: "friend_2",
    invitedUserId: "11111111-1111-4111-8111-111111111111",
    expiresAt: new Date(Date.now() + 60000),
};

describe("InviteToast", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders table name, host identity, countdown and actions", () => {
        const onAccept = vi.fn();
        const onReject = vi.fn();

        render(<InviteToast invite={invite} onAccept={onAccept} onReject={onReject} />);

        expect(screen.getByText("Mesa da rodada")).toBeInTheDocument();
        expect(screen.getByText("friend_2")).toBeInTheDocument();
        expect(screen.getByText(/Expira em/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Aceitar" }));
        fireEvent.click(screen.getByRole("button", { name: "Recusar" }));

        expect(onAccept).toHaveBeenCalledOnce();
        expect(onReject).toHaveBeenCalledOnce();
    });

    it("rejects locally when the invite countdown expires", () => {
        const onReject = vi.fn();

        render(<InviteToast invite={invite} onAccept={vi.fn()} onReject={onReject} />);

        act(() => {
            vi.advanceTimersByTime(61000);
        });

        expect(onReject).toHaveBeenCalledOnce();
    });
});
