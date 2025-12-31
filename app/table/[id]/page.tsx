"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Logo from "@/components/Logo";
import Link from "next/link";
import { PlayerSlot } from "@/types";

export default function WaitingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const tableId = params.id as string;
    const chatEndRef = useRef<HTMLDivElement>(null);

    const {
        user,
        currentTable,
        tableSlots,
        tableChatMessages,
        isTableCancelled,
        toggleReady,
        leaveTable,
        sendTableChatMessage,
        clearTableChat,
    } = useStore();

    const [message, setMessage] = useState("");

    const mySlot = tableSlots.find(s => s.userId === user?.id);
    const isReady = mySlot?.status === 'ready';
    const acceptedOrReadyCount = tableSlots.filter(s => s.status === 'accepted' || s.status === 'ready').length;
    const allReady = tableSlots.length === 4 && tableSlots.every(s => s.status === 'ready');

    useEffect(() => {
        if (allReady) {
            setTimeout(() => {
                router.push(`/game/${tableId}`);
            }, 2000);
        }
    }, [allReady, tableId, router]);

    useEffect(() => {
        if (!currentTable) {
            router.push("/lobby");
        }
    }, [currentTable, router]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [tableChatMessages]);

    useEffect(() => {
        if (isTableCancelled) {
            router.push("/lobby");
        }
    }, [isTableCancelled]);

    useEffect(() => {
        return () => {
            clearTableChat();
        };
    }, [clearTableChat]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            sendTableChatMessage(message.trim());
            setMessage("");
        }
    };

    const handleLeaveTable = () => {
        leaveTable();
        router.push("/lobby");
    };

    const getStatusBadge = (status: PlayerSlot['status']) => {
        switch (status) {
            case 'ready':
                return <Badge variant="teal" className="mt-1">Pronto</Badge>;
            case 'accepted':
                return <Badge variant="amber" className="mt-1">Aguardando</Badge>;
            case 'pending':
                return <Badge variant="amber" className="mt-1">Convidado</Badge>;
            case 'rejected':
                return <Badge variant="amber" className="mt-1 bg-red-500">Recusou</Badge>;
            default:
                return null;
        }
    };

    const getSlotBorderColor = (status: PlayerSlot['status']) => {
        switch (status) {
            case 'ready':
                return 'border-teal-500';
            case 'accepted':
                return 'border-amber-500';
            case 'pending':
                return 'border-gray-300 border-dashed';
            case 'rejected':
                return 'border-red-500';
            default:
                return 'border-gray-300 border-dashed';
        }
    };

    const createPlayerSlots = (slots: PlayerSlot[], startIndex: number, teamName: string) => {
        const teamSlots: (PlayerSlot | null)[] = [
            slots[startIndex] || null,
            slots[startIndex + 1] || null
        ];

        return teamSlots.map((slot, index) => (
            <div key={`${teamName}-${index}`} className="text-center">
                {slot ? (
                    <div className="space-y-3">
                        <div className={`rounded-full p-1 border-2 ${getSlotBorderColor(slot.status)} inline-block`}>
                            <Avatar
                                nickname={slot.nickname}
                                size="lg"
                                online={slot.status !== 'rejected'}
                            />
                        </div>
                        <div>
                            <p className="font-medium text-sm" style={{ color: "var(--color-accent)" }}>
                                {slot.nickname}
                            </p>
                            {getStatusBadge(slot.status)}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                            <span className="text-gray-400 text-xs">Vazio</span>
                        </div>
                        <p className="text-gray-400 text-sm">Aguardando...</p>
                    </div>
                )}
            </div>
        ));
    };

    if (!currentTable) {
        return null;
    }

    return (
        <div className="h-screen flex flex-col" style={{ backgroundColor: "var(--color-background)" }}>
            <header className="bg-white shadow-sm px-4 py-3 flex-shrink-0">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/lobby" className="transition-opacity hover:opacity-80">
                            <Logo size="md" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-heading" style={{ color: "var(--color-accent)" }}>
                                {currentTable.name}
                            </h1>
                            <p className="text-sm text-gray-500">Sala de Espera</p>
                        </div>
                    </div>

                    {allReady && (
                        <Badge variant="teal" className="text-lg px-4 py-2">
                            Iniciando jogo...
                        </Badge>
                    )}
                </div>
            </header>

            <div className="flex-1 flex max-w-6xl mx-auto w-full p-4 gap-4">
                <div className="w-96 bg-white rounded-lg shadow-lg p-6">
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>
                            Jogadores ({acceptedOrReadyCount}/4)
                        </h2>
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center justify-center mb-4">
                            <Badge variant="teal" className="text-base px-4 py-2">
                                Time A
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            {createPlayerSlots(tableSlots, 0, "A")}
                        </div>
                    </div>

                    <div className="text-center my-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-4 py-2 text-xl font-bold rounded-full border" style={{ color: "var(--color-accent)" }}>
                                    VS
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center justify-center mb-4">
                            <Badge variant="amber" className="text-base px-4 py-2">
                                Time B
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            {createPlayerSlots(tableSlots, 2, "B")}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={toggleReady}
                            variant={isReady ? "teal" : "primary"}
                            fullWidth
                            disabled={mySlot?.status === 'pending' || mySlot?.status === 'rejected'}
                            className="py-3 text-lg font-semibold"
                        >
                            {isReady ? "Pronto!" : "Marcar como Pronto"}
                        </Button>

                        <Button
                            onClick={handleLeaveTable}
                            variant="ghost"
                            fullWidth
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            Sair da Mesa
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>
                            Chat da Mesa
                        </h3>
                        <p className="text-sm text-gray-500">
                            Converse com os outros jogadores
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {tableChatMessages.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                        <span className="text-2xl">💬</span>
                                    </div>
                                    <p className="text-gray-500 text-lg mb-2">Nenhuma mensagem ainda</p>
                                    <p className="text-gray-400 text-sm">
                                        Inicie uma conversa com sua equipe!
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {tableChatMessages.map((msg, index) => (
                                    <div key={index} className="flex gap-3">
                                        <Avatar nickname={msg.userName} size="sm" />
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

                    <div className="p-4 border-t">
                        <form onSubmit={handleSendMessage} className="flex gap-3">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Digite uma mensagem..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition-all duration-200 text-gray-800 placeholder-gray-500"
                                    maxLength={500}
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={!message.trim()}
                                variant="teal"
                                className="px-6"
                            >
                                Enviar
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}