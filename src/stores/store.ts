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

    // Lobby Initial State
    onlineUsers: [],
    chatMessages: [],

    // Lobby Actions
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

    // WebSocket Actions
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

                // Subscribe to online users updates
                stompClient.subscribe("/topic/lobby/users", (message) => {
                    const users = JSON.parse(message.body);
                    set({ onlineUsers: users });
                });

                // Subscribe to chat messages
                stompClient.subscribe("/topic/lobby/chat", (message) => {
                    const chatMessage = JSON.parse(message.body);
                    get().addChatMessage(chatMessage);
                });

                // Subscribe to table invites
                stompClient.subscribe("/user/queue/invite", (message) => {
                    const invite = JSON.parse(message.body);
                    set({ pendingInvite: invite });
                });

                // Subscribe to current table updates (waiting room)
                stompClient.subscribe("/user/queue/table/players", (message) => {
                    const players = JSON.parse(message.body);
                    get().setCurrentTablePlayers(players);
                });

                stompClient.subscribe("/user/queue/table/ready", (message) => {
                    const readyPlayerIds = JSON.parse(message.body);
                    get().setReadyPlayers(readyPlayerIds);
                });

                stompClient.subscribe("/user/queue/table/chat", (message) => {
                    const chatMessage = JSON.parse(message.body);
                    get().addTableChatMessage(chatMessage);
                });

                stompClient.subscribe("/user/queue/table/start", (message) => {
                    const { tableId } = JSON.parse(message.body);
                    // Router será chamado no useEffect da página
                    console.log("Game starting for table:", tableId);
                });

                // Notify server that user is online
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

    // Tables Initial State
    currentTable: null,
    pendingInvite: null,

    // Waiting Room Initial State
    currentTablePlayers: [],
    readyPlayers: [],
    tableChatMessages: [],

    // Tables Actions
    createTable: (tableName: string, invitedUserIds: string[]) => {
        const user = get().user;
        if (!user) return;

        stompClient.publish("/app/table/create", {
            tableName,
            hostId: user.id,
            invitedUserIds,
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
                hostId: "",
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

    // Waiting Room Actions
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

// ========================================
// MOCK TEMPORÁRIO - REMOVER EM PRODUÇÃO
// ========================================
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