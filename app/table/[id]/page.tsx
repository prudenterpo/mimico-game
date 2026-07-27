"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import AppHeader from "@/components/AppHeader";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { TablePlayer, Team, TeamAssignment } from "@/types";

const statusLabels: Record<TablePlayer["status"], { label: string; variant: "teal" | "amber" | "error" | "warning" }> = {
    accepted: { label: "Aceito", variant: "teal" },
    pending: { label: "Pendente", variant: "amber" },
    rejected: { label: "Recusado", variant: "error" },
    expired: { label: "Expirado", variant: "warning" },
};

const teamLabel: Record<Team, string> = {
    A: "Time A",
    B: "Time B",
};

const getTeamPlayers = (assignments: TeamAssignment[], team: Team) =>
    assignments.find((assignment) => assignment.team === team)?.playerIds || [];

const getStartDisabledReason = (acceptedPlayers: TablePlayer[], assignments: TeamAssignment[]) => {
    if (acceptedPlayers.length !== 4) {
        return `A mesa precisa de 4 jogadores aceitos. Agora ha ${acceptedPlayers.length}/4.`;
    }

    const teamA = getTeamPlayers(assignments, "A");
    const teamB = getTeamPlayers(assignments, "B");
    const assignedPlayerIds = [...teamA, ...teamB];
    const uniqueAssignedPlayerIds = new Set(assignedPlayerIds);
    const acceptedPlayerIds = new Set(acceptedPlayers.map((player) => player.userId));

    if (teamA.length !== 2 || teamB.length !== 2) {
        return "Defina exatamente 2 jogadores no Time A e 2 no Time B.";
    }

    if (uniqueAssignedPlayerIds.size !== 4 || assignedPlayerIds.some((playerId) => !acceptedPlayerIds.has(playerId))) {
        return "Cada jogador aceito deve aparecer em um unico time.";
    }

    return null;
};

export default function TableSetupPage() {
    const params = useParams();
    const router = useRouter();
    const tableId = params.id as string;
    const chatEndRef = useRef<HTMLDivElement>(null);

    const {
        user,
        currentTable,
        currentTablePlayers,
        tableTeamAssignments,
        tableChatMessages,
        tableClosedReason,
        matchStartedId,
        restoreAuth,
        connectWebSocket,
        disconnectWebSocket,
        fetchTable,
        connectToTable,
        assignTeams,
        startMatch,
        leaveTable,
        sendTableChatMessage,
        clearTableChat,
        resetTableRuntimeState,
        logout,
    } = useStore();

    const [authChecked, setAuthChecked] = useState(false);
    const [message, setMessage] = useState("");
    const [chatError, setChatError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        let cancelled = false;

        restoreAuth()
            .then((restored) => {
                if (cancelled) return;
                setAuthChecked(true);
                if (!restored && !useStore.getState().isAuthenticated) {
                    router.replace("/login");
                    return;
                }

                connectWebSocket(() => {
                    fetchTable(tableId)
                        .then(() => connectToTable(tableId))
                        .catch((error) => {
                            if (!cancelled) {
                                setLoadError(error instanceof Error ? error.message : "Nao foi possivel carregar a mesa.");
                            }
                        });
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setAuthChecked(true);
                    router.replace("/login");
                }
            });

        return () => {
            cancelled = true;
            clearTableChat();
            disconnectWebSocket();
        };
    }, [clearTableChat, connectToTable, connectWebSocket, disconnectWebSocket, fetchTable, restoreAuth, router, tableId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [tableChatMessages]);

    useEffect(() => {
        if (matchStartedId) {
            router.push(`/game/${matchStartedId}`);
        }
    }, [matchStartedId, router]);

    const players = currentTablePlayers.length > 0 ? currentTablePlayers : currentTable?.players || [];
    const acceptedPlayers = players.filter((player) => player.status === "accepted");
    const isHost = Boolean(user && currentTable?.hostId === user.id);
    const disabledReason = useMemo(
        () => getStartDisabledReason(acceptedPlayers, tableTeamAssignments),
        [acceptedPlayers, tableTeamAssignments]
    );
    const canStart = isHost && !disabledReason && currentTable?.status !== "TABLE_CLOSED";

    const handleToggleTeam = (team: Team, playerId: string) => {
        if (!isHost) return;
        const currentTeamPlayerIds = getTeamPlayers(tableTeamAssignments, team);
        const nextIds = currentTeamPlayerIds.includes(playerId)
            ? currentTeamPlayerIds.filter((id) => id !== playerId)
            : currentTeamPlayerIds.length < 2
              ? [...currentTeamPlayerIds, playerId]
              : currentTeamPlayerIds;

        assignTeams(team, nextIds);
    };

    const handleSendMessage = (event: React.FormEvent) => {
        event.preventDefault();
        const text = message.trim();
        if (!text) {
            setChatError("Digite uma mensagem para enviar.");
            return;
        }
        if (text.length > 500) {
            setChatError("A mensagem deve ter no maximo 500 caracteres.");
            return;
        }
        sendTableChatMessage(text);
        setMessage("");
        setChatError(null);
    };

    const handleLeaveTable = () => {
        leaveTable();
        router.push("/lobby");
    };

    if (!authChecked || (!currentTable && !loadError)) {
        return (
            <main
                className="min-h-screen flex items-center justify-center p-6"
                style={{ backgroundColor: "var(--color-background)", color: "var(--color-accent)" }}
            >
                <p className="text-lg font-semibold">Carregando mesa...</p>
            </main>
        );
    }

    if (loadError) {
        return (
            <main className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--color-background)" }}>
                <section className="max-w-md rounded-2xl bg-white p-6 shadow-lg">
                    <h1 className="text-2xl font-heading text-[var(--color-accent)]">Mesa indisponivel</h1>
                    <p className="mt-2 text-sm text-gray-600">{loadError}</p>
                    <Button className="mt-5" onClick={() => router.push("/lobby")}>Voltar ao lobby</Button>
                </section>
            </main>
        );
    }

    if (tableClosedReason) {
        return (
            <main className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--color-background)" }}>
                <section className="max-w-md rounded-2xl bg-white p-6 shadow-lg">
                    <Badge variant="error">TABLE_CLOSED</Badge>
                    <h1 className="mt-4 text-2xl font-heading text-[var(--color-accent)]">Mesa encerrada</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Esta mesa foi fechada ({tableClosedReason}). Volte ao lobby para encontrar outra partida.
                    </p>
                    <Button
                        className="mt-5"
                        onClick={() => {
                            resetTableRuntimeState();
                            router.push("/lobby");
                        }}
                    >
                        Voltar ao lobby
                    </Button>
                </section>
            </main>
        );
    }

    if (!currentTable) return null;

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-background)" }}>
            <AppHeader
                title={currentTable.name}
                subTitle={isHost ? "Voce e o host da mesa" : "Setup da mesa"}
                iconLinkTo="/lobby"
                onLogout={() => setShowLogoutModal(true)}
            />

            <main className="flex-1 w-full max-w-6xl mx-auto p-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                <section className="space-y-4 min-w-0">
                    <div className="rounded-2xl bg-white p-4 shadow-lg">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-heading text-[var(--color-accent)]">Jogadores e convites</h2>
                                <p className="text-sm text-gray-600">A mesa inicia com 4 aceitos e times completos.</p>
                            </div>
                            <Badge variant={currentTable.status === "TABLE_READY_TO_START" ? "teal" : "amber"}>
                                {currentTable.status}
                            </Badge>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {players.map((player) => {
                                const status = statusLabels[player.status];
                                return (
                                    <article key={player.userId} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-[#FFF8E8] p-3">
                                        <Avatar nickname={player.nickname} size="sm" online={player.status === "accepted"} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-[var(--color-accent)]">
                                                {player.nickname}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {player.userId === currentTable.hostId ? "Host" : "Convidado"}
                                            </p>
                                        </div>
                                        <Badge variant={status.variant}>{status.label}</Badge>
                                    </article>
                                );
                            })}
                            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, index) => (
                                <article key={`empty-${index}`} className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500">
                                    Slot aguardando jogador
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {(["A", "B"] as Team[]).map((team) => {
                            const teamPlayerIds = getTeamPlayers(tableTeamAssignments, team);
                            return (
                                <section
                                    key={team}
                                    aria-label={teamLabel[team]}
                                    className={`rounded-2xl bg-white p-4 shadow-lg border-2 ${team === "A" ? "border-[#60BFB2]" : "border-[#FFB54A]"}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-heading text-[var(--color-accent)]">{teamLabel[team]}</h3>
                                        <Badge variant={team === "A" ? "teal" : "amber"}>{teamPlayerIds.length}/2</Badge>
                                    </div>

                                    <div className="mt-4 space-y-3">
                                        {acceptedPlayers.map((player) => {
                                            const isSelected = teamPlayerIds.includes(player.userId);
                                            const selectedElsewhere = tableTeamAssignments.some(
                                                (assignment) => assignment.team !== team && assignment.playerIds.includes(player.userId)
                                            );
                                            return (
                                                <button
                                                    key={`${team}-${player.userId}`}
                                                    type="button"
                                                    disabled={!isHost || (!isSelected && selectedElsewhere) || (!isSelected && teamPlayerIds.length >= 2)}
                                                    onClick={() => handleToggleTeam(team, player.userId)}
                                                    aria-pressed={isSelected}
                                                    className={`min-h-[44px] w-full rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-55 ${
                                                        isSelected ? "bg-[#FFF8E8] border-[var(--color-primary)]" : "bg-white border-gray-200"
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-3">
                                                        <Avatar nickname={player.nickname} size="sm" online />
                                                        <span className="flex-1 font-semibold text-[var(--color-accent)]">{player.nickname}</span>
                                                        <span className="text-xs font-medium text-gray-600">
                                                            {isSelected ? `${teamLabel[team]} selecionado` : selectedElsewhere ? "Em outro time" : "Selecionar"}
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {!isHost && (
                                        <p className="mt-3 text-sm text-gray-600">Somente o host pode editar os times.</p>
                                    )}
                                </section>
                            );
                        })}
                    </div>

                    <section className="rounded-2xl bg-white p-4 shadow-lg">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-heading text-[var(--color-accent)]">Inicio da partida</h2>
                                {isHost ? (
                                    <p className="text-sm text-gray-600">
                                        {disabledReason || "Mesa pronta. Inicie quando todos estiverem combinados."}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-600">Aguardando o host iniciar a partida.</p>
                                )}
                            </div>
                            {isHost && (
                                <Button
                                    onClick={startMatch}
                                    disabled={!canStart}
                                    variant="primary"
                                    aria-describedby={disabledReason ? "start-disabled-reason" : undefined}
                                >
                                    Iniciar partida
                                </Button>
                            )}
                        </div>
                        {isHost && disabledReason && (
                            <p id="start-disabled-reason" className="mt-3 text-sm font-medium text-[var(--color-accent)]">
                                {disabledReason}
                            </p>
                        )}
                        <Button onClick={handleLeaveTable} variant="ghost" className="mt-3 text-red-600 hover:bg-red-50">
                            Sair da mesa
                        </Button>
                    </section>
                </section>

                <aside aria-label="Chat da mesa" className="min-h-[520px] rounded-2xl bg-white shadow-lg flex flex-col min-w-0">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-xl font-heading text-[var(--color-accent)]">Chat da Mesa</h2>
                        <p className="text-sm text-gray-600">Separado do lobby e do futuro chat de palpites.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {tableChatMessages.length === 0 ? (
                            <div className="h-full min-h-40 flex items-center justify-center text-center text-sm text-gray-500">
                                Nenhuma mensagem da mesa ainda.
                            </div>
                        ) : (
                            tableChatMessages.map((msg) => (
                                <div key={msg.id} className="flex gap-3">
                                    <Avatar nickname={msg.userName} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-[var(--color-accent)]">{msg.userName}</span>
                                            <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="break-words text-sm text-gray-700">{msg.message}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="border-t border-gray-100 p-4">
                        <label htmlFor="table-chat-message" className="sr-only">Mensagem da mesa</label>
                        <div className="flex gap-2">
                            <input
                                id="table-chat-message"
                                value={message}
                                onChange={(event) => {
                                    setMessage(event.target.value);
                                    if (chatError) setChatError(null);
                                }}
                                maxLength={500}
                                placeholder="Mensagem para a mesa..."
                                className="min-h-[44px] flex-1 rounded-xl border border-gray-300 px-3 text-sm text-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                                aria-describedby={chatError ? "table-chat-error" : undefined}
                            />
                            <Button type="submit" variant="teal" disabled={!message.trim()}>Enviar</Button>
                        </div>
                        {chatError && <p id="table-chat-error" className="mt-2 text-sm text-red-500">{chatError}</p>}
                    </form>
                </aside>
            </main>

            {showLogoutModal && (
                <Modal
                    isOpen={showLogoutModal}
                    onClose={() => setShowLogoutModal(false)}
                    title="Confirmar saida"
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
                    <p className="text-[var(--color-accent)]">Tem certeza que deseja sair da sua conta?</p>
                </Modal>
            )}
        </div>
    );
}
