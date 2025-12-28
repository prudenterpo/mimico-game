import { create } from "zustand";
import { User, AuthState, ChatMessage, GameTable, Invite, UserProfileResponse, PlayerSlot } from "@/types";
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

    tableSlots: PlayerSlot[];
    tableChatMessages: ChatMessage[];
    connectToTable: (tableId: string) => void;

    createTable: (tableName: string, invitedUserIds: string[]) => void;
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
            tableSlots: [],
            tableChatMessages: [],
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

                    if (data.type === "ONLINE_USERS_UPDATE") {
                        const usersData = data.users || [];
                        if (usersData.length > 0 && typeof usersData[0] === 'string') {
                            const userObjects = usersData.map((odUserId: string) => ({
                                id: odUserId,
                                nickname: `User ${odUserId.slice(0, 8)}`,
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

                    const chatMessage: ChatMessage = {
                        id: data.id || Date.now().toString(),
                        userId: data.odUserId,
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

                stompClient.subscribe("/user/queue/table/chat", (message) => {
                    if (message.type === "TABLE_CHAT_MESSAGE") {
                        const chatMessage: ChatMessage = {
                            id: message.id || Date.now().toString(),
                            userId: message.odUserId,
                            userName: message.userName,
                            message: message.message,
                            timestamp: message.timestamp
                        };
                        get().addTableChatMessage(chatMessage);
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
            odUserId: user.id,
            userName: user.nickname,
            message,
            timestamp: new Date().toISOString(),
        });
    },

    currentTable: null,
    pendingInvite: null,
    tableSlots: [],
    tableChatMessages: [],

    createTable: (tableName: string, invitedUserIds: string[]) => {
        const user = get().user;
        if (!user) return;

        const tableId = crypto.randomUUID();

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
        console.log("🔌 connectToTable called:", tableId);
        console.log("🔌 STOMP connected?", stompClient.isConnected());

        if (!stompClient.isConnected()) {
            console.error("❌ Cannot subscribe - STOMP not connected");
            return;
        }

        stompClient.subscribe(`/topic/table/${tableId}/players`, (message) => {
            let data;
            if (typeof message.body === 'string') {
                data = JSON.parse(message.body);
            } else {
                data = message;
            }

            if (data.type === "TABLE_PLAYERS_UPDATE") {
                const slots: PlayerSlot[] = data.players.map((p: any) => ({
                    odUserId: p.userId,
                    nickname: p.nickname,
                    status: p.status
                }));
                get().setTableSlots(slots);
            }
        });

        console.log("✅ Subscribed to /topic/table/" + tableId + "/players");


        stompClient.subscribe(`/topic/table/${tableId}/match-started`, (message) => {
            let data;
            if (typeof message.body === 'string') {
                data = JSON.parse(message.body);
            } else {
                data = message;
            }

            if (data.type === "MATCH_STARTED") {
                window.location.href = `/game/${tableId}`;
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

        const currentSlot = get().tableSlots.find(s => s.odUserId === user.id);
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
        });
    },

    sendTableChatMessage: (message: string) => {
        const user = get().user;
        const currentTable = get().currentTable;
        if (!user || !currentTable) return;

        stompClient.publish("/app/table/chat", {
            tableId: currentTable.id,
            odUserId: user.id,
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