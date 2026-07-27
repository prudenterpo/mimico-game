import { create } from "zustand";
import {
    AuthState,
    ChatMessage,
    GameTable,
    Invite,
    LobbyMessageEventData,
    LoginResponse,
    OnlineUsersResponse,
    RealtimeEventEnvelope,
    TableInviteEventData,
    User,
    UserProfileResponse
} from "@/types";
import { api } from "@/lib/api";
import { stompClient } from "@/lib/stomp";

const LOBBY_MESSAGE_MAX_LENGTH = 500;

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
    setUser: (user: User | null) => void;

    onlineUsers: User[];
    chatMessages: ChatMessage[];

    setOnlineUsers: (users: User[]) => void;
    addChatMessage: (message: ChatMessage) => void;
    clearChat: () => void;

    connectWebSocket: () => void;
    disconnectWebSocket: () => void;
    sendChatMessage: (message: string) => void;

    currentTable: GameTable | null;
    pendingInvite: Invite | null;

    currentTablePlayers: User[];
    readyPlayers: string[];
    tableChatMessages: ChatMessage[];
    connectToTable: (tableId: string) => void;

    createTable: (tableName: string, invitedUserIds: string[]) => void;
    setPendingInvite: (invite: Invite | null) => void;
    acceptInvite: () => void;
    rejectInvite: () => void;

    setCurrentTablePlayers: (players: User[]) => void;
    setReadyPlayers: (readyPlayerIds: string[]) => void;
    toggleReady: () => void;
    leaveTable: () => void;
    sendTableChatMessage: (message: string) => void;
    addTableChatMessage: (message: ChatMessage) => void;
    clearTableChat: () => void;

    restoreAuth: () => Promise<boolean>;
}

export const useStore = create<Store>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    login: async (email: string, password: string) => {
        try {
            const { token, user: profile } = await api.post<LoginResponse>("/auth/login", {
                email,
                password,
            });
            api.setToken(token);
            stompClient.setToken(token);

            const user = toUser(profile);
            set({
                user,
                token,
                isAuthenticated: true,
            });
        } catch (error) {
            throw error;
        }
    },

    register: async (nickname: string, email: string, password: string) => {
        try {
            await api.post("/auth/register", { nickname, email, password });
            await get().login(email, password);
        } catch (error) {
            throw error;
        }
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
            readyPlayers: [],
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
            const user = toUser(userProfile);

            set({
                user,
                token,
                isAuthenticated: true,
            });
            return true;

        } catch (error) {
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


    setUser: (user: User | null) => {
        set({ user });
    },

    onlineUsers: [],
    chatMessages: [],

    setOnlineUsers: (users: User[]) => {
        set({ onlineUsers: users });
    },

    addChatMessage: (message: ChatMessage) => {
        set((state) => ({
            chatMessages: [...state.chatMessages, message],
        }));
    },

    clearChat: () => {
        set({ chatMessages: [] });
    },

    connectWebSocket: () => {
        const { token, isAuthenticated } = get();
        if (!token || !isAuthenticated) {
            return;
        }

        stompClient.setToken(token);

        stompClient.connect(
            () => {
                stompClient.subscribe("/topic/lobby/users", (message) => {
                    if (!isRealtimeEnvelope<OnlineUsersResponse>(message, "ONLINE_USERS_UPDATED")) {
                        return;
                    }

                    get().setOnlineUsers(message.data.users.map(toUser));
                });

                stompClient.subscribe("/topic/lobby/chat", (message) => {
                    if (!isRealtimeEnvelope<LobbyMessageEventData>(message, "LOBBY_MESSAGE_POSTED")) {
                        return;
                    }

                    const data = message.data;

                    const chatMessage: ChatMessage = {
                        id: `${data.senderUserId}-${data.sentAt}`,
                        userId: data.senderUserId,
                        userName: data.senderDisplayName,
                        message: data.message,
                        timestamp: data.sentAt
                    };
                    get().addChatMessage(chatMessage);
                });

                stompClient.subscribe("/user/queue/invite", (message) => {
                    if (isRealtimeEnvelope<TableInviteEventData>(message, "TABLE_INVITE_RECEIVED")) {
                        const invite = createInviteFromEvent(message.data);
                        if (!invite) return;
                        set({ pendingInvite: invite });
                    }
                });

                stompClient.subscribe("/user/queue/table/players", (message) => {
                    if (message.type === "TABLE_PLAYERS_UPDATE") {
                        const players = message.players || [];
                        get().setCurrentTablePlayers(players);
                    }
                });

                stompClient.subscribe("/user/queue/table/ready", (message) => {
                    if (message.type === "READY_STATUS_UPDATE") {
                        const readyPlayerIds = message.readyPlayers || [];
                        get().setReadyPlayers(readyPlayerIds);
                    }
                });

                stompClient.subscribe("/user/queue/table/chat", (message) => {
                    if (message.type === "TABLE_CHAT_MESSAGE") {
                        const chatMessage: ChatMessage = {
                            id: message.id || Date.now().toString(),
                            userId: message.userId,
                            userName: message.userName,
                            message: message.message,
                            timestamp: message.timestamp
                        };
                        get().addTableChatMessage(chatMessage);
                    }
                });

                stompClient.subscribe("/user/queue/table/start", (message) => {
                    if (message.type === "GAME_STARTING") {
                        const { tableId } = message;
                        console.log("Game starting for table:", tableId);
                    }
                });

                stompClient.subscribe("/user/queue/errors", (message) => {
                    console.error("WebSocket error:", message.message);
                });

                stompClient.publish("/app/lobby/join", {});
            },
            () => undefined
        );
    },

    disconnectWebSocket: () => {
        stompClient.disconnect();
    },

    sendChatMessage: (message: string) => {
        const user = get().user;
        if (!user) return;

        const text = message.trim();
        if (!text || text.length > LOBBY_MESSAGE_MAX_LENGTH) return;

        stompClient.publish("/app/lobby/chat", {
            message: text,
        });
    },

    currentTable: null,
    pendingInvite: null,

    currentTablePlayers: [],
    readyPlayers: [],
    tableChatMessages: [],

    createTable: (tableName: string, invitedUserIds: string[]) => {
        const user = get().user;
        if (!user) return;

        const tableId = crypto.randomUUID();

        invitedUserIds.forEach(invitedUserId => {
            stompClient.publish("/app/table/invite", {
                tableId,
                tableName,
                invitedUserId: invitedUserId,
            });
        });
    },


    connectToTable: (tableId: string) => {
        console.log("🔌 Connecting to table:", tableId);

        stompClient.subscribe(`/topic/table/${tableId}/player-accepted`, (message) => {
            console.log("📨 Player accepted:", message);
            let data;
            if (typeof message.body === 'string') {
                data = JSON.parse(message.body);
            } else {
                data = message;
            }

            if (data.type === "PLAYER_ACCEPTED") {
                console.log("✅ Player accepted, refreshing table status");
            }
        });

        stompClient.subscribe(`/topic/table/${tableId}/status`, (message) => {
            console.log("📨 Table status:", message);
            let data;
            if (typeof message.body === 'string') {
                data = JSON.parse(message.body);
            } else {
                data = message;
            }

            if (data.type === "TABLE_STATUS") {
                console.log("📊 Table status update:", data.acceptedCount, "/", data.requiredCount);
                // TODO: Atualizar contagem de jogadores no UI
            }
        });

        stompClient.subscribe(`/topic/table/${tableId}/ready`, (message) => {
            console.log("📨 Ready status:", message);
            let data;
            if (typeof message.body === 'string') {
                data = JSON.parse(message.body);
            } else {
                data = message;
            }

            if (data.type === "READY_STATUS_UPDATE") {
                const readyPlayerIds = data.readyPlayers || [];
                get().setReadyPlayers(readyPlayerIds);
            }
        });

        stompClient.subscribe(`/topic/table/${tableId}/match-started`, (message) => {
            console.log("📨 Match started:", message);
            let data;
            if (typeof message.body === 'string') {
                data = JSON.parse(message.body);
            } else {
                data = message;
            }

            if (data.type === "MATCH_STARTED") {
                console.log("🎮 Game starting!", data.data);
                window.location.href = `/table/${tableId}`;
            }
        });
    },
    setPendingInvite: (invite: Invite | null) => {
        set({ pendingInvite: invite });
    },

    acceptInvite: () => {
        const invite = get().pendingInvite;
        if (!invite) return;

        stompClient.publish("/app/table/invite/accept", {
            tableId: invite.tableId,
            inviteId: invite.id,
        });

        get().connectToTable(invite.tableId);

        set({
            pendingInvite: null,
            currentTable: {
                id: invite.tableId,
                name: invite.tableName,
                hostId: invite.hostId,
                players: [],
                status: "waiting",
                createdAt: new Date(),
            }
        });
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

    setCurrentTablePlayers: (players: User[]) => {
        set({ currentTablePlayers: players });
    },

    setReadyPlayers: (readyPlayerIds: string[]) => {
        set({ readyPlayers: readyPlayerIds });
    },

    toggleReady: () => {
        const user = get().user;
        const currentTable = get().currentTable;
        if (!user || !currentTable) return;

        const isCurrentlyReady = get().readyPlayers.includes(user.id);

        stompClient.publish("/app/table/ready", {
            tableId: currentTable.id,
            userId: user.id,
            ready: !isCurrentlyReady,
        });
    },

    leaveTable: () => {
        const currentTable = get().currentTable;
        if (!currentTable) return;

        stompClient.publish("/app/table/leave", {
            tableId: currentTable.id,
        });

        set({
            currentTable: null,
            currentTablePlayers: [],
            readyPlayers: [],
            tableChatMessages: [],
        });
    },

    sendTableChatMessage: (message: string) => {
        const user = get().user;
        const currentTable = get().currentTable;
        if (!user || !currentTable) return;

        stompClient.publish("/app/table/chat", {
            tableId: currentTable.id,
            userId: user.id,
            userName: user.nickname,
            message,
            timestamp: new Date().toISOString(),
        });
    },

    addTableChatMessage: (message: ChatMessage) => {
        set((state) => ({
            tableChatMessages: [...state.tableChatMessages, message],
        }));
    },

    clearTableChat: () => {
        set({ tableChatMessages: [] });
    },
}));
