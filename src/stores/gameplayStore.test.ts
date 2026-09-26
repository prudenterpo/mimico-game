import { beforeEach, describe, expect, it, vi } from "vitest";
import { hostUser, matchId, tableId } from "@/test/fixtures/tableSetup";

const mocks = vi.hoisted(() => ({
    api: {
        setToken: vi.fn(),
        get: vi.fn(),
        post: vi.fn(),
    },
    stompClient: {
        setToken: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        subscribe: vi.fn(),
        publish: vi.fn(),
    },
}));

vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/lib/stomp", () => ({ stompClient: mocks.stompClient }));

import { useStore } from "./store";

const players = [
    { userId: hostUser.id, nickname: hostUser.nickname, team: "A", playerOrder: 1 },
    { userId: "22222222-2222-4222-8222-222222222222", nickname: "friend_2", team: "A", playerOrder: 2 },
    { userId: "33333333-3333-4333-8333-333333333333", nickname: "friend_3", team: "B", playerOrder: 3 },
    { userId: "44444444-4444-4444-8444-444444444444", nickname: "friend_4", team: "B", playerOrder: 4 },
];

const serverMatch = {
    matchId,
    tableId,
    matchStatus: "MATCH_ACTIVE",
    roundState: "ROUND_WAITING_FOR_DICE",
    players,
    teamAPosition: 4,
    teamBPosition: 1,
    currentTeam: "A",
    currentMimePlayerId: hostUser.id,
    timerEndsAt: null,
    isSpecialTile: false,
    isPaused: false,
    winnerTeam: null,
    finishReason: null,
};

describe("authoritative gameplay store", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.getState().clearMatchRuntime();
        useStore.setState({
            user: hostUser,
            currentTable: {
                id: tableId,
                name: "Mesa",
                hostId: hostUser.id,
                players: [],
                status: "TABLE_IN_MATCH",
                teamAssignments: [],
            },
        });
    });

    it("loads match state from the table and sends dice, word and guess commands", async () => {
        mocks.api.get.mockResolvedValue(serverMatch);
        const loaded = await useStore.getState().fetchMatchByTable(tableId);
        expect(mocks.api.get).toHaveBeenCalledWith(`/matches/table/${tableId}`);
        expect(loaded?.roundState).toBe("ROUND_WAITING_FOR_DICE");

        useStore.getState().rollDice();
        expect(mocks.stompClient.publish).toHaveBeenCalledWith(`/app/match/${matchId}/dice/roll`, {});

        useStore.setState({
            user: { ...hostUser, id: players[2].userId },
        });
        useStore.getState().rollDice();
        expect(mocks.stompClient.publish).toHaveBeenCalledTimes(1);

        useStore.setState({ user: hostUser });
        useStore.getState().applyAuthoritativeMatch({
            ...serverMatch,
            roundState: "ROUND_WAITING_FOR_WORD_SELECTION",
            teamAPosition: 9,
        });
        expect(useStore.getState().lastDiceValue).toBe(5);
        expect(useStore.getState().diceRequestPending).toBe(false);

        useStore.getState().drawWordCard();
        expect(mocks.stompClient.publish).toHaveBeenCalledWith(`/app/match/${matchId}/word/draw`, {});

        const subscriptions = new Map<string, (message: unknown) => void>();
        mocks.stompClient.subscribe.mockImplementation((destination: string, callback: (message: unknown) => void) => {
            subscriptions.set(destination, callback);
        });
        useStore.getState().connectToMatch(matchId);
        subscriptions.get(`/user/queue/match/${matchId}/word-card`)?.({
            type: "WORD_CARD_DRAWN",
            data: {
                matchId,
                wordCard: [
                    { wordId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", text: "Gato", category: "EU_SOU" },
                    { wordId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", text: "Correr", category: "EU_FACO" },
                    { wordId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", text: "Chave", category: "OBJETO" },
                ],
            },
            occurredAt: "2026-09-26T12:00:00Z",
        });

        useStore.getState().selectWord("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
        expect(mocks.stompClient.publish).toHaveBeenCalledWith(`/app/match/${matchId}/word/select`, {
            wordId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        });

        useStore.getState().applyAuthoritativeMatch({
            ...serverMatch,
            roundState: "ROUND_GUESSING",
            teamAPosition: 9,
            timerEndsAt: "2026-09-26T12:01:00Z",
            isSpecialTile: false,
        });
        useStore.setState({ user: { ...hostUser, id: players[1].userId } });
        useStore.getState().sendMatchChat("  gato  ");
        expect(mocks.stompClient.publish).toHaveBeenCalledWith(`/app/match/${matchId}/chat`, {
            playerId: players[1].userId,
            message: "gato",
        });

        useStore.setState({ user: hostUser });
        useStore.getState().sendMatchChat("gato");
        expect(mocks.stompClient.publish).toHaveBeenCalledTimes(4);
    });

    it("records timeout and win from match state without a local timer", () => {
        useStore.getState().applyAuthoritativeMatch({
            ...serverMatch,
            roundState: "ROUND_GUESSING",
            timerEndsAt: "2026-09-26T12:01:00Z",
        });
        useStore.getState().applyAuthoritativeMatch({
            ...serverMatch,
            roundState: "ROUND_WAITING_FOR_DICE",
            currentTeam: "B",
            currentMimePlayerId: players[2].userId,
            timerEndsAt: null,
        });
        expect(useStore.getState().roundFeedback).toBe("TIMEOUT");

        useStore.getState().applyAuthoritativeMatch({
            ...serverMatch,
            matchStatus: "MATCH_FINISHED",
            roundState: "ROUND_RESOLVED",
            teamAPosition: 52,
            winnerTeam: "A",
            finishReason: "BOARD_WIN",
        });
        expect(useStore.getState().matchEnded).toMatchObject({ winnerTeam: "A", finishReason: "BOARD_WIN" });
        expect(useStore.getState().roundFeedback).toBe("BOARD_WIN");
    });

    it("forfeits a paused match and clears state for rematch", async () => {
        useStore.getState().applyAuthoritativeMatch({
            ...serverMatch,
            matchStatus: "MATCH_PAUSED",
            isPaused: true,
            roundState: "ROUND_GUESSING",
            remainingRoundSecondsOnPause: 20,
        });
        mocks.api.post.mockResolvedValue("Match forfeited successfully");
        await useStore.getState().forfeitMatch();
        expect(mocks.api.post).toHaveBeenCalledWith(`/matches/${matchId}/forfeit`);

        useStore.getState().prepareRematch();
        expect(useStore.getState().matchState).toBeNull();
        expect(useStore.getState().isMatchStarted).toBe(false);
    });
});
