import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LobbyPage from "./page";
import { useStore } from "@/stores/store";

const router = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => router,
}));

vi.mock("sonner", () => ({
    toast: Object.assign(vi.fn(), {
        success: vi.fn(),
        info: vi.fn(),
        dismiss: vi.fn(),
    }),
}));

const user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "player@example.test",
    nickname: "player_1",
    isOnline: true,
};

describe("LobbyPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({
            user,
            token: "fake.jwt.token",
            isAuthenticated: true,
            onlineUsers: [
                user,
                {
                    id: "22222222-2222-4222-8222-222222222222",
                    email: "friend@example.test",
                    nickname: "friend_2",
                    isOnline: true,
                },
            ],
            chatMessages: [],
            pendingInvite: null,
            currentTable: null,
            restoreAuth: vi.fn().mockResolvedValue(true),
            connectWebSocket: vi.fn(),
            disconnectWebSocket: vi.fn(),
            sendChatMessage: vi.fn(),
            createTable: vi.fn(),
            acceptInvite: vi.fn(),
            rejectInvite: vi.fn(),
            logout: vi.fn(),
        });
    });

    it("keeps lobby chat primary and online users reachable", async () => {
        render(<LobbyPage />);

        expect(screen.getByRole("main", { name: "Chat global do lobby" })).toBeInTheDocument();
        expect(screen.getByRole("complementary", { name: "Jogadores online" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /2 online/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Digite uma mensagem...")).toBeInTheDocument();

        await waitFor(() => expect(useStore.getState().restoreAuth).toHaveBeenCalled());
    });

    it("redirects unauthenticated lobby access to login", async () => {
        useStore.setState({
            user: null,
            token: null,
            isAuthenticated: false,
            onlineUsers: [],
            restoreAuth: vi.fn().mockResolvedValue(false),
        });

        render(<LobbyPage />);

        await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    });
});
