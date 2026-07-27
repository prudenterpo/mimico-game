import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    emptyLobbyChatMessage,
    lobbyMessageEnvelope,
    malformedEnvelope,
    onlineUsersEnvelope,
    overlongLobbyChatMessage,
    tableInviteEnvelope,
    validAuthUser,
    validLobbyChatMessage,
    validLoginResponse
} from "@/test/fixtures/authLobby";
import {
    acceptedPlayers,
    hostUser,
    inviteeUsers,
    matchStartedEnvelope,
    mixedStatusPlayers,
    tableClosedEnvelope,
    tableId,
    tableMessageEnvelope,
    tablePlayersEnvelope,
    tableTeamsEnvelope,
    validCreateTableResponse,
    validTeamAssignments
} from "@/test/fixtures/tableSetup";
import { User } from "@/types";

const mocks = vi.hoisted(() => {
    return {
        api: {
            setToken: vi.fn(),
            get: vi.fn(),
            post: vi.fn(),
        },
        stompClient: {
            setToken: vi.fn(),
            connect: vi.fn(),
            disconnect: vi.fn(),
            subscribe: vi.fn(),
            publish: vi.fn(),
        },
    };
});

vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/lib/stomp", () => ({ stompClient: mocks.stompClient }));

import { useStore } from "./store";

const authenticatedUser: User = {
    id: validAuthUser.userId,
    email: validAuthUser.email,
    nickname: validAuthUser.nickname,
    roles: validAuthUser.roles,
    isOnline: true,
};

const resetStore = () => {
    useStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        onlineUsers: [],
        chatMessages: [],
        currentTable: null,
        pendingInvite: null,
        currentTablePlayers: [],
        tableTeamAssignments: [],
        tableClosedReason: null,
        matchStartedId: null,
        isMatchStarted: false,
        tableChatMessages: [],
    });
};

describe("auth and lobby store", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        resetStore();
    });

    it("stores canonical login response token and user state", async () => {
        mocks.api.post.mockResolvedValueOnce(validLoginResponse);

        await useStore.getState().login("player@example.test", "Password1!");

        expect(mocks.api.post).toHaveBeenCalledWith("/auth/login", {
            email: "player@example.test",
            password: "Password1!",
        });
        expect(mocks.api.setToken).toHaveBeenCalledWith("fake.jwt.token");
        expect(mocks.stompClient.setToken).toHaveBeenCalledWith("fake.jwt.token");
        expect(useStore.getState().user).toMatchObject(authenticatedUser);
        expect(useStore.getState().isAuthenticated).toBe(true);
    });

    it("restores a valid stored token through current user endpoint", async () => {
        localStorage.setItem("token", "stored.fake.token");
        mocks.api.get.mockResolvedValueOnce(validAuthUser);

        await expect(useStore.getState().restoreAuth()).resolves.toBe(true);

        expect(mocks.api.setToken).toHaveBeenCalledWith("stored.fake.token");
        expect(mocks.api.get).toHaveBeenCalledWith("/auth/me");
        expect(useStore.getState().token).toBe("stored.fake.token");
        expect(useStore.getState().user?.id).toBe(validAuthUser.userId);
    });

    it("clears auth and lobby state when stored token is invalid", async () => {
        localStorage.setItem("token", "expired.fake.token");
        useStore.setState({
            user: authenticatedUser,
            token: "expired.fake.token",
            isAuthenticated: true,
            onlineUsers: [authenticatedUser],
            chatMessages: [{ id: "m1", userId: authenticatedUser.id, userName: authenticatedUser.nickname, message: "oi", timestamp: "2026-07-26T15:00:00Z" }],
        });
        mocks.api.get.mockRejectedValueOnce(new Error("Unauthorized"));

        await expect(useStore.getState().restoreAuth()).resolves.toBe(false);

        expect(mocks.api.setToken).toHaveBeenLastCalledWith(null);
        expect(mocks.stompClient.setToken).toHaveBeenLastCalledWith(null);
        expect(useStore.getState().isAuthenticated).toBe(false);
        expect(useStore.getState().onlineUsers).toEqual([]);
        expect(useStore.getState().chatMessages).toEqual([]);
    });

    it("logout clears auth, lobby and websocket state", () => {
        useStore.setState({
            user: authenticatedUser,
            token: "fake.jwt.token",
            isAuthenticated: true,
            onlineUsers: [authenticatedUser],
            chatMessages: [{ id: "m1", userId: authenticatedUser.id, userName: authenticatedUser.nickname, message: "oi", timestamp: "2026-07-26T15:00:00Z" }],
            pendingInvite: {
                id: "33333333-3333-4333-8333-333333333333",
                tableId: "44444444-4444-4444-8444-444444444444",
                tableName: "Mesa",
                hostId: "22222222-2222-4222-8222-222222222222",
                hostName: "friend_2",
                invitedUserId: authenticatedUser.id,
                expiresAt: new Date("2026-07-26T15:02:00Z"),
            },
        });

        useStore.getState().logout();

        expect(mocks.stompClient.disconnect).toHaveBeenCalled();
        expect(mocks.api.post).toHaveBeenCalledWith("/auth/logout");
        expect(useStore.getState().user).toBeNull();
        expect(useStore.getState().token).toBeNull();
        expect(useStore.getState().onlineUsers).toEqual([]);
        expect(useStore.getState().pendingInvite).toBeNull();
    });

    it("does not connect STOMP before auth is ready", () => {
        useStore.getState().connectWebSocket();

        expect(mocks.stompClient.connect).not.toHaveBeenCalled();
    });

    it("joins lobby and handles canonical websocket envelopes", () => {
        const subscriptions = new Map<string, (message: unknown) => void>();
        mocks.stompClient.connect.mockImplementation((onConnected: () => void) => onConnected());
        mocks.stompClient.subscribe.mockImplementation((destination: string, callback: (message: unknown) => void) => {
            subscriptions.set(destination, callback);
            return { unsubscribe: vi.fn() };
        });
        useStore.setState({
            user: authenticatedUser,
            token: "fake.jwt.token",
            isAuthenticated: true,
        });

        useStore.getState().connectWebSocket();

        expect(mocks.stompClient.publish).toHaveBeenCalledWith("/app/lobby/join", {});

        subscriptions.get("/topic/lobby/users")?.(onlineUsersEnvelope);
        expect(useStore.getState().onlineUsers).toHaveLength(2);

        subscriptions.get("/topic/lobby/users")?.(malformedEnvelope);
        expect(useStore.getState().onlineUsers).toHaveLength(2);

        subscriptions.get("/topic/lobby/chat")?.(lobbyMessageEnvelope);
        expect(useStore.getState().chatMessages[0]).toMatchObject({
            userId: "22222222-2222-4222-8222-222222222222",
            userName: "friend_2",
            message: "Oi, lobby!",
        });

        subscriptions.get("/user/queue/invite")?.(tableInviteEnvelope);
        expect(useStore.getState().pendingInvite).toMatchObject({
            id: "33333333-3333-4333-8333-333333333333",
            tableName: "Mesa da rodada",
            hostName: "friend_2",
        });
    });

    it("validates lobby chat before publishing canonical command", () => {
        useStore.setState({
            user: authenticatedUser,
            token: "fake.jwt.token",
            isAuthenticated: true,
        });

        useStore.getState().sendChatMessage(emptyLobbyChatMessage);
        useStore.getState().sendChatMessage(overlongLobbyChatMessage);

        expect(mocks.stompClient.publish).not.toHaveBeenCalled();

        useStore.getState().sendChatMessage(`  ${validLobbyChatMessage}  `);

        expect(mocks.stompClient.publish).toHaveBeenCalledWith("/app/lobby/chat", {
            message: validLobbyChatMessage,
        });
    });

    it("creates a table through REST, uses backend table id and sends exactly 3 invites", async () => {
        mocks.api.post.mockResolvedValueOnce(validCreateTableResponse);
        useStore.setState({
            user: hostUser,
            token: "fake.jwt.token",
            isAuthenticated: true,
        });

        const table = await useStore.getState().createTable("Mesa da rodada", inviteeUsers.map((user) => user.id));

        expect(mocks.api.post).toHaveBeenCalledWith("/tables", { name: "Mesa da rodada" });
        expect(table?.id).toBe(tableId);
        expect(useStore.getState().currentTable?.id).toBe(tableId);
        expect(mocks.stompClient.publish).toHaveBeenCalledTimes(3);
        inviteeUsers.forEach((invitee) => {
            expect(mocks.stompClient.publish).toHaveBeenCalledWith("/app/table/invite", {
                tableId,
                invitedUserId: invitee.id,
            });
        });
    });

    it("blocks invalid create-table inputs before API calls", async () => {
        useStore.setState({
            user: hostUser,
            token: "fake.jwt.token",
            isAuthenticated: true,
        });

        await useStore.getState().createTable("ab", inviteeUsers.map((user) => user.id));
        await useStore.getState().createTable("Mesa", inviteeUsers.slice(0, 2).map((user) => user.id));
        await useStore.getState().createTable("Mesa", [hostUser.id, ...inviteeUsers.slice(0, 2).map((user) => user.id)]);

        expect(mocks.api.post).not.toHaveBeenCalled();
        expect(mocks.stompClient.publish).not.toHaveBeenCalled();
    });

    it("subscribes to canonical table destinations and handles table envelopes", () => {
        const subscriptions = new Map<string, (message: unknown) => void>();
        mocks.stompClient.subscribe.mockImplementation((destination: string, callback: (message: unknown) => void) => {
            subscriptions.set(destination, callback);
            return { unsubscribe: vi.fn() };
        });
        useStore.setState({
            user: hostUser,
            currentTable: {
                id: tableId,
                name: "Mesa da rodada",
                hostId: hostUser.id,
                players: [],
                status: "TABLE_WAITING",
                teamAssignments: [],
            },
        });

        useStore.getState().connectToTable(tableId);

        expect(Array.from(subscriptions.keys())).toEqual([
            `/topic/table/${tableId}/players`,
            `/topic/table/${tableId}/teams`,
            `/topic/table/${tableId}/chat`,
            `/topic/table/${tableId}/match-started`,
            `/topic/table/${tableId}/closed`,
        ]);

        subscriptions.get(`/topic/table/${tableId}/players`)?.(tablePlayersEnvelope);
        expect(useStore.getState().currentTablePlayers).toEqual(mixedStatusPlayers);

        subscriptions.get(`/topic/table/${tableId}/teams`)?.(tableTeamsEnvelope);
        expect(useStore.getState().tableTeamAssignments).toEqual(validTeamAssignments);
        expect(useStore.getState().currentTable?.status).toBe("TABLE_READY_TO_START");

        subscriptions.get(`/topic/table/${tableId}/chat`)?.(tableMessageEnvelope);
        expect(useStore.getState().tableChatMessages[0]).toMatchObject({
            userName: "friend_2",
            message: "Bora montar os times?",
        });

        subscriptions.get(`/topic/table/${tableId}/chat`)?.({ type: "TABLE_MESSAGE_POSTD", data: null });
        expect(useStore.getState().tableChatMessages).toHaveLength(1);

        subscriptions.get(`/topic/table/${tableId}/match-started`)?.(matchStartedEnvelope);
        expect(useStore.getState().matchStartedId).toBe(matchStartedEnvelope.data.matchId);
        expect(useStore.getState().isMatchStarted).toBe(true);

        subscriptions.get(`/topic/table/${tableId}/closed`)?.(tableClosedEnvelope);
        expect(useStore.getState().tableClosedReason).toBe("HOST_CLOSED");
    });

    it("publishes table chat, team assignment, start and leave commands canonically", () => {
        useStore.setState({
            user: hostUser,
            currentTable: {
                id: tableId,
                name: "Mesa da rodada",
                hostId: hostUser.id,
                players: acceptedPlayers,
                status: "TABLE_WAITING",
                teamAssignments: [],
            },
            currentTablePlayers: acceptedPlayers,
            tableTeamAssignments: [],
        });

        useStore.getState().sendTableChatMessage("   ");
        useStore.getState().sendTableChatMessage("x".repeat(501));
        expect(mocks.stompClient.publish).not.toHaveBeenCalled();

        useStore.getState().sendTableChatMessage("  Oi, mesa!  ");
        expect(mocks.stompClient.publish).toHaveBeenCalledWith(`/app/table/${tableId}/chat`, {
            message: "Oi, mesa!",
        });

        useStore.getState().assignTeams("A", [hostUser.id, inviteeUsers[0].id]);
        expect(mocks.stompClient.publish).toHaveBeenCalledWith("/app/table/teams/assign", {
            tableId,
            teamAssignments: [
                { team: "A", playerIds: [hostUser.id, inviteeUsers[0].id] },
                { team: "B", playerIds: [] },
            ],
        });

        useStore.setState({ tableTeamAssignments: validTeamAssignments });
        useStore.getState().startMatch();
        expect(mocks.stompClient.publish).toHaveBeenCalledWith("/app/table/match/start", { tableId });

        useStore.getState().leaveTable();
        expect(mocks.stompClient.publish).toHaveBeenCalledWith("/app/table/leave", { tableId });
        expect(useStore.getState().currentTable).toBeNull();
    });

    it("publishes invite accept and reject decisions with invite id", () => {
        const invite = {
            id: "33333333-3333-4333-8333-333333333333",
            tableId: "44444444-4444-4444-8444-444444444444",
            tableName: "Mesa da rodada",
            hostId: "22222222-2222-4222-8222-222222222222",
            hostName: "friend_2",
            invitedUserId: authenticatedUser.id,
            expiresAt: new Date("2026-07-26T15:02:00Z"),
        };

        useStore.setState({ user: authenticatedUser, pendingInvite: invite });
        useStore.getState().acceptInvite();

        expect(mocks.stompClient.publish).toHaveBeenCalledWith("/app/table/invite/accept", {
            tableId: invite.tableId,
            inviteId: invite.id,
        });

        useStore.setState({ pendingInvite: invite });
        useStore.getState().rejectInvite();

        expect(mocks.stompClient.publish).toHaveBeenCalledWith("/app/table/invite/reject", {
            tableId: invite.tableId,
            inviteId: invite.id,
        });
        expect(useStore.getState().pendingInvite).toBeNull();
    });
});
