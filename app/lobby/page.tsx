"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Logo from "@/components/Logo";
import CreateTableModal from "@/components/CreateTableModal";
import UsersModal from "@/components/UsersModal";
import InviteToast from "@/components/InviteToast";
import { toast } from "sonner";
import { User, Invite } from "@/types";

export default function LobbyPage() {
    const router = useRouter();
    const {
        user,
        isAuthenticated,
        logout,
        onlineUsers,
        chatMessages,
        connectWebSocket,
        disconnectWebSocket,
        sendChatMessage,
        createTable,
        pendingInvite,
        acceptInvite,
        rejectInvite,
        currentTable
    } = useStore();

    const [message, setMessage] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const toastIdRef = useRef<string | number | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const handleCreateTable = (tableName: string, invitedUsers: User[]) => {
        const invitedUserIds = invitedUsers.map((u) => u.id);
        createTable(tableName, invitedUserIds);

        toast.success(`Mesa "${tableName}" criada!`, {
            description: `Convites enviados para ${invitedUsers.length} jogadores`,
        });
    };

    useEffect(() => {
        if (user && isAuthenticated) {
            connectWebSocket();
        }

        return () => {
            disconnectWebSocket();
        };
    }, [user, isAuthenticated, connectWebSocket, disconnectWebSocket]);

    useEffect(() => {
        if (currentTable && currentTable.status === "waiting") {
            router.push(`/table/${currentTable.id}`)
        }
    }, [currentTable, router]);

    useEffect(() => {
        if (pendingInvite) {
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }

            toastIdRef.current = toast(
                <InviteToast
                    invite={pendingInvite}
                    onAccept={() => {
                        console.log("Invite accepted!");
                        acceptInvite();
                        toast.dismiss(toastIdRef.current!);
                        toast.success("Convite aceito! Entrando na mesa...");
                    }}
                    onReject={() => {
                        console.log("Invite rejected!");
                        rejectInvite();
                        toast.dismiss(toastIdRef.current!);
                        toast.info("Convite recusado");
                    }}
                />,
                {
                    duration: 60000,
                    closeButton: false,
                }
            );
        }

        return () => {
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }
        };
    }, [pendingInvite, acceptInvite, rejectInvite]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const mockUser = user || {
        id: "1",
        name: "Você (Mock)",
        email: "voce@teste.com",
        isOnline: true,
    };

    const mockOnlineUsers = onlineUsers.length > 0 ? onlineUsers : [
        { id: "2", name: "João Silva", email: "joao@teste.com", isOnline: true },
        { id: "3", name: "Maria Santos", email: "maria@teste.com", isOnline: true },
        { id: "4", name: "Pedro Costa", email: "pedro@teste.com", isOnline: true },
        { id: "5", name: "Ana Lima", email: "ana@teste.com", isOnline: true },
    ];

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            sendChatMessage(message);
            setMessage("");
        }
    };

    const handleTestInvite = () => {
        const mockInvite: Invite = {
            tableId: "table-123",
            tableName: "Mesa do João",
            hostName: "João Silva",
            expiresAt: new Date(Date.now() + 60000),
        };

        useStore.getState().setPendingInvite(mockInvite);
        console.log("Mock invite created!");
    };

    return (
        <>
            <div className="h-screen flex flex-col" style={{ backgroundColor: "var(--color-background)" }}>
                <header className="bg-white shadow-sm px-4 py-3 flex-shrink-0">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Logo size="md" />
                            <div>
                                <h1 className="text-xl font-heading" style={{ color: "var(--color-accent)" }}>
                                    Mímico
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Avatar name={mockUser.name} size="sm" online />
                                <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--color-accent)" }}>
                                    {mockUser.name}
                                </span>
                            </div>
                            <Button variant="ghost" onClick={logout} className="text-sm">
                                Sair
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex max-w-6xl mx-auto w-full pt-4 pb-4 gap-4">
                    <div className="hidden md:flex w-72 bg-white rounded-lg shadow-lg flex-col">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>
                                    Online
                                </h2>
                                <Badge variant="teal">{mockOnlineUsers.length}</Badge>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4">
                            <div className="space-y-1">
                                {mockOnlineUsers.map((onlineUser) => (
                                    <div
                                        key={onlineUser.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <Avatar name={onlineUser.name} size="sm" online />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate text-sm" style={{ color: "var(--color-accent)" }}>
                                                {onlineUser.name}
                                            </p>
                                            <p className="text-xs text-gray-500">Online</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 space-y-2">
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                Criar Mesa
                            </Button>

                            <Button
                                variant="secondary"
                                fullWidth
                                onClick={handleTestInvite}
                                className="text-xs"
                            >
                                Simular Convite
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg">
                        <div className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-semibold" style={{ color: "var(--color-accent)" }}>
                                        Chat Global
                                    </h2>
                                    <p className="text-sm text-gray-500 hidden sm:block">
                                        Converse com outros jogadores online
                                    </p>
                                </div>

                                <div className="md:hidden">
                                    <button
                                        onClick={() => setShowUsersModal(true)}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <Badge variant="teal">{mockOnlineUsers.length} online</Badge>
                                        <span className="text-lg">👥</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="md:hidden px-4 pb-4">
                            <div className="flex gap-2">
                                <Button
                                    variant="primary"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex-1"
                                >
                                    Criar Mesa
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={handleTestInvite}
                                    className="flex-1 text-xs"
                                >
                                    Simular Convite
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatMessages.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                            <span className="text-2xl">💬</span>
                                        </div>
                                        <p className="text-gray-500 text-lg mb-2">Nenhuma mensagem ainda</p>
                                        <p className="text-gray-400 text-sm">
                                            Seja o primeiro a iniciar uma conversa!
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {chatMessages.map((msg) => (
                                        <div key={msg.id} className="flex gap-3">
                                            <Avatar name={msg.userName} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-sm" style={{ color: "var(--color-accent)" }}>
                                                        {msg.userName}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm leading-relaxed break-words" style={{ color: "var(--color-accent)" }}>
                                                    {msg.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </>
                            )}
                        </div>

                        <div className="p-4">
                            <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Digite uma mensagem..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
                                        style={{ color: "var(--color-accent)" }}
                                        maxLength={500}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={!message.trim()}
                                    variant="teal"
                                    className="px-4 sm:px-6"
                                >
                                    Enviar
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {isCreateModalOpen && (
                <CreateTableModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onlineUsers={mockOnlineUsers}
                    onCreateTable={handleCreateTable}
                />
            )}

            {showUsersModal && (
                <UsersModal
                    isOpen={showUsersModal}
                    onClose={() => setShowUsersModal(false)}
                    users={mockOnlineUsers}
                    onCreateTable={() => {
                        setShowUsersModal(false);
                        setIsCreateModalOpen(true);
                    }}
                />
            )}
        </>
    );
}