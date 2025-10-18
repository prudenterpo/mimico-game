"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Input from "@/components/Input";
import { User } from "@/types";

export default function WaitingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const tableId = params.id as string;

    const {
        user,
        currentTable,
        currentTablePlayers,
        readyPlayers,
        tableChatMessages,
        toggleReady,
        leaveTable,
        sendTableChatMessage,
        clearTableChat,
    } = useStore();

    const [message, setMessage] = useState("");
    const isReady = user ? readyPlayers.includes(user.id) : false;
    const allReady = currentTablePlayers.length === 4 && readyPlayers.length === 4;

    // Auto-start quando todos estiverem prontos
    useEffect(() => {
        if (allReady) {
            setTimeout(() => {
                router.push(`/game/${tableId}`);
            }, 2000);
        }
    }, [allReady, tableId, router]);

    // Redirect se não estiver em uma mesa
    useEffect(() => {
        if (!currentTable) {
            router.push("/lobby");
        }
    }, [currentTable, router]);

    // Limpar chat ao sair
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

    // Dividir jogadores em times A e B (2 jogadores cada)
    const teamA = currentTablePlayers.slice(0, 2);
    const teamB = currentTablePlayers.slice(2, 4);

    // Criar slots vazios se necessário
    const createPlayerSlots = (team: User[], teamName: string) => {
        const slots: (User | null)[] = [...team];
        while (slots.length < 2) {
            slots.push(null);
        }
        return slots.map((player, index) => (
            <div key={`${teamName}-${index}`} className="text-center">
                {player ? (
                    <div className="space-y-2">
                        <Avatar
                            name={player.name}
                            size="lg"
                            showOnline={true}
                        />
                        <div>
                            <p className="font-medium text-sm">{player.name}</p>
                            {readyPlayers.includes(player.id) ? (
                                <Badge variant="success">Pronto</Badge>
                            ) : (
                                <Badge>Aguardando...</Badge>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div
                            className="w-16 h-16 mx-auto rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center"
                        >
                            <span className="text-gray-400 text-xs">Vazio</span>
                        </div>
                        <p className="text-gray-400 text-sm">Aguardando...</p>
                    </div>
                )}
            </div>
        ));
    };

    if (!currentTable) {
        return null; // Vai redirecionar
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <header className="bg-white shadow-sm border-b p-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                            {currentTable.name}
                        </h1>
                        <p className="text-gray-600">Sala de Espera</p>
                    </div>

                    {allReady && (
                        <div className="text-center">
                            <Badge variant="success" className="text-lg px-4 py-2">
                                Iniciando jogo em 2 segundos...
                            </Badge>
                        </div>
                    )}
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-6xl mx-auto p-6">
                <div className="grid lg:grid-cols-3 gap-6">

                    {/* Players Grid - 2/3 da tela */}
                    <div className="lg:col-span-2">
                        <Card>
                            <div className="p-6">
                                <h2 className="text-xl font-semibold mb-6 text-center">
                                    Jogadores ({currentTablePlayers.length}/4)
                                </h2>

                                {/* Time A */}
                                <div className="mb-8">
                                    <div className="flex items-center justify-center mb-4">
                                        <Badge
                                            variant="success"
                                            className="text-lg px-4 py-2"
                                        >
                                            Time A
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {createPlayerSlots(teamA, "A")}
                                    </div>
                                </div>

                                {/* VS Divider */}
                                <div className="text-center my-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-300" />
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span
                                                className="bg-white px-4 py-2 text-2xl font-bold rounded-full border"
                                                style={{ color: 'var(--color-accent)' }}
                                            >
                                                VS
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Time B */}
                                <div>
                                    <div className="flex items-center justify-center mb-4">
                                        <Badge className="text-lg px-4 py-2">
                                            Time B
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {createPlayerSlots(teamB, "B")}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Chat + Actions - 1/3 da tela */}
                    <div className="space-y-4">

                        {/* Actions */}
                        <Card>
                            <div className="p-4 space-y-3">
                                <Button
                                    onClick={toggleReady}
                                    variant={isReady ? "secondary" : "primary"}
                                    fullWidth
                                    className="text-lg py-3"
                                >
                                    {isReady ? "Pronto" : "Marcar como Pronto"}
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
                        </Card>

                        {/* Chat */}
                        <Card>
                            <div className="p-4">
                                <h3 className="font-semibold mb-3">Chat da Mesa</h3>

                                {/* Messages */}
                                <div className="h-64 overflow-y-auto border rounded p-3 mb-3 bg-gray-50">
                                    {tableChatMessages.length === 0 ? (
                                        <p className="text-gray-500 text-center text-sm">
                                            Nenhuma mensagem ainda...
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {tableChatMessages.map((msg, index) => (
                                                <div key={index} className="text-sm">
                                                    <span
                                                        className="font-medium"
                                                        style={{ color: 'var(--color-primary)' }}
                                                    >
                                                        {msg.userName}:
                                                    </span>
                                                    <span className="ml-2">{msg.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Message Input */}
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <Input
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Digite uma mensagem..."
                                        className="text-sm"
                                        maxLength={500}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!message.trim()}
                                        className="px-3"
                                    >
                                        Enviar
                                    </Button>
                                </form>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}