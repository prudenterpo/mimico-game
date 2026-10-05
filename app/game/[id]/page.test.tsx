import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GamePage from "./page";
import { resetMediaStore } from "@/stores/mediaStore";
import { useStore } from "@/stores/store";
import { hostUser, matchId, tableId } from "@/test/fixtures/tableSetup";
import { AuthoritativeMatchState } from "@/types/gameplay";

const router = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ id: tableId }),
    useRouter: () => router,
}));

const players = [
    { userId: hostUser.id, nickname: "host_1", team: "A" as const, playerOrder: 1 },
    { userId: "22222222-2222-4222-8222-222222222222", nickname: "friend_2", team: "A" as const, playerOrder: 2 },
    { userId: "33333333-3333-4333-8333-333333333333", nickname: "friend_3", team: "B" as const, playerOrder: 3 },
    { userId: "44444444-4444-4444-8444-444444444444", nickname: "friend_4", team: "B" as const, playerOrder: 4 },
];

const baseMatch = (overrides: Partial<AuthoritativeMatchState> = {}): AuthoritativeMatchState => ({
    matchId,
    tableId,
    matchStatus: "MATCH_ACTIVE",
    roundState: "ROUND_WAITING_FOR_DICE",
    players,
    teamAPosition: 4,
    teamBPosition: 8,
    currentTeam: "A",
    currentMimePlayerId: hostUser.id,
    timerEndsAt: null,
    isSpecialTile: false,
    isPaused: false,
    pausedAt: null,
    pauseReason: null,
    disconnectedUserId: null,
    reconnectDeadline: null,
    remainingRoundSecondsOnPause: null,
    winnerTeam: null,
    finishReason: null,
    gamePhase: "dice",
    ...overrides,
});

describe("GamePage", () => {
    const rollDice = vi.fn();
    const drawWordCard = vi.fn();
    const selectWord = vi.fn();
    const sendMatchChat = vi.fn();
    const prepareRematch = vi.fn();

    afterEach(() => {
        resetMediaStore();
    });

    beforeEach(() => {
        resetMediaStore();
        vi.clearAllMocks();
        useStore.setState({
            user: hostUser,
            isAuthenticated: true,
            currentTable: {
                id: tableId,
                name: "Mesa",
                hostId: hostUser.id,
                players: [],
                status: "TABLE_IN_MATCH",
                teamAssignments: [],
            },
            matchState: baseMatch(),
            wordCard: [],
            selectedWordId: null,
            matchGuesses: [],
            matchError: null,
            roundFeedback: null,
            lastDiceValue: null,
            diceRequestPending: false,
            wordRequestPending: false,
            sorteio: null,
            matchEnded: null,
            restoreAuth: vi.fn().mockResolvedValue(true),
            connectWebSocket: vi.fn((onConnected?: () => void) => onConnected?.()),
            disconnectWebSocket: vi.fn(),
            fetchTable: vi.fn().mockResolvedValue(null),
            fetchMatchByTable: vi.fn().mockResolvedValue(baseMatch()),
            connectToMatch: vi.fn(),
            refreshMatchFromServer: vi.fn(),
            connectionStatus: "CONNECTED",
            isRestoring: false,
            restoreError: null,
            rollDice,
            drawWordCard,
            selectWord,
            sendMatchChat,
            selectSorteioPlayers: vi.fn(),
            rollSorteio: vi.fn(),
            forfeitMatch: vi.fn(),
            abandonMatch: vi.fn(),
            prepareRematch,
        });
    });

    it("asks the server to roll instead of choosing a local dice value", async () => {
        render(<GamePage />);
        fireEvent.click(await screen.findByRole("button", { name: "Jogar dado" }));
        expect(rollDice).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/Math/)).not.toBeInTheDocument();
    });

    it("keeps the word card private and shows the server timer while guessing", async () => {
        useStore.setState({
            user: {
                id: players[1].userId,
                nickname: players[1].nickname,
                email: "friend2@example.test",
            },
            matchState: baseMatch({
                roundState: "ROUND_GUESSING",
                timerEndsAt: new Date(Date.now() + 45000).toISOString(),
                isSpecialTile: true,
                teamAPosition: 11,
            }),
            wordCard: [{ wordId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", text: "Gato", category: "EU_SOU" }],
            selectedWordId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        });

        render(<GamePage />);
        expect(await screen.findByTestId("round-timer")).toHaveTextContent(/segundos/);
        expect(screen.getByTestId(`media-tile-${players[0].userId}`)).toHaveAttribute("data-primary", "true");
        expect(screen.getByTestId(`media-tile-${players[1].userId}`)).toHaveAttribute("data-primary", "false");
        expect(screen.queryByText("Gato")).not.toBeInTheDocument();
        expect(screen.getByLabelText("Mensagem da partida")).toBeEnabled();
        expect(screen.getAllByText(/Casa especial/i).length).toBeGreaterThan(0);
    });

    it("lets the mime select a server word and blocks their guess", async () => {
        useStore.setState({
            matchState: baseMatch({ roundState: "ROUND_WAITING_FOR_WORD_SELECTION", teamAPosition: 9 }),
            wordCard: [
                { wordId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", text: "Gato", category: "EU_SOU" },
            ],
        });
        render(<GamePage />);
        fireEvent.click(await screen.findByRole("button", { name: /Gato/i }));
        expect(selectWord).toHaveBeenCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    });

    it("offers rematch on the same table after a server win", async () => {
        useStore.setState({
            matchState: baseMatch({
                matchStatus: "MATCH_FINISHED",
                roundState: "ROUND_RESOLVED",
                teamAPosition: 52,
                winnerTeam: "A",
                finishReason: "BOARD_WIN",
            }),
            matchEnded: { winnerTeam: "A", finishReason: "BOARD_WIN", abandonedByNickname: null },
        });
        render(<GamePage />);
        expect(await screen.findByText("Time A venceu")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Jogar novamente" }));
        expect(prepareRematch).toHaveBeenCalled();
        expect(router.push).toHaveBeenCalledWith(`/table/${tableId}`);
    });

    it("names the disconnected player and blocks commands while the server match is paused", async () => {
        useStore.setState({
            matchState: baseMatch({
                matchStatus: "MATCH_PAUSED",
                isPaused: true,
                roundState: "ROUND_GUESSING",
                pauseReason: "PLAYER_DISCONNECTED",
                disconnectedUserId: players[2].userId,
                reconnectDeadline: new Date(Date.now() + 30000).toISOString(),
                remainingRoundSecondsOnPause: 12,
                timerEndsAt: new Date(Date.now() + 12000).toISOString(),
            }),
        });

        render(<GamePage />);
        expect(await screen.findByTestId("pause-banner")).toHaveTextContent("friend_3 desconectou");
        expect(screen.getByTestId("reconnect-countdown")).toHaveTextContent("segundos");
        expect(screen.getByLabelText("Mensagem da partida")).toBeDisabled();
        expect(screen.getByTestId("round-timer")).toHaveTextContent("12");
        expect(screen.queryByRole("button", { name: "Jogar dado" })).not.toBeInTheDocument();
    });

    it("says the opponent won when the server ends the match on reconnection forfeit", async () => {
        useStore.setState({
            matchState: baseMatch({
                matchStatus: "MATCH_FINISHED",
                roundState: "ROUND_RESOLVED",
                winnerTeam: "A",
                finishReason: "RECONNECTION_FORFEIT",
            }),
            matchEnded: { winnerTeam: "A", finishReason: "RECONNECTION_FORFEIT", abandonedByNickname: null },
        });

        render(<GamePage />);
        expect(await screen.findByText(/Vitoria por desconexao/)).toBeInTheDocument();
        expect(screen.getByText("Time A venceu")).toBeInTheDocument();
    });
});
