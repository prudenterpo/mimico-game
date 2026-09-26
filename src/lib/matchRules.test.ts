import { describe, expect, it } from "vitest";
import {
    chatAccess,
    deriveDiceValue,
    deriveRoundFeedback,
    normalizeMatchState,
    parseGuess,
    parseMatchEnded,
    parseWordCard,
    remainingSeconds,
    rollEligibility,
    wordEligibility,
} from "@/lib/matchRules";
import { AuthoritativeMatchState } from "@/types/gameplay";

const players = [
    { userId: "11111111-1111-4111-8111-111111111111", nickname: "Ana", team: "A" as const, playerOrder: 1 },
    { userId: "22222222-2222-4222-8222-222222222222", nickname: "Bia", team: "A" as const, playerOrder: 2 },
    { userId: "33333333-3333-4333-8333-333333333333", nickname: "Caio", team: "B" as const, playerOrder: 3 },
    { userId: "44444444-4444-4444-8444-444444444444", nickname: "Duda", team: "B" as const, playerOrder: 4 },
];

const match = (overrides: Partial<AuthoritativeMatchState> = {}): AuthoritativeMatchState => ({
    matchId: "66666666-6666-4666-8666-666666666666",
    tableId: "55555555-5555-4555-8555-555555555555",
    matchStatus: "MATCH_ACTIVE",
    roundState: "ROUND_WAITING_FOR_DICE",
    players,
    teamAPosition: 4,
    teamBPosition: 2,
    currentTeam: "A",
    currentMimePlayerId: players[0].userId,
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

describe("match rules", () => {
    it("normalizes the server match payload and ignores client-owned timer fields", () => {
        const state = normalizeMatchState({
            matchId: match().matchId,
            tableId: match().tableId,
            matchStatus: "MATCH_ACTIVE",
            roundState: "ROUND_GUESSING",
            players,
            teamAPosition: 11,
            teamBPosition: 3,
            currentTurn: "A",
            currentMimePlayerId: players[0].userId,
            timerEndsAt: "2026-09-26T12:01:00Z",
            isPaused: false,
            gamePhase: "mime",
        });

        expect(state?.currentTeam).toBe("A");
        expect(state?.isSpecialTile).toBe(true);
        expect(state?.timerEndsAt).toBe("2026-09-26T12:01:00Z");
    });

    it("lets only the current team roll and only the mime draw a card", () => {
        const dice = match();
        expect(rollEligibility(dice, players[1].userId).allowed).toBe(true);
        expect(rollEligibility(dice, players[2].userId).allowed).toBe(false);

        const words = match({ roundState: "ROUND_WAITING_FOR_WORD_SELECTION", teamAPosition: 11, isSpecialTile: true });
        expect(wordEligibility(words, players[0].userId).allowed).toBe(true);
        expect(wordEligibility(words, players[1].userId).reason).toMatch(/mimico/i);
        expect(wordEligibility(words, players[1].userId).allowed).toBe(false);
    });

    it("opens guesses to the partner, and to opponents only on a special tile", () => {
        const guessing = match({
            roundState: "ROUND_GUESSING",
            timerEndsAt: "2026-09-26T12:01:00Z",
            isSpecialTile: false,
        });
        expect(chatAccess(guessing, players[0].userId).mode).toBe("disabled");
        expect(chatAccess(guessing, players[1].userId).mode).toBe("guess");
        expect(chatAccess(guessing, players[2].userId).mode).toBe("disabled");
        expect(chatAccess(guessing, players[2].userId).reason).toMatch(/parceiro/i);

        const special = match({ ...guessing, isSpecialTile: true, teamAPosition: 11 });
        expect(chatAccess(special, players[2].userId).mode).toBe("guess");
        expect(chatAccess(special, players[2].userId).reason).toMatch(/rouba/i);
    });

    it("derives the visible countdown from the server deadline and pause snapshot", () => {
        const guessing = match({
            roundState: "ROUND_GUESSING",
            timerEndsAt: "2026-09-26T12:01:00.000Z",
        });
        expect(remainingSeconds(guessing, Date.parse("2026-09-26T12:00:15.000Z"))).toBe(45);

        const paused = match({
            ...guessing,
            isPaused: true,
            matchStatus: "MATCH_PAUSED",
            remainingRoundSecondsOnPause: 12,
        });
        expect(remainingSeconds(paused, Date.parse("2026-09-26T12:05:00.000Z"))).toBe(12);
        expect(remainingSeconds(match(), Date.now())).toBeNull();
    });

    it("reads dice, timeout, steal and win from server transitions", () => {
        const before = match({ teamAPosition: 8 });
        const afterRoll = match({ roundState: "ROUND_WAITING_FOR_WORD_SELECTION", teamAPosition: 13 });
        expect(deriveDiceValue(before, afterRoll)).toBe(5);

        const guessing = match({ roundState: "ROUND_GUESSING", currentTeam: "A" });
        const timedOut = match({ roundState: "ROUND_WAITING_FOR_DICE", currentTeam: "B", currentMimePlayerId: players[2].userId });
        expect(deriveRoundFeedback(guessing, timedOut, false)).toBe("TIMEOUT");

        const stolen = match({ roundState: "ROUND_WAITING_FOR_DICE", currentTeam: "B" });
        expect(deriveRoundFeedback(guessing, stolen, true)).toBe("STEAL");

        const kept = match({ roundState: "ROUND_WAITING_FOR_DICE", currentTeam: "A", currentMimePlayerId: players[1].userId });
        expect(deriveRoundFeedback(guessing, kept, true)).toBe("CORRECT_GUESS");

        const won = match({ matchStatus: "MATCH_FINISHED", winnerTeam: "A", finishReason: "BOARD_WIN", teamAPosition: 52 });
        expect(deriveRoundFeedback(before, won, false)).toBe("BOARD_WIN");
    });

    it("parses the private word card, guesses and match end envelope", () => {
        expect(parseWordCard({
            matchId: match().matchId,
            wordCard: [{ wordId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", text: "Gato", category: "EU_SOU" }],
        })[0]).toMatchObject({ text: "Gato", category: "EU_SOU" });

        expect(parseGuess({
            playerId: players[1].userId,
            playerName: "Bia",
            message: "gato",
            isCorrect: false,
            matchId: match().matchId,
            guesserTeam: "A",
        }, "2026-09-26T12:00:00Z")?.message).toBe("gato");

        expect(parseMatchEnded({
            type: "MATCH_ENDED",
            data: { winnerTeam: "A", finishReason: "BOARD_WIN" },
            occurredAt: "2026-09-26T12:02:00Z",
        })).toMatchObject({ winnerTeam: "A", finishReason: "BOARD_WIN" });
    });
});
