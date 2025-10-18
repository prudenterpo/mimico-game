"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import CreateTableModal from "@/components/CreateTableModal";
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
    } = useStore();

    const [message, setMessage] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const toastIdRef = useRef<string | number | null>(null);

    const handleCreateTable = (tableName: string, invitedUsers: User[]) => {
        const invitedUserIds = invitedUsers.map((u) => u.id);
        createTable(tableName, invitedUserIds);

        toast.success(`Mesa "${tableName}" criada!`, {
            description: `Convites enviados para ${invitedUsers.length} jogadores`,
        });
    };

    // COMENTAR TEMPORARIAMENTE PARA TESTES
    // useEffect(() => {
    //   if (!isAuthenticated) {
    //     router.push("/login");
    //   }
    // }, [isAuthenticated, router]);

    // Conectar WebSocket
    useEffect(() => {
        if (user && isAuthenticated) {
            connectWebSocket();
        }

        return () => {
            disconnectWebSocket();
        };
    }, [user, isAuthenticated, connectWebSocket, disconnectWebSocket]);

    // Listener para convites
    useEffect(() => {
        console.log("useEffect de convites disparou. pendingInvite:", pendingInvite);

        if (pendingInvite) {
            console.log("Mostrando toast de convite...");

            // Fechar toast anterior se existir
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }

            // Mostrar novo toast
            toastIdRef.current = toast(
                <InviteToast
                    invite={pendingInvite}
                    onAccept={() => {
                        console.log("Convite aceito!");
                        acceptInvite();
                        toast.dismiss(toastIdRef.current!);
                        toast.success("Convite aceito! Entrando na mesa...");
                    }}
                    onReject={() => {
                        console.log("Convite recusado!");
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

    // MOCK DIRETO (temporário)
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

    const handleSendMessage = () => {
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
        console.log("Convite simulado criado:", mockInvite);
    };

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: "var(--color-background)" }}
        >
            {/* Header */}
            <header className="shadow-md" style={{ backgroundColor: "white" }}>
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "var(--color-primary)" }}
                        >
                            <span className="text-2xl">🐵</span>
                        </div>
                        <div>
                            <h1
                                className="text-2xl font-heading"
                                style={{ color: "var(--color-accent)" }}
                            >
                                Mímico
                            </h1>
                            <p
                                className="text-sm opacity-70"
                                style={{ color: "var(--color-accent)" }}
                            >
                                Salão de Jogos
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Avatar name={mockUser.name} size="sm" online />
                            <span
                                className="text-sm font-medium"
                                style={{ color: "var(--color-accent)" }}
                            >
                {mockUser.name}
              </span>
                        </div>
                        <Button variant="ghost" onClick={logout}>
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Online Users */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-card shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2
                                    className="text-xl font-heading"
                                    style={{ color: "var(--color-accent)" }}
                                >
                                    🟢 Usuários Online
                                </h2>
                                <Badge variant="success">{mockOnlineUsers.length} online</Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {mockOnlineUsers.map((onlineUser) => (
                                    <div
                                        key={onlineUser.id}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:shadow-md transition-shadow"
                                        style={{ backgroundColor: "var(--color-background)" }}
                                    >
                                        <Avatar name={onlineUser.name} size="md" online />
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="font-medium truncate"
                                                style={{ color: "var(--color-accent)" }}
                                            >
                                                {onlineUser.name}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Create Table Button */}
                        <div className="mt-6">
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                + Criar Mesa
                            </Button>
                        </div>

                        {/* BOTÃO DE TESTE - REMOVER EM PRODUÇÃO */}
                        <div className="mt-3">
                            <Button variant="secondary" fullWidth onClick={handleTestInvite}>
                                🧪 Simular Convite (Teste)
                            </Button>
                        </div>
                    </div>

                    {/* Chat Global */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-card shadow-lg p-6 h-[600px] flex flex-col">
                            <h2
                                className="text-xl font-heading mb-4"
                                style={{ color: "var(--color-accent)" }}
                            >
                                💬 Chat Global
                            </h2>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                                {chatMessages.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p
                                            className="text-sm opacity-70"
                                            style={{ color: "var(--color-accent)" }}
                                        >
                                            Nenhuma mensagem ainda
                                        </p>
                                    </div>
                                ) : (
                                    chatMessages.map((msg) => (
                                        <div key={msg.id} className="flex gap-2">
                                            <Avatar name={msg.userName} size="sm" />
                                            <div className="flex-1">
                                                <p
                                                    className="text-sm font-semibold"
                                                    style={{ color: "var(--color-accent)" }}
                                                >
                                                    {msg.userName}
                                                </p>
                                                <p
                                                    className="text-sm"
                                                    style={{ color: "var(--color-accent)" }}
                                                >
                                                    {msg.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Digite uma mensagem..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    className="flex-1 px-4 py-2 border-2 rounded-lg focus:outline-none"
                                    style={{
                                        borderColor: "var(--color-accent)",
                                        color: "var(--color-accent)",
                                    }}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="px-4 py-2 rounded-lg font-semibold text-white"
                                    style={{ backgroundColor: "var(--color-primary)" }}
                                >
                                    Enviar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <CreateTableModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onlineUsers={mockOnlineUsers}
                onCreateTable={handleCreateTable}
            />
        </div>
    );
}