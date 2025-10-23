import { create } from "zustand";
import { User, AuthState, ChatMessage, GameTable, Invite } from "@/types";
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
                    if (message.type === "ONLINE_USERS_UPDATE") {
                        const users = message.users || [];
                        set({ onlineUsers: users });
                    }
                });

                stompClient.subscribe("/topic/lobby/chat", (message) => {
                    if (message.type === "LOBBY_CHAT_MESSAGE") {
                        const chatMessage: ChatMessage = {
                            id: message.id || Date.now().toString(),
                            userId: message.userId,
                            userName: message.userName,
                            message: message.message,
                            timestamp: message.timestamp
                        };
                        get().addChatMessage(chatMessage);
                    }
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

if (typeof window !== "undefined") {
    localStorage.setItem("token", "mock-token-12345");

    useStore.setState({
        user: {
            id: "1",
            nickname: "Você (Mock)",
            email: "voce@teste.com",
            isOnline: true,
        },
        token: "mock-token-12345",
        isAuthenticated: true,
        onlineUsers: [
            { id: "2", nickname: "João Silva", email: "joao@teste.com", isOnline: true },
            { id: "3", nickname: "Maria Santos", email: "maria@teste.com", isOnline: true },
            { id: "4", nickname: "Pedro Costa", email: "pedro@teste.com", isOnline: true },
            { id: "5", nickname: "Ana Lima", email: "ana@teste.com", isOnline: true },
            { id: "6", nickname: "Carlos Souza", email: "carlos@teste.com", isOnline: true },
        ],
    });
}