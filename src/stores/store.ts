import { create } from "zustand";
import { User, AuthState, ChatMessage, GameTable, Invite, UserProfileResponse, PlayerSlot } from "@/types";
import { api } from "@/lib/api";
import { parseStompMessage, stompClient } from "@/lib/stomp";

interface TableResponse {
    id: string;
    name: string;
    hostId: string;
    status: string;
}

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
    tableSlots: PlayerSlot[];
    tableChatMessages: ChatMessage[];
    isTableCancelled: boolean;
    isMatchStarted: boolean;
    subscribedTableId: string | null;

    connectToTable: (tableId: string) => void;
    createTable: (tableName: string, invitedUserIds: string[]) => Promise<void>;
    setPendingInvite: (invite: Invite | null) => void;
    acceptInvite: () => void;
    rejectInvite: () => void;
    setTableSlots: (slots: PlayerSlot[]) => void;
    toggleReady: () => void;
    leaveTable: () => void;
    sendTableChatMessage: (message: string) => void;
    addTableChatMessage: (message: ChatMessage) => void;
    clearTableChat: () => void;
    restoreAuth: () => Promise<void>;
    abandonMatch: (tableId: string) => void;
}

export const useStore = create<Store>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    login: async (email: string, password: string) => {
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

        localStorage.setItem("token", token);
    },

    register: async (nickname: string, email: string, password: string) => {
        await api.post("/auth/register", { nickname, email, password });
        await get().login(email, password);
    },

    logout: () => {
        get().disconnectWebSocket();
        api.setToken(null);
        stompClient.setToken(null);
        localStorage.removeItem("token");
        localStorage.clear();
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            onlineUsers: [],
            chatMessages: [],
            currentTable: null,
            pendingInvite: null,
            tableSlots: [],
            tableChatMessages: [],
            subscribedTableId: null,
        });
    },

    restoreAuth: async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            api.setToken(token);
            const userProfile = await api.get<UserProfileResponse>("/auth/me");

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
                    const data = parseStompMessage(message);
                    if (!data) return;

                    if (data.type === "ONLINE_USERS_UPDATE") {
                        const users: User[] = data.users.map((user: any) => ({
                            id: user.id,
                            nickname: user.nickname,
                            email: user.email,
                            isOnline: user.isOnline
                        }));
                        get().setOnlineUsers(users);
                    }
                });

                stompClient.subscribe("/topic/lobby/chat", (message) => {
                    const data = parseStompMessage(message);
                    if (!data) return;

                    const chatMessage: ChatMessage = {
                        id: data.timestamp || Date.now().toString(),
                        userId: data.userId,
                        userName: data.userName,
                        message: data.message,
                        timestamp: data.timestamp || new Date().toISOString()
                    };
                    get().addChatMessage(chatMessage);
                });

                stompClient.subscribe("/user/queue/invite", (message) => {
                    const data = parseStompMessage(message);
                    if (!data) return;

                    if (data.type === "GAME_INVITE") {
                        const inviteData = data.data;
                        const invite: Invite = {
                            id: inviteData.tableId,
                            tableId: inviteData.tableId,
                            tableName: inviteData.tableName,
                            hostId: inviteData.hostId,
                            hostName: "",
                            invitedUserId: inviteData.invitedUserId,
                            expiresAt: new Date(Date.now() + (inviteData.expiresIn * 1000))
                        };
                        set({ pendingInvite: invite });
                    }
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
    tableSlots: [],
    tableChatMessages: [],
    isTableCancelled: false,
    isMatchStarted: false,
    subscribedTableId: null,

    createTable: async (tableName: string, invitedUserIds: string[]) => {
        const user = get().user;
        if (!user) return;

        const response = await api.post<TableResponse>("/tables", { name: tableName });
        const tableId = response.id;

        get().connectToTable(tableId);

        set({
            currentTable: {
                id: tableId,
                name: tableName,
                hostId: user.id,
                players: [],
                status: "waiting",
                createdAt: new Date(),
            }
        });

        invitedUserIds.forEach(invitedUserId => {
            stompClient.publish("/app/table/invite", {
                tableId,
                tableName,
                invitedUserId: invitedUserId,
            });
        });
    },

    connectToTable: (tableId: string) => {
        if (get().subscribedTableId === tableId) {
            console.log("Already subscribed to table:", tableId);
            return;
        }

        if (!stompClient.isConnected()) {
            console.error("Cannot subscribe - STOMP not connected");
            return;
        }

        set({ subscribedTableId: tableId });

        stompClient.subscribe(`/topic/table/${tableId}/players`, (message) => {
            const data = parseStompMessage(message);
            if (!data) return;

            if (data.type === "TABLE_PLAYERS_UPDATE") {
                const slots: PlayerSlot[] = data.players.map((p: any) => ({
                    userId: p.userId,
                    nickname: p.nickname,
                    status: p.status
                }));
                get().setTableSlots(slots);
            }
        });

        stompClient.subscribe(`/topic/table/${tableId}/match-started`, (message) => {
            const data = parseStompMessage(message);
            if (!data) return;

            if (data.type === "MATCH_STARTED") {
                set({ isMatchStarted: true });
            }
        });

        stompClient.subscribe(`/topic/table/${tableId}/cancelled`, (message) => {
            const data = parseStompMessage(message);
            if (!data) return;

            if (data.type === "TABLE_CANCELLED") {
                set({
                    currentTable: null,
                    tableSlots: [],
                    tableChatMessages: [],
                    isTableCancelled: true,
                    subscribedTableId: null,
                });
            }
        });

        console.log("Subscribed to table:", tableId);
    },

    setPendingInvite: (invite: Invite | null) => {
        set({ pendingInvite: invite });
    },

    acceptInvite: () => {
        const invite = get().pendingInvite;
        if (!invite) return;

        get().connectToTable(invite.tableId);

        setTimeout(() => {
            stompClient.publish("/app/table/invite/accept", {
                tableId: invite.tableId,
            });
        }, 100);

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

    setTableSlots: (slots: PlayerSlot[]) => {
        set({ tableSlots: slots });
    },

    toggleReady: () => {
        const user = get().user;
        const currentTable = get().currentTable;
        if (!user || !currentTable) return;

        const currentSlot = get().tableSlots.find(s => s.userId === user.id);
        const isCurrentlyReady = currentSlot?.status === 'ready';

        stompClient.publish("/app/table/ready", {
            tableId: currentTable.id,
            odUserId: user.id,
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
            tableSlots: [],
            tableChatMessages: [],
            subscribedTableId: null,
        });
    },

    //todo: still need be implemented
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

    //todo: still need be implemented
    addTableChatMessage: (message: ChatMessage) => {
        set((state) => ({
            tableChatMessages: [...state.tableChatMessages, message],
        }));
    },

    clearTableChat: () => {
        set({ tableChatMessages: [] });
    },

    abandonMatch: (tableId: string) => {
        if (!tableId) return;

        stompClient.publish("/app/match/abandon", {
            tableId: tableId,
        });
    },
}));