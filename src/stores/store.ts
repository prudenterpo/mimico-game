import { create } from "zustand";
import {
    AuthState,
    ChatMessage,
    GameTable,
    Invite,
    LobbyMessageEventData,
    LoginResponse,
    MatchStartedEventData,
    OnlineUsersResponse,
    RealtimeEventEnvelope,
    TableClosedEventData,
    TableInviteEventData,
    TableMessageEventData,
    TablePlayer,
    TablePlayersEventData,
    TableResponse,
    TableStatus,
    TableTeamsEventData,
    Team,
    TeamAssignment,
    User,
    UserProfileResponse
} from "@/types";
import { api } from "@/lib/api";
import { stompClient } from "@/lib/stomp";

const CHAT_MESSAGE_MAX_LENGTH = 500;

const toUser = (profile: UserProfileResponse): User => ({
    id: profile.userId,
    nickname: profile.nickname,
    email: profile.email,
    avatar: profile.avatarUrl || undefined,
    roles: profile.roles,
    isOnline: true,
});

const isRealtimeEnvelope = <T>(message: unknown, type: string): message is RealtimeEventEnvelope<T> => {
    if (!message || typeof message !== "object") return false;
    const candidate = message as Partial<RealtimeEventEnvelope<T>>;
    return (
        candidate.type === type &&
        !!candidate.data &&
        typeof candidate.data === "object" &&
        typeof candidate.occurredAt === "string"
    );
};

const normalizeTableStatus = (status?: string): TableStatus => {
    if (
        status === "TABLE_READY_TO_START" ||
        status === "TABLE_IN_MATCH" ||
        status === "TABLE_BETWEEN_MATCHES" ||
        status === "TABLE_CLOSED"
    ) {
        return status;
    }
    return "TABLE_WAITING";
};

const normalizeTablePlayerStatus = (status?: string): TablePlayer["status"] => {
    if (status === "pending" || status === "rejected" || status === "expired") return status;
    if (status === "INVITE_PENDING") return "pending";
    if (status === "INVITE_REJECTED") return "rejected";
    if (status === "INVITE_EXPIRED") return "expired";
    return "accepted";
};

const normalizeTablePlayer = (player: Partial<TablePlayer> & Partial<UserProfileResponse>): TablePlayer | null => {
    const userId = player.userId;
    const nickname = player.nickname;
    if (!userId || !nickname) return null;
    return {
        userId,
        nickname,
        status: normalizeTablePlayerStatus(player.status),
    };
};

const tableFromResponse = (response: TableResponse, currentUser: User | null): GameTable => {
    const tableId = response.tableId || response.id || "";
    const hostId = response.hostUserId || response.hostId || currentUser?.id || "";
    const responsePlayers = (response.players || [])
        .map((player) => normalizeTablePlayer(player))
        .filter((player): player is TablePlayer => Boolean(player));

    const players: TablePlayer[] = responsePlayers.length > 0
        ? responsePlayers
        : currentUser && currentUser.id === hostId
          ? [{ userId: currentUser.id, nickname: currentUser.nickname, status: "accepted" as const }]
          : [];

    return {
        id: tableId,
        name: response.name,
        hostId,
        hostNickname: response.hostNickname,
        status: normalizeTableStatus(response.status),
        players,
        teamAssignments: response.teamAssignments || [],
        createdAt: response.createdAt,
    };
};

const createInviteFromEvent = (data: TableInviteEventData): Invite | null => {
    const inviteId = data.inviteId || data.id;
    const hostName = data.hostName || data.hostDisplayName;
    const expiresAt = data.expiresAt
        ? new Date(data.expiresAt)
        : new Date(Date.now() + ((data.expiresIn ?? 60) * 1000));

    if (!data.tableId || !data.tableName || !data.hostId || !hostName || !data.invitedUserId) {
        return null;
    }

    return {
        id: inviteId || data.tableId,
        tableId: data.tableId,
        tableName: data.tableName,
        hostId: data.hostId,
        hostName,
        invitedUserId: data.invitedUserId,
        expiresAt,
    };
};

interface Store extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (nickname: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    restoreAuth: () => Promise<boolean>;
    setUser: (user: User | null) => void;

    onlineUsers: User[];
    chatMessages: ChatMessage[];
    setOnlineUsers: (users: User[]) => void;
    addChatMessage: (message: ChatMessage) => void;
    clearChat: () => void;
    connectWebSocket: (onConnected?: () => void) => void;
    disconnectWebSocket: () => void;
    sendChatMessage: (message: string) => void;

    currentTable: GameTable | null;
    pendingInvite: Invite | null;
    currentTablePlayers: TablePlayer[];
    tableChatMessages: ChatMessage[];
    tableTeamAssignments: TeamAssignment[];
    tableClosedReason: string | null;
    matchStartedId: string | null;

    createTable: (tableName: string, invitedUserIds: string[]) => Promise<GameTable | null>;
    fetchTable: (tableId: string) => Promise<GameTable | null>;
    connectToTable: (tableId: string) => void;
    setPendingInvite: (invite: Invite | null) => void;
    acceptInvite: () => string | null;
    rejectInvite: () => void;
    setCurrentTablePlayers: (players: TablePlayer[]) => void;
    assignTeams: (team: Team, playerIds: string[]) => void;
    startMatch: () => void;
    leaveTable: () => void;
    sendTableChatMessage: (message: string) => void;
    addTableChatMessage: (message: ChatMessage) => void;
    clearTableChat: () => void;
    resetTableRuntimeState: () => void;
}

export const useStore = create<Store>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    login: async (email: string, password: string) => {
        const { token, user: profile } = await api.post<LoginResponse>("/auth/login", {
            email,
            password,
        });
        api.setToken(token);
        stompClient.setToken(token);

        set({
            user: toUser(profile),
            token,
            isAuthenticated: true,
        });
    },

    register: async (nickname: string, email: string, password: string) => {
        await api.post("/auth/register", { nickname, email, password });
        await get().login(email, password);
    },

    logout: () => {
        get().disconnectWebSocket();
        Promise.resolve(api.post("/auth/logout")).catch(() => undefined);
        api.setToken(null);
        stompClient.setToken(null);
        if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            sessionStorage.clear();
        }
        set({
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
            tableChatMessages: [],
        });
    },

    restoreAuth: async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return false;

        try {
            api.setToken(token);
            stompClient.setToken(token);

            const userProfile = await api.get<UserProfileResponse>("/auth/me");
            set({
                user: toUser(userProfile),
                token,
                isAuthenticated: true,
            });
            return true;
        } catch {
            api.setToken(null);
            stompClient.setToken(null);
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                onlineUsers: [],
                chatMessages: [],
                pendingInvite: null,
            });
            return false;
        }
    },

    setUser: (user: User | null) => set({ user }),

    onlineUsers: [],
    chatMessages: [],
    setOnlineUsers: (users: User[]) => set({ onlineUsers: users }),
    addChatMessage: (message: ChatMessage) => {
        set((state) => ({ chatMessages: [...state.chatMessages, message] }));
    },
    clearChat: () => set({ chatMessages: [] }),

    connectWebSocket: (onConnected?: () => void) => {
        const { token, isAuthenticated } = get();
        if (!token || !isAuthenticated) return;

        stompClient.setToken(token);
        stompClient.connect(
            () => {
                stompClient.subscribe("/topic/lobby/users", (message) => {
                    if (!isRealtimeEnvelope<OnlineUsersResponse>(message, "ONLINE_USERS_UPDATED")) return;
                    get().setOnlineUsers(message.data.users.map(toUser));
                });

                stompClient.subscribe("/topic/lobby/chat", (message) => {
                    if (!isRealtimeEnvelope<LobbyMessageEventData>(message, "LOBBY_MESSAGE_POSTED")) return;
                    const data = message.data;
                    get().addChatMessage({
                        id: `${data.senderUserId}-${data.sentAt}`,
                        userId: data.senderUserId,
                        userName: data.senderDisplayName,
                        message: data.message,
                        timestamp: data.sentAt,
                    });
                });

                stompClient.subscribe("/user/queue/invite", (message) => {
                    if (!isRealtimeEnvelope<TableInviteEventData>(message, "TABLE_INVITE_RECEIVED")) return;
                    const invite = createInviteFromEvent(message.data);
                    if (invite) set({ pendingInvite: invite });
                });

                stompClient.subscribe("/user/queue/error", (message) => {
                    if (message && typeof message === "object") {
                        console.error("WebSocket error:", message);
                    }
                });

                stompClient.publish("/app/lobby/join", {});
                onConnected?.();
            },
            () => undefined
        );
    },

    disconnectWebSocket: () => {
        stompClient.disconnect();
    },

    sendChatMessage: (message: string) => {
        const text = message.trim();
        if (!get().user || !text || text.length > CHAT_MESSAGE_MAX_LENGTH) return;
        stompClient.publish("/app/lobby/chat", { message: text });
    },

    currentTable: null,
    pendingInvite: null,
    currentTablePlayers: [],
    tableChatMessages: [],
    tableTeamAssignments: [],
    tableClosedReason: null,
    matchStartedId: null,

    createTable: async (tableName: string, invitedUserIds: string[]) => {
        const name = tableName.trim();
        const user = get().user;
        const uniqueInvitedUserIds = Array.from(new Set(invitedUserIds)).filter((id) => id !== user?.id);
        if (!user || name.length < 3 || name.length > 100 || uniqueInvitedUserIds.length !== 3) return null;

        const table = tableFromResponse(await api.post<TableResponse>("/tables", { name }), user);
        set({
            currentTable: table,
            currentTablePlayers: table.players,
            tableTeamAssignments: table.teamAssignments,
            tableClosedReason: null,
            matchStartedId: null,
            tableChatMessages: [],
        });

        uniqueInvitedUserIds.forEach((invitedUserId) => {
            stompClient.publish("/app/table/invite", {
                tableId: table.id,
                invitedUserId,
            });
        });

        return table;
    },

    fetchTable: async (tableId: string) => {
        const table = tableFromResponse(await api.get<TableResponse>(`/tables/${tableId}`), get().user);
        set({
            currentTable: table,
            currentTablePlayers: table.players,
            tableTeamAssignments: table.teamAssignments,
            tableClosedReason: table.status === "TABLE_CLOSED" ? "SYSTEM_CLOSED" : null,
        });
        return table;
    },

    connectToTable: (tableId: string) => {
        stompClient.subscribe(`/topic/table/${tableId}/players`, (message) => {
            if (!isRealtimeEnvelope<TablePlayersEventData>(message, "TABLE_PLAYERS_UPDATED")) return;
            const data = message.data;
            const players = [
                ...(data.players || []),
                ...(data.pendingInvites || []),
                ...(data.rejectedInvites || []),
                ...(data.expiredInvites || []),
            ]
                .map((player) => normalizeTablePlayer(player))
                .filter((player): player is TablePlayer => Boolean(player));

            set((state) => ({
                currentTablePlayers: players,
                currentTable: state.currentTable
                    ? {
                        ...state.currentTable,
                        players,
                        status: normalizeTableStatus(data.status || state.currentTable.status),
                    }
                    : state.currentTable,
            }));
        });

        stompClient.subscribe(`/topic/table/${tableId}/teams`, (message) => {
            if (!isRealtimeEnvelope<TableTeamsEventData>(message, "TABLE_TEAMS_UPDATED")) return;
            const assignments = message.data.teamAssignments || [];
            set((state) => ({
                tableTeamAssignments: assignments,
                currentTable: state.currentTable
                    ? {
                        ...state.currentTable,
                        teamAssignments: assignments,
                        status: normalizeTableStatus(message.data.status || state.currentTable.status),
                    }
                    : state.currentTable,
            }));
        });

        stompClient.subscribe(`/topic/table/${tableId}/chat`, (message) => {
            if (!isRealtimeEnvelope<TableMessageEventData>(message, "TABLE_MESSAGE_POSTED")) return;
            const data = message.data;
            get().addTableChatMessage({
                id: `${data.senderUserId}-${data.sentAt}`,
                userId: data.senderUserId,
                userName: data.senderDisplayName,
                message: data.message,
                timestamp: data.sentAt,
            });
        });

        stompClient.subscribe(`/topic/table/${tableId}/match-started`, (message) => {
            if (!isRealtimeEnvelope<MatchStartedEventData>(message, "MATCH_STARTED")) return;
            set({
                matchStartedId: message.data.matchId || tableId,
            });
        });

        stompClient.subscribe(`/topic/table/${tableId}/closed`, (message) => {
            if (!isRealtimeEnvelope<TableClosedEventData>(message, "TABLE_CLOSED")) return;
            set((state) => ({
                tableClosedReason: message.data.reason,
                currentTable: state.currentTable
                    ? { ...state.currentTable, status: "TABLE_CLOSED" }
                    : state.currentTable,
            }));
        });
    },

    setPendingInvite: (invite: Invite | null) => set({ pendingInvite: invite }),

    acceptInvite: () => {
        const invite = get().pendingInvite;
        if (!invite) return null;

        stompClient.publish("/app/table/invite/accept", {
            tableId: invite.tableId,
            inviteId: invite.id,
        });

        set({
            pendingInvite: null,
            currentTable: {
                id: invite.tableId,
                name: invite.tableName,
                hostId: invite.hostId,
                hostNickname: invite.hostName,
                players: [],
                status: "TABLE_WAITING",
                teamAssignments: [],
            },
            currentTablePlayers: [],
            tableTeamAssignments: [],
            tableClosedReason: null,
            matchStartedId: null,
        });

        return invite.tableId;
    },

    rejectInvite: () => {
        const invite = get().pendingInvite;
        if (!invite) return;

        stompClient.publish("/app/table/invite/reject", {
            tableId: invite.tableId,
            inviteId: invite.id,
        });

        set({ pendingInvite: null });
    },

    setCurrentTablePlayers: (players: TablePlayer[]) => {
        set((state) => ({
            currentTablePlayers: players,
            currentTable: state.currentTable ? { ...state.currentTable, players } : state.currentTable,
        }));
    },

    assignTeams: (team: Team, playerIds: string[]) => {
        const currentTable = get().currentTable;
        if (!currentTable) return;

        const nextPlayerIds = Array.from(new Set(playerIds)).slice(0, 2);
        const nextAssignments = (["A", "B"] as Team[]).map((candidateTeam) => {
            if (candidateTeam === team) {
                return { team: candidateTeam, playerIds: nextPlayerIds };
            }

            const existingIds = get().tableTeamAssignments
                .find((assignment) => assignment.team === candidateTeam)
                ?.playerIds || [];

            return {
                team: candidateTeam,
                playerIds: existingIds.filter((playerId) => !nextPlayerIds.includes(playerId)),
            };
        });

        set({
            tableTeamAssignments: nextAssignments,
            currentTable: { ...currentTable, teamAssignments: nextAssignments },
        });

        stompClient.publish("/app/table/teams/assign", {
            tableId: currentTable.id,
            teamAssignments: nextAssignments,
        });
    },

    startMatch: () => {
        const currentTable = get().currentTable;
        if (!currentTable) return;
        stompClient.publish("/app/table/match/start", { tableId: currentTable.id });
    },

    leaveTable: () => {
        const currentTable = get().currentTable;
        if (!currentTable) return;

        stompClient.publish("/app/table/leave", { tableId: currentTable.id });
        get().resetTableRuntimeState();
    },

    sendTableChatMessage: (message: string) => {
        const currentTable = get().currentTable;
        const text = message.trim();
        if (!currentTable || !text || text.length > CHAT_MESSAGE_MAX_LENGTH) return;

        stompClient.publish(`/app/table/${currentTable.id}/chat`, {
            message: text,
        });
    },

    addTableChatMessage: (message: ChatMessage) => {
        set((state) => ({ tableChatMessages: [...state.tableChatMessages, message] }));
    },

    clearTableChat: () => set({ tableChatMessages: [] }),

    resetTableRuntimeState: () => {
        set({
            currentTable: null,
            currentTablePlayers: [],
            tableTeamAssignments: [],
            tableClosedReason: null,
            matchStartedId: null,
            tableChatMessages: [],
        });
    },
}));
