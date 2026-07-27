"use client";

import React, { useEffect, useState, useRef } from "react";

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
import Modal from "@/components/Modal";
import {ArrowLeftEndOnRectangleIcon} from "@heroicons/react/20/solid";
import AppHeader from "@/components/AppHeader";

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
        restoreAuth
    } = useStore();

    const [message, setMessage] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const toastIdRef = useRef<string | number | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const handleCreateTable = async (tableName: string, invitedUsers: User[]) => {
        const invitedUserIds = invitedUsers.map((u) => u.id);
        try {
            const table = await createTable(tableName, invitedUserIds);
            if (!table) return;

            toast.success(`Mesa "${table.name}" criada!`, {
                description: `Convites enviados para ${invitedUsers.length} jogadores`,
            });
            router.push(`/table/${table.id}`);
        } catch (error) {
            toast.error("Nao foi possivel criar a mesa.", {
                description: error instanceof Error ? error.message : "Tente novamente em instantes.",
            });
        }
    };

    useEffect(() => {
        if (user && isAuthenticated) {
            connectWebSocket();
        }

        return () => {
            disconnectWebSocket();
        };
    }, [user, isAuthenticated]);

    useEffect(() => {
        let cancelled = false;

        restoreAuth()
            .then((restored) => {
                if (cancelled) return;
                setAuthChecked(true);
                if (!restored && !useStore.getState().isAuthenticated) {
                    router.replace("/login");
                }
            })
            .catch(() => {
                if (cancelled) return;
                setAuthChecked(true);
                router.replace("/login");
            });

        return () => {
            cancelled = true;
        };
    }, [restoreAuth, router]);

    useEffect(() => {
        if (pendingInvite) {
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }

            toastIdRef.current = toast(
                <InviteToast
                    invite={pendingInvite}
                    onAccept={() => {
                        const tableId = acceptInvite();
                        toast.dismiss(toastIdRef.current!);
                        toast.success("Convite aceito! Entrando na mesa...");
                        if (tableId) router.push(`/table/${tableId}`);
                    }}
                    onReject={() => {
                        console.log("Invite rejected!");
                        rejectInvite();
                        toast.dismiss(toastIdRef.current!);
                        toast.info("Convite recusado");
                    }}
                />,
                { duration: 60000, closeButton: false }
            );
        }
        return () => {
            if (toastIdRef.current) toast.dismiss(toastIdRef.current);
        };
    }, [pendingInvite, acceptInvite, rejectInvite]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        const text = message.trim();
        if (!text) {
            setChatError("Digite uma mensagem para enviar.");
            return;
        }
        if (text.length > 500) {
            setChatError("A mensagem deve ter no máximo 500 caracteres.");
            return;
        }
        sendChatMessage(text);
        setMessage("");
        setChatError(null);
    };

    const filterOnlineUsers = (user: User | null) => {
        return onlineUsers.filter(u => u.id != user?.id);
    };

    if (!authChecked && !isAuthenticated) {
        return (
            <main
                className="min-h-screen flex items-center justify-center p-6"
                style={{ backgroundColor: "var(--color-background)", color: "var(--color-accent)" }}
            >
                <p className="text-lg font-semibold">Entrando no lobby...</p>
            </main>
        );
    }

    return (
        <>
            <div className="h-screen flex flex-col" style={{ backgroundColor: "var(--color-background)" }}>

                <AppHeader onLogout={() => setShowLogoutModal(true)} subTitle="Lobby" />

                <div className="flex-1 flex max-w-6xl mx-auto w-full pt-4 pb-4 gap-4">
                    <aside aria-label="Jogadores online" className="hidden md:flex w-72 bg-white rounded-lg shadow-lg flex-col">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>
                                    Online
                                </h2>
                                <Badge variant="teal">{onlineUsers.length}</Badge>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4">
                            <div className="space-y-1">
                                {onlineUsers.map((onlineUser, index) => {
                                    const safeKey = onlineUser?.id ? onlineUser.id : `user-${index}`;

                                    return (
                                        <div
                                            key={safeKey}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <Avatar nickname={onlineUser.nickname} size="sm" online/>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate text-sm"
                                                   style={{color: "var(--color-accent)"}}>
                                                    {onlineUser.nickname}
                                                </p>
                                                <p className="text-xs text-gray-500">Online</p>
                                            </div>
                                        </div>
                                    );
                                })}
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
                        </div>
                    </aside>

                    <main aria-label="Chat global do lobby" className="flex-1 flex flex-col bg-white rounded-lg shadow-lg">
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
                                        <Badge variant="teal">{onlineUsers.length} online</Badge>
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
                                    {chatMessages.map((msg) => {
                                        const isOwnMessage = msg.userId === user?.id;
                                        return (
                                            <div key={msg.id} className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                                <Avatar nickname={msg.userName} size="sm" />
                                                <div className={`flex-1 min-w-0 ${isOwnMessage ? 'text-right' : ''}`}>
                                                    <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                                    <span className="font-semibold text-sm" style={{ color: "var(--color-accent)" }}>
                                                        {isOwnMessage ? 'Você' : msg.userName}
                                                    </span>
                                                        <span className="text-xs text-gray-500">
                                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                                    </span>
                                                    </div>
                                                    <div className={`inline-block px-3 py-2 rounded-lg max-w-xs ${
                                                        isOwnMessage
                                                            ? 'bg-teal-100 text-teal-800 ml-auto'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        <p className="text-sm leading-relaxed break-words">
                                                            {msg.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                        onChange={(e) => {
                                            setMessage(e.target.value);
                                            if (chatError) setChatError(null);
                                        }}
                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
                                        style={{ color: "var(--color-accent)" }}
                                        maxLength={500}
                                        aria-describedby={chatError ? "lobby-chat-error" : undefined}
                                    />
                                    {chatError && (
                                        <p id="lobby-chat-error" className="mt-1 text-sm text-red-500">
                                            {chatError}
                                        </p>
                                    )}
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
                    </main>
                </div>
            </div>

            {isCreateModalOpen && (
                <CreateTableModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onlineUsers={filterOnlineUsers(user)}
                    onCreateTable={handleCreateTable}
                />
            )}

            {showUsersModal && (
                <UsersModal
                    isOpen={showUsersModal}
                    onClose={() => setShowUsersModal(false)}
                    users={onlineUsers}
                    onCreateTable={() => {
                        setShowUsersModal(false);
                        setIsCreateModalOpen(true);
                    }}
                />
            )}

            {showLogoutModal && (
                <Modal
                    isOpen={showLogoutModal}
                    onClose={() => setShowLogoutModal(false)}
                    title={
                        <div className="flex items-center gap-3">
                            <ArrowLeftEndOnRectangleIcon className="h-6 w-6 text-[var(--color-accent)]" />
                            <span className="font-heading text-2xl">Confirmar saída</span>
                        </div>
                    }
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    logout();
                                    router.push("/");
                                }}
                            >
                                Sair
                            </Button>
                        </>
                    }
                >
                    <h3 className="text-lg font-medium text-[var(--color-accent)]">
                        Tem certeza que deseja sair da sua conta?
                    </h3>
                </Modal>
            )}
        </>
    );
}
