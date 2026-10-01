"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftEndOnRectangleIcon } from "@heroicons/react/20/solid";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import MatchBoard from "@/components/game/MatchBoard";
import MatchMedia from "@/components/game/MatchMedia";
import PauseBanner from "@/components/game/PauseBanner";
import RoundClock from "@/components/game/RoundClock";
import Logo from "@/components/Logo";
import Modal from "@/components/Modal";
import {
    categoryLabel,
    chatAccess,
    connectionStatusAfterRestore,
    feedbackLabel,
    finishReasonLabel,
    playerName,
    rollEligibility,
    sorteioRollEligibility,
    sorteioSelectEligibility,
    wordEligibility,
} from "@/lib/matchRules";
import { useMediaStore } from "@/stores/mediaStore";
import { useStore } from "@/stores/store";
import { ApiClientError } from "@/lib/api";

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const tableId = params.id as string;
    const {
        user,
        currentTable,
        matchState,
        wordCard,
        selectedWordId,
        matchGuesses,
        matchError,
        roundFeedback,
        lastDiceValue,
        diceRequestPending,
        wordRequestPending,
        sorteio,
        matchEnded,
        restoreAuth,
        connectWebSocket,
        disconnectWebSocket,
        fetchTable,
        fetchMatchByTable,
        connectToMatch,
        rollDice,
        drawWordCard,
        selectWord,
        sendMatchChat,
        selectSorteioPlayers,
        rollSorteio,
        forfeitMatch,
        abandonMatch,
        prepareRematch,
        refreshMatchFromServer,
        connectionStatus,
        isRestoring,
        restoreError,
    } = useStore();

    const [loadError, setLoadError] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [playerAId, setPlayerAId] = useState("");
    const [playerBId, setPlayerBId] = useState("");
    const cancelledRef = useRef(false);

    const restoreMatch = useCallback(() => {
        useStore.setState({
            isRestoring: true,
            connectionStatus: "RESTORING_STATE",
            restoreError: null,
        });
        setLoadError(null);
        return fetchTable(tableId)
            .catch(() => undefined)
            .then(() => fetchMatchByTable(tableId))
            .then((match) => {
                if (cancelledRef.current) return;
                if (match) connectToMatch(match.matchId);
                const current = useStore.getState();
                useStore.setState({
                    isRestoring: false,
                    restoreError: null,
                    connectionStatus: connectionStatusAfterRestore(current.matchState, current.user?.id ?? null),
                });
            })
            .catch((error) => {
                if (cancelledRef.current) return;
                if (error instanceof ApiClientError && error.response.status === 404) {
                    useStore.setState({
                        isRestoring: false,
                        connectionStatus: "CONNECTED",
                        restoreError: null,
                    });
                    setLoadError("Nenhuma partida ativa nesta mesa.");
                    return;
                }
                const message = error instanceof Error ? error.message : "Nao foi possivel restaurar a partida.";
                useStore.setState({
                    isRestoring: false,
                    connectionStatus: "RESTORING_STATE",
                    restoreError: message,
                });
                setLoadError(message);
            });
    }, [connectToMatch, fetchMatchByTable, fetchTable, tableId]);

    useLayoutEffect(() => {
        cancelledRef.current = false;
        useStore.setState({
            isRestoring: true,
            connectionStatus: "RESTORING_STATE",
            restoreError: null,
        });

        restoreAuth()
            .then((restored) => {
                if (cancelledRef.current) return;
                if (!restored && !useStore.getState().isAuthenticated) {
                    router.replace("/login");
                    return;
                }
                connectWebSocket(() => {
                    if (!cancelledRef.current) void restoreMatch();
                });
            })
            .catch(() => {
                if (!cancelledRef.current) router.replace("/login");
            });

        return () => {
            cancelledRef.current = true;
            disconnectWebSocket();
        };
    }, [connectWebSocket, disconnectWebSocket, restoreAuth, restoreMatch, router]);

    const recovering = isRestoring
        || connectionStatus === "RECONNECTING"
        || connectionStatus === "RESTORING_STATE"
        || connectionStatus === "DISCONNECTED_FINAL";
    const memberKey = matchState?.players.map((player) => player.userId).join("|") ?? "";
    const mimeVideoRequired = Boolean(
        user?.id
        && matchState
        && matchState.roundState === "ROUND_GUESSING"
        && matchState.currentMimePlayerId === user.id
        && matchState.matchStatus !== "MATCH_FINISHED"
    );
    const serverMediaPaused = Boolean(matchState?.isPaused && matchState.pauseReason === "MIME_MEDIA_FAILED");

    useEffect(() => {
        const current = useStore.getState();
        const activeMatch = current.matchState;
        const selfId = current.user?.id;
        const stillRecovering = current.isRestoring
            || current.connectionStatus === "RECONNECTING"
            || current.connectionStatus === "RESTORING_STATE"
            || current.connectionStatus === "DISCONNECTED_FINAL";
        if (stillRecovering || !selfId || !activeMatch) return;
        void useMediaStore.getState().join({
            matchId: activeMatch.matchId,
            localUserId: selfId,
            remoteUserIds: activeMatch.players.map((player) => player.userId).filter((playerId) => playerId !== selfId),
        });
    }, [connectionStatus, isRestoring, matchState?.matchId, memberKey, user?.id]);

    useEffect(() => {
        useMediaStore.getState().setMimeVideoRequired(mimeVideoRequired);
    }, [mimeVideoRequired]);

    useEffect(() => {
        useMediaStore.getState().setServerMediaPaused(serverMediaPaused);
    }, [serverMediaPaused]);

    useEffect(() => () => {
        useMediaStore.getState().leave();
    }, []);

    if (recovering || !matchState) {
        const title = connectionStatus === "DISCONNECTED_FINAL"
            ? "Conexao encerrada"
            : connectionStatus === "RECONNECTING"
                ? "Reconectando..."
                : "Restaurando a partida...";
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--color-background)" }}>
                <div className="max-w-md text-center" role="status">
                    <p className="text-gray-800">{recovering ? title : (loadError || "Carregando partida...")}</p>
                    {(restoreError || (recovering && loadError)) && (
                        <p className="mt-2 text-sm text-red-600">{restoreError || loadError}</p>
                    )}
                    {(connectionStatus === "DISCONNECTED_FINAL" || restoreError) && (
                        <Button className="mt-4" variant="primary" onClick={() => { void restoreMatch(); }}>
                            Tentar de novo
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    const userId = user?.id ?? null;
    const roll = rollEligibility(matchState, userId);
    const word = wordEligibility(matchState, userId);
    const chat = chatAccess(matchState, userId);
    const hostId = currentTable?.hostId ?? null;
    const sorteioSelect = sorteioSelectEligibility(matchState, userId, hostId);
    const sorteioRoll = sorteioRollEligibility(matchState, sorteio, userId);
    const mimeName = playerName(matchState, matchState.currentMimePlayerId);
    const selectedWord = wordCard.find((entry) => entry.wordId === selectedWordId) || null;
    const isMime = Boolean(userId && userId === matchState.currentMimePlayerId);
    const finished = Boolean(matchEnded || matchState.matchStatus === "MATCH_FINISHED" || matchState.winnerTeam);
    const winner = matchEnded?.winnerTeam || matchState.winnerTeam;
    const finishReason = matchEnded?.finishReason || matchState.finishReason;
    const teamAPlayers = matchState.players.filter((player) => player.team === "A");
    const teamBPlayers = matchState.players.filter((player) => player.team === "B");
    const isHost = Boolean(userId && hostId && userId === hostId);

    const handleChat = (event: React.FormEvent) => {
        event.preventDefault();
        if (chat.mode === "disabled") return;
        sendMatchChat(message);
        setMessage("");
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-background)" }}>
            <header className="sticky top-0 z-20 bg-white shadow-sm px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link href="/lobby" className="shrink-0" aria-label="Ir para o lobby">
                            <Logo size="md" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-xl font-heading truncate" style={{ color: "var(--color-accent)" }}>
                                Mimico
                            </h1>
                            <p className="text-sm text-gray-600 truncate">
                                Time {matchState.currentTeam || "—"} · {mimeName} na mimica
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <RoundClock match={matchState} />
                        <Button variant="ghost" className="text-red-600" onClick={() => setShowLeaveModal(true)}>
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto w-full p-4 flex flex-col gap-4 lg:grid lg:grid-cols-3">
                <MatchMedia selfId={userId} mimeUserId={matchState.currentMimePlayerId} players={matchState.players} />
                <section className="order-2 lg:order-1 lg:col-span-2 bg-white rounded-lg shadow-lg p-4 sm:p-6" aria-label="Tabuleiro e placar">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>Tabuleiro</h2>
                        <div className="flex gap-4 text-sm">
                            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-teal-500" /> Time A: {matchState.teamAPosition}</span>
                            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /> Time B: {matchState.teamBPosition}</span>
                        </div>
                    </div>
                    <MatchBoard teamAPosition={matchState.teamAPosition} teamBPosition={matchState.teamBPosition} />
                    {matchState.isSpecialTile && matchState.roundState === "ROUND_GUESSING" && (
                        <p className="mt-3 text-sm text-amber-800">Casa especial. O outro time tambem pode chutar e roubar a vez.</p>
                    )}
                </section>

                <div className="order-1 lg:order-2 space-y-4">
                    <section className="bg-white rounded-lg shadow-lg p-4" aria-label="Acao da rodada">
                        {roundFeedback && (
                            <p role="status" className="mb-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
                                {feedbackLabel(roundFeedback)}
                            </p>
                        )}
                        {matchError && <p className="mb-3 text-sm text-red-600">{matchError}</p>}
                        {matchState.isPaused && (
                            <PauseBanner match={matchState} onDeadline={() => { void refreshMatchFromServer(); }} />
                        )}

                        {matchState.matchStatus === "MATCH_SETUP" && (
                            <div className="space-y-3">
                                <h3 className="font-semibold" style={{ color: "var(--color-accent)" }}>Sorteio inicial</h3>
                                <p className="text-sm text-gray-600">{sorteioSelect.allowed ? sorteioSelect.reason : sorteioRoll.reason}</p>
                                {sorteio?.tie && (
                                    <p role="status" className="text-sm text-amber-800">
                                        Empate {sorteio.tieRollA} a {sorteio.tieRollB}. Rolem de novo.
                                    </p>
                                )}
                                {sorteioSelect.allowed && (
                                    <form
                                        className="space-y-3"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            selectSorteioPlayers(playerAId, playerBId);
                                        }}
                                    >
                                        <label className="block text-sm" htmlFor="sorteio-player-a">Jogador do Time A</label>
                                        <select id="sorteio-player-a" className="w-full rounded-lg border px-3 py-3" value={playerAId} onChange={(event) => setPlayerAId(event.target.value)}>
                                            <option value="">Escolha</option>
                                            {teamAPlayers.map((player) => <option key={player.userId} value={player.userId}>{player.nickname}</option>)}
                                        </select>
                                        <label className="block text-sm" htmlFor="sorteio-player-b">Jogador do Time B</label>
                                        <select id="sorteio-player-b" className="w-full rounded-lg border px-3 py-3" value={playerBId} onChange={(event) => setPlayerBId(event.target.value)}>
                                            <option value="">Escolha</option>
                                            {teamBPlayers.map((player) => <option key={player.userId} value={player.userId}>{player.nickname}</option>)}
                                        </select>
                                        <Button type="submit" variant="primary" fullWidth disabled={!playerAId || !playerBId}>Confirmar jogadores</Button>
                                    </form>
                                )}
                                {sorteioRoll.allowed && (
                                    <Button type="button" variant="primary" fullWidth className="min-h-12" onClick={rollSorteio}>
                                        Rolar dado do sorteio
                                    </Button>
                                )}
                                {(sorteio?.rollA || sorteio?.rollB) && (
                                    <p className="text-sm text-gray-700">
                                        Time A: {sorteio.rollA ?? "—"} · Time B: {sorteio.rollB ?? "—"}
                                    </p>
                                )}
                            </div>
                        )}

                        {roll.allowed && (
                            <div className="text-center space-y-3">
                                <h3 className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>Sua equipe joga o dado</h3>
                                <p className="text-5xl" aria-hidden="true">{diceRequestPending ? "🎲" : "🎲"}</p>
                                {lastDiceValue && <p className="text-2xl font-bold">Avanco: {lastDiceValue}</p>}
                                <Button type="button" variant="primary" fullWidth className="min-h-12 text-lg" onClick={rollDice} disabled={diceRequestPending}>
                                    {diceRequestPending ? "Aguardando o servidor..." : "Jogar dado"}
                                </Button>
                            </div>
                        )}

                        {!roll.allowed && matchState.roundState === "ROUND_WAITING_FOR_DICE" && matchState.matchStatus === "MATCH_ACTIVE" && (
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold" style={{ color: "var(--color-accent)" }}>Aguardando o dado</h3>
                                {lastDiceValue && <p className="text-2xl font-bold">Avanco: {lastDiceValue}</p>}
                                <p className="text-sm text-gray-600">{roll.reason}</p>
                                <Button type="button" variant="primary" fullWidth disabled>Jogar dado</Button>
                            </div>
                        )}

                        {matchState.roundState === "ROUND_WAITING_FOR_WORD_SELECTION" && (
                            <div className="space-y-3">
                                <h3 className="font-semibold" style={{ color: "var(--color-accent)" }}>Carta de palavras</h3>
                                <p className="text-sm text-gray-600">{word.reason}</p>
                                {word.allowed && wordCard.length === 0 && (
                                    <Button type="button" variant="primary" fullWidth className="min-h-12" onClick={drawWordCard} disabled={wordRequestPending}>
                                        {wordRequestPending ? "Sorteando..." : "Sortear carta"}
                                    </Button>
                                )}
                                {word.allowed && wordCard.length > 0 && (
                                    <div className="grid gap-3">
                                        {wordCard.map((entry) => (
                                            <button
                                                key={entry.wordId}
                                                type="button"
                                                onClick={() => selectWord(entry.wordId)}
                                                className="min-h-12 rounded-lg border-2 border-teal-200 bg-teal-50 p-3 text-left"
                                            >
                                                <span className="block text-xs text-teal-700">{categoryLabel(entry.category)}</span>
                                                <span className="text-lg font-semibold">{entry.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {matchState.roundState === "ROUND_GUESSING" && (
                            <div className="space-y-2 text-center">
                                <h3 className="font-semibold" style={{ color: "var(--color-accent)" }}>{mimeName} fazendo mimica</h3>
                                {isMime && selectedWord && (
                                    <p className="rounded-lg bg-teal-50 p-3 text-teal-900">Sua palavra: {selectedWord.text}</p>
                                )}
                                {isMime && !selectedWord && (
                                    <p className="text-sm text-gray-600">A palavra ficou so com voce. Faca a mimica sem falar.</p>
                                )}
                                {!isMime && <p className="text-sm text-gray-600">A palavra e privada do mimico.</p>}
                            </div>
                        )}
                    </section>

                    <section className="bg-white rounded-lg shadow-lg p-4" aria-label="Jogadores">
                        <h3 className="font-semibold mb-3" style={{ color: "var(--color-accent)" }}>Jogadores</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {matchState.players.map((player) => (
                                <div key={player.userId} className="rounded-lg bg-gray-100 p-2 text-center">
                                    <Avatar nickname={player.nickname} size="sm" />
                                    <p className="mt-1 text-xs font-semibold truncate">{player.nickname}</p>
                                    <p className="text-xs text-gray-500">
                                        Time {player.team}
                                        {player.userId === matchState.currentMimePlayerId ? " · mimica" : ""}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-lg shadow-lg flex flex-col min-h-64" aria-label="Chat da partida">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold" style={{ color: "var(--color-accent)" }}>Chat da partida</h3>
                            <p className="text-xs text-gray-600">{chat.reason}</p>
                        </div>
                        <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-64">
                            {matchGuesses.length === 0 && <p className="text-sm text-gray-500">Nenhuma mensagem ainda.</p>}
                            {matchGuesses.map((guess) => (
                                <p key={guess.id} className="text-sm text-gray-800 break-words">
                                    <span className="font-semibold">{guess.playerName}: </span>
                                    {guess.isCorrect ? "acertou a palavra" : guess.message}
                                </p>
                            ))}
                        </div>
                        <form onSubmit={handleChat} className="p-4 border-t flex gap-2">
                            <label htmlFor="match-chat-message" className="sr-only">Mensagem da partida</label>
                            <input
                                id="match-chat-message"
                                value={message}
                                disabled={chat.mode === "disabled"}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder={chat.mode === "guess" ? "Sua resposta..." : "Digite uma mensagem..."}
                                className="flex-1 px-3 py-3 bg-gray-50 rounded-lg"
                            />
                            <Button type="submit" variant="teal" disabled={chat.mode === "disabled"}>Enviar</Button>
                        </form>
                    </section>

                    {matchState.isPaused && isHost && (
                        <Button type="button" variant="secondary" fullWidth onClick={() => forfeitMatch().catch((error) => setLoadError(error instanceof Error ? error.message : "Nao foi possivel encerrar."))}>
                            Encerrar partida pausada
                        </Button>
                    )}
                </div>
            </div>

            {showLeaveModal && (
                <Modal
                    isOpen={showLeaveModal}
                    onClose={() => setShowLeaveModal(false)}
                    title={<span className="flex items-center gap-2"><ArrowLeftEndOnRectangleIcon className="h-6 w-6 text-red-600" /> Sair da partida</span>}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>Cancelar</Button>
                            <Button variant="primary" className="bg-red-600" onClick={() => { abandonMatch(tableId); setShowLeaveModal(false); }}>Abandonar</Button>
                        </>
                    }
                >
                    <p className="text-gray-600">Abandonar encerra a partida para a mesa. O servidor define o time vencedor.</p>
                </Modal>
            )}

            {finished && (
                <Modal
                    isOpen={finished}
                    onClose={() => router.push("/lobby")}
                    title="Partida encerrada"
                    footer={
                        <div className="flex w-full flex-col gap-2 sm:flex-row">
                            <Button variant="secondary" fullWidth onClick={() => router.push("/lobby")}>Voltar ao lobby</Button>
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={() => {
                                    prepareRematch();
                                    router.push(`/table/${matchState.tableId}`);
                                }}
                            >
                                Jogar novamente
                            </Button>
                        </div>
                    }
                >
                    <div className="py-2 text-center" role="status">
                        <p className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
                            {winner ? `Time ${winner} venceu` : "Partida encerrada"}
                        </p>
                        <p className="mt-2 text-gray-700">{finishReasonLabel(finishReason)}</p>
                        {matchEnded?.abandonedByNickname && <p className="mt-1 text-gray-600">{matchEnded.abandonedByNickname} abandonou a partida.</p>}
                        <p className="mt-3 text-sm text-gray-600">Time A na casa {matchState.teamAPosition}. Time B na casa {matchState.teamBPosition}.</p>
                    </div>
                </Modal>
            )}
        </div>
    );
}
