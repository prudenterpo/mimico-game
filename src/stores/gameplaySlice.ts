import { api } from "@/lib/api";
import {
    chatAccess,
    deriveDiceValue,
    deriveRoundFeedback,
    emptySorteio,
    errorText,
    normalizeMatchState,
    parseGuess,
    parseMatchEnded,
    parseSorteioEvent,
    parseWordCard,
    readEnvelope,
    rollEligibility,
    sorteioRollEligibility,
    sorteioSelectEligibility,
    wordEligibility,
} from "@/lib/matchRules";
import { stompClient } from "@/lib/stomp";
import { GameTable, User } from "@/types";
import {
    AuthoritativeMatchState,
    MatchEndedView,
    MatchGuess,
    RoundFeedback,
    SorteioState,
    WordOption,
} from "@/types/gameplay";

const CHAT_MESSAGE_MAX_LENGTH = 500;

export interface GameplaySlice {
    matchState: AuthoritativeMatchState | null;
    wordCard: WordOption[];
    selectedWordId: string | null;
    matchGuesses: MatchGuess[];
    matchError: string | null;
    roundFeedback: RoundFeedback | null;
    lastDiceValue: number | null;
    diceRequestPending: boolean;
    wordRequestPending: boolean;
    sorteio: SorteioState | null;
    matchEnded: MatchEndedView | null;
    awaitingCorrectResolution: boolean;
    fetchMatchByTable: (tableId: string) => Promise<AuthoritativeMatchState | null>;
    connectToMatch: (matchId: string) => void;
    rollDice: () => void;
    drawWordCard: () => void;
    selectWord: (wordId: string) => void;
    sendMatchChat: (message: string) => void;
    selectSorteioPlayers: (playerAId: string, playerBId: string) => void;
    rollSorteio: () => void;
    forfeitMatch: () => Promise<void>;
    prepareRematch: () => void;
    clearMatchRuntime: () => void;
    applyAuthoritativeMatch: (raw: unknown) => void;
    applyMatchEnded: (message: unknown) => void;
}

type GameplayStore = GameplaySlice & {
    user: User | null;
    currentTable: GameTable | null;
    matchStartedId: string | null;
    isMatchStarted: boolean;
};

type StoreSet = (partial: Partial<GameplayStore> | ((state: GameplayStore) => Partial<GameplayStore>)) => void;
type StoreGet = () => GameplayStore;

const clearedMatch = {
    matchState: null,
    wordCard: [] as WordOption[],
    selectedWordId: null,
    matchGuesses: [] as MatchGuess[],
    matchError: null,
    roundFeedback: null,
    lastDiceValue: null,
    diceRequestPending: false,
    wordRequestPending: false,
    sorteio: null,
    matchEnded: null,
    awaitingCorrectResolution: false,
};

export const createGameplaySlice = (set: StoreSet, get: StoreGet): GameplaySlice => ({
    ...clearedMatch,

    fetchMatchByTable: async (tableId: string) => {
        const match = normalizeMatchState(await api.get(`/matches/table/${tableId}`));
        if (!match) return null;
        get().applyAuthoritativeMatch(match);
        return get().matchState;
    },

    connectToMatch: (matchId: string) => {
        const tableId = get().matchState?.tableId;

        stompClient.subscribe(`/topic/match/${matchId}/state`, (message) => {
            const envelope = readEnvelope(message);
            if (!envelope || envelope.type !== "MATCH_STATE_UPDATED" || !envelope.occurredAt) return;
            get().applyAuthoritativeMatch(envelope.data);
        });

        stompClient.subscribe(`/user/queue/match/${matchId}/word-card`, (message) => {
            const envelope = readEnvelope(message);
            if (!envelope || envelope.type !== "WORD_CARD_DRAWN" || !envelope.occurredAt) return;
            set({
                wordCard: parseWordCard(envelope.data),
                wordRequestPending: false,
                matchError: null,
            });
        });

        stompClient.subscribe(`/topic/match/${matchId}/chat`, (message) => {
            const envelope = readEnvelope(message);
            if (!envelope || envelope.type !== "GUESS_RECEIVED" || !envelope.occurredAt) return;
            const guess = parseGuess(envelope.data, envelope.occurredAt);
            if (!guess) return;
            set((state) => ({
                matchGuesses: [...state.matchGuesses, guess].slice(-50),
                awaitingCorrectResolution: guess.isCorrect || state.awaitingCorrectResolution,
            }));
        });

        stompClient.subscribe(`/topic/match/${matchId}/sorteio`, (message) => {
            const event = parseSorteioEvent(message);
            if (!event) return;
            const current = get().sorteio ?? emptySorteio();
            if (event.type === "SORTEIO_PLAYERS_SELECTED") {
                set({
                    sorteio: {
                        ...emptySorteio(),
                        playerAId: event.playerAId ?? null,
                        playerBId: event.playerBId ?? null,
                        playerANickname: event.playerANickname ?? null,
                        playerBNickname: event.playerBNickname ?? null,
                    },
                    matchError: null,
                });
                return;
            }
            if (event.type === "SORTEIO_ROLL") {
                set({
                    sorteio: {
                        ...current,
                        rollA: event.team === "A" ? event.value ?? current.rollA : current.rollA,
                        rollB: event.team === "B" ? event.value ?? current.rollB : current.rollB,
                        tie: false,
                    },
                });
                return;
            }
            if (event.type === "SORTEIO_TIE") {
                set({
                    sorteio: {
                        ...current,
                        rollA: null,
                        rollB: null,
                        tie: true,
                        tieRollA: event.rollA ?? null,
                        tieRollB: event.rollB ?? null,
                    },
                });
            }
        });

        if (tableId) {
            const onEnded = (message: unknown) => {
                if (readEnvelope(message)?.type === "TABLE_CLOSED") return;
                get().applyMatchEnded(message);
            };
            stompClient.subscribe(`/topic/table/${tableId}/closed`, onEnded);
            stompClient.subscribe(`/topic/table/${tableId}/match-ended`, onEnded);
        }

        const onCommandError = (message: unknown) => {
            const text = errorText(message);
            if (!text) return;
            set({ matchError: text, diceRequestPending: false, wordRequestPending: false });
        };
        stompClient.subscribe("/user/queue/error", onCommandError);
        stompClient.subscribe("/user/queue/errors", onCommandError);
    },

    rollDice: () => {
        const { matchState, user } = get();
        if (!matchState || !rollEligibility(matchState, user?.id ?? null).allowed) return;
        set({ diceRequestPending: true, matchError: null });
        stompClient.publish(`/app/match/${matchState.matchId}/dice/roll`, {});
    },

    drawWordCard: () => {
        const { matchState, user } = get();
        if (!matchState || !wordEligibility(matchState, user?.id ?? null).allowed) return;
        set({ wordRequestPending: true, matchError: null });
        stompClient.publish(`/app/match/${matchState.matchId}/word/draw`, {});
    },

    selectWord: (wordId: string) => {
        const { matchState, user, wordCard } = get();
        if (!matchState || !wordEligibility(matchState, user?.id ?? null).allowed) return;
        if (!wordCard.some((word) => word.wordId === wordId)) return;
        set({ selectedWordId: wordId, matchError: null });
        stompClient.publish(`/app/match/${matchState.matchId}/word/select`, { wordId });
    },

    sendMatchChat: (message: string) => {
        const { matchState, user } = get();
        const text = message.trim();
        if (!matchState || !user || !text || text.length > CHAT_MESSAGE_MAX_LENGTH) return;
        if (chatAccess(matchState, user.id).mode === "disabled") return;
        stompClient.publish(`/app/match/${matchState.matchId}/chat`, {
            playerId: user.id,
            message: text,
        });
    },

    selectSorteioPlayers: (playerAId: string, playerBId: string) => {
        const { matchState, user, currentTable } = get();
        if (!matchState) return;
        if (!sorteioSelectEligibility(matchState, user?.id ?? null, currentTable?.hostId ?? null).allowed) return;
        const teamOf = (playerId: string) => matchState.players.find((player) => player.userId === playerId)?.team;
        if (teamOf(playerAId) !== "A" || teamOf(playerBId) !== "B") return;
        stompClient.publish(`/app/match/${matchState.matchId}/sorteio/select`, { playerAId, playerBId });
    },

    rollSorteio: () => {
        const { matchState, user, sorteio } = get();
        if (!matchState || !sorteioRollEligibility(matchState, sorteio, user?.id ?? null).allowed) return;
        stompClient.publish(`/app/match/${matchState.matchId}/sorteio/roll`, {});
    },

    forfeitMatch: async () => {
        const matchId = get().matchState?.matchId;
        if (!matchId || !get().matchState?.isPaused) return;
        set({ matchError: null });
        await api.post(`/matches/${matchId}/forfeit`);
    },

    prepareRematch: () => {
        set({
            ...clearedMatch,
            matchStartedId: null,
            isMatchStarted: false,
        });
    },

    clearMatchRuntime: () => {
        set(clearedMatch);
    },

    applyAuthoritativeMatch: (raw: unknown) => {
        const next = normalizeMatchState(raw);
        if (!next) return;
        const previous = get().matchState;
        const feedback = deriveRoundFeedback(previous, next, get().awaitingCorrectResolution);
        const diceValue = deriveDiceValue(previous, next);
        const roundChanged = previous?.roundState !== next.roundState;
        const enteringWordSelection = previous?.roundState === "ROUND_WAITING_FOR_DICE"
            && next.roundState === "ROUND_WAITING_FOR_WORD_SELECTION";
        const keepPrivateCard = next.roundState === "ROUND_WAITING_FOR_WORD_SELECTION" || next.roundState === "ROUND_GUESSING";
        const finished = next.matchStatus === "MATCH_FINISHED" || Boolean(next.winnerTeam);

        set((state) => ({
            matchState: next,
            diceRequestPending: false,
            wordRequestPending: next.roundState === "ROUND_WAITING_FOR_WORD_SELECTION" ? state.wordRequestPending : false,
            lastDiceValue: diceValue ?? (roundChanged ? null : state.lastDiceValue),
            roundFeedback: feedback ?? (roundChanged ? null : state.roundFeedback),
            awaitingCorrectResolution: feedback ? false : state.awaitingCorrectResolution,
            wordCard: !keepPrivateCard || enteringWordSelection ? [] : state.wordCard,
            selectedWordId: next.roundState === "ROUND_GUESSING" ? state.selectedWordId : null,
            sorteio: next.matchStatus === "MATCH_SETUP" ? state.sorteio : null,
            matchEnded: finished
                ? {
                    winnerTeam: next.winnerTeam,
                    finishReason: next.finishReason,
                    abandonedByNickname: state.matchEnded?.abandonedByNickname ?? null,
                }
                : state.matchEnded,
        }));
    },

    applyMatchEnded: (message: unknown) => {
        const ended = parseMatchEnded(message);
        if (!ended) return;
        set((state) => ({
            matchEnded: ended,
            roundFeedback: ended.finishReason === "BOARD_WIN" ? "BOARD_WIN" : state.roundFeedback,
            matchState: state.matchState
                ? {
                    ...state.matchState,
                    matchStatus: "MATCH_FINISHED",
                    winnerTeam: ended.winnerTeam ?? state.matchState.winnerTeam,
                    finishReason: ended.finishReason ?? state.matchState.finishReason,
                    isPaused: false,
                }
                : state.matchState,
        }));
    },
});
