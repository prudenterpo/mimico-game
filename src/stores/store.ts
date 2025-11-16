import { create } from "zustand";
import {User, AuthState, ChatMessage, GameTable, Invite, UserProfileResponse} from "@/types";
import { api } from "@/lib/api";
import { stompClient } from "@/lib/stomp";

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

    restoreAuth: () => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    login: async (email: string, password: string) => {
        try {
            const { token, userId, nickname } = await api.post<{ token: string; userId: string; nickname: string }>("/auth/login", {
                email,
                password,
            });
            console.log("token do me: " + token);
            api.setToken(token);

            const user: User = {
                id: userId,
                nickname: nickname,
                email,
                isOnline: true,
            };

            set({
                user,
                token,
                isAuthenticated: true,
            });

            localStorage.setItem("token", token);

        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    },

    register: async (nickname: string, email: string, password: string) => {
        try {
            await api.post("/auth/register", { nickname, email, password });
            await get().login(email, password);
        } catch (error) {
            console.error("Register error:", error);
            throw error;
        }
    },

    logout: () => {
        get().disconnectWebSocket();
        api.setToken(null);
        stompClient.setToken(null);
        localStorage.removeItem("token");
        sessionStorage.clear();
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
        const token = localStorage.getItem("token");
        console.log("🔍 RestoreAuth - Token found:", token);


        if (!token) return;

        try {
            api.setToken(token);

            const userProfile = await api.get<UserProfileResponse>("/auth/me");
            console.log("🔍 Backend returned profile:", userProfile);

            const user = {
                id: userProfile.userId,
                nickname: userProfile.nickname,
                email: userProfile.email,
                isOnline: true,
            };

            set({
                user,
                token,
                isAuthenticated: true,
            });

        } catch (error) {
            console.error("Failed to restore auth:", error);
            localStorage.removeItem("token");
            api.setToken(null);
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
        const token = get().token;
        if (!token) {
            console.error("No token available");
            return;
        }

        stompClient.setToken(token);

        stompClient.connect(
            () => {
                console.log("Connected to WebSocket");

                stompClient.subscribe("/topic/lobby/users", (message) => {
                    console.log("📨 Raw WebSocket message:", message);

                    let data;
                    if (typeof message.body === 'string') {
                        try {
                            data = JSON.parse(message.body);
                        } catch (error) {
                            console.error('Error parsing message body:', error);
                            return;
                        }
                    } else {
                        data = message;
                    }

                    console.log("📨 Parsed WebSocket data:", data);

                    if (data.type === "ONLINE_USERS_UPDATE") {
                        const usersData = data.users || [];

                        if (usersData.length > 0 && typeof usersData[0] === 'string') {
                            console.log("🔄 Converting user IDs to user objects");
                            const userObjects = usersData.map((userId: string) => ({
                                id: userId,
                                nickname: `User ${userId.slice(0, 8)}`,
                                email: '',
                                isOnline: true
                            }));
                            get().setOnlineUsers(userObjects);
                        } else {
                            get().setOnlineUsers(usersData);
                        }
                    }
                });

                stompClient.subscribe("/topic/lobby/chat", (message) => {
                    console.log("📨 Raw chat message:", message);

                    let data;
                    if (typeof message.body === 'string') {
                        try {
                            data = JSON.parse(message.body);
                        } catch (error) {
                            console.error('Error parsing chat message body:', error);
                            return;
                        }
                    } else {
                        data = message;
                    }

                    console.log("📨 Parsed chat data:", data);

                    const chatMessage: ChatMessage = {
                        id: data.id || Date.now().toString(),
                        userId: data.userId,
                        userName: data.userName || data.nickname,
                        message: data.message,
                        timestamp: data.timestamp || new Date().toISOString()
                    };
                    get().addChatMessage(chatMessage);
                });

                stompClient.subscribe("/user/queue/invite", (message) => {
                    if (message.type === "GAME_INVITE") {
                        const inviteData = message.data;
                        const invite: Invite = {
                            id: inviteData.id || Date.now().toString(),
                            tableId: inviteData.tableId,
                            tableName: inviteData.tableName,
                            hostId: inviteData.hostId,
                            hostName: inviteData.hostName,
                            invitedUserId: inviteData.invitedUserId,
                            expiresAt: new Date(Date.now() + (inviteData.expiresIn * 1000))
                        };
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
            (error) => {
                console.error("WebSocket connection error:", error);
            }
        );
    },

    disconnectWebSocket: () => {
        stompClient.disconnect();
    },

    sendChatMessage: (message: string) => {
        const user = get().user;
        if (!user) return;

        console.log("Sending message:", { userId: user.id, userName: user.nickname, message });

        stompClient.publish("/app/lobby/chat", {
            userId: user.id,
            userName: user.nickname,
            message,
            timestamp: new Date().toISOString(),
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
            let data;
            if (typeof message.body === 'string') {
                data = JSON.parse(message.body);
            } else {
                data = message;
            }

            if (data.type === "PLAYER_ACCEPTED") {
                console.log("Player accepted, refreshing table status");
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
                console.log("Table status update:", data.acceptedCount, "/", data.requiredCount);
                // TODO: Atualizar contagem de jogadores no UI
            }
        });

        stompClient.subscribe(`/topic/table/${tableId}/ready`, (message) => {
            console.log("Ready status:", message);
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
            console.log("Match started:", message);
            let data;
            if (typeof message.body === 'string') {
                data = JSON.parse(message.body);
            } else {
                data = message;
            }

            if (data.type === "MATCH_STARTED") {
                console.log("Game starting!", data.data);
                // TODO: Redirecionar para /game/${data.data.matchId}
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
        });

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
