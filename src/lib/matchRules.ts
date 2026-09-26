import { Team } from "@/types";
import {
    ActionAccess,
    AuthoritativeMatchState,
    ChatAccess,
    ConnectionStatus,
    GameRoundState,
    MatchEndedView,
    MatchGuess,
    MatchPlayerState,
    MatchStatus,
    RoundFeedback,
    SorteioState,
    WordOption,
} from "@/types/gameplay";

export const BOARD_END = 52;
export const ROUND_SECONDS = 60;
export const SPECIAL_TILES = [5, 11, 17, 23, 29, 35, 40, 44, 48, 51] as const;

const MATCH_STATUSES = new Set<MatchStatus>(["MATCH_SETUP", "MATCH_ACTIVE", "MATCH_PAUSED", "MATCH_FINISHED"]);
const ROUND_STATES = new Set<GameRoundState>([
    "ROUND_WAITING_FOR_DICE",
    "ROUND_WAITING_FOR_WORD_SELECTION",
    "ROUND_GUESSING",
    "ROUND_RESOLVED",
]);

const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value : null;

const asTeam = (value: unknown): Team | null => (value === "A" || value === "B" ? value : null);

const asInt = (value: unknown, fallback: number | null = null): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
        return Math.trunc(Number(value));
    }
    return fallback;
};

const clampPosition = (value: unknown): number => {
    const parsed = asInt(value, 0) ?? 0;
    return Math.min(BOARD_END, Math.max(0, parsed));
};

const normalizePlayer = (value: unknown): MatchPlayerState | null => {
    const raw = asRecord(value);
    if (!raw) return null;
    const userId = asString(raw.userId);
    const nickname = asString(raw.nickname);
    const team = asTeam(raw.team);
    const playerOrder = asInt(raw.playerOrder);
    if (!userId || !nickname || !team || playerOrder === null) return null;
    return { userId, nickname, team, playerOrder };
};

export const isSpecialTile = (tile: number): boolean =>
    SPECIAL_TILES.includes(tile as (typeof SPECIAL_TILES)[number]);

export const currentTeamPosition = (state: AuthoritativeMatchState): number =>
    state.currentTeam === "B" ? state.teamBPosition : state.teamAPosition;

export const normalizeMatchState = (input: unknown): AuthoritativeMatchState | null => {
    const raw = asRecord(input);
    if (!raw) return null;

    const matchId = asString(raw.matchId);
    const tableId = asString(raw.tableId);
    const matchStatus = asString(raw.matchStatus);
    if (!matchId || !tableId || !matchStatus || !MATCH_STATUSES.has(matchStatus as MatchStatus)) return null;

    const roundRaw = raw.roundState;
    const roundState = roundRaw == null
        ? null
        : typeof roundRaw === "string" && ROUND_STATES.has(roundRaw as GameRoundState)
            ? roundRaw as GameRoundState
            : null;

    const players = Array.isArray(raw.players)
        ? raw.players.map(normalizePlayer).filter((player): player is MatchPlayerState => Boolean(player))
        : [];
    const currentTeam = asTeam(raw.currentTeam) ?? asTeam(raw.currentTurn);
    const teamAPosition = clampPosition(raw.teamAPosition);
    const teamBPosition = clampPosition(raw.teamBPosition);
    const landingTile = currentTeam === "B" ? teamBPosition : teamAPosition;
    const cardPhase = roundState === "ROUND_WAITING_FOR_WORD_SELECTION" || roundState === "ROUND_GUESSING";

    const pausedSeconds = raw.remainingRoundSecondsOnPause == null
        ? null
        : asInt(raw.remainingRoundSecondsOnPause);

    return {
        matchId,
        tableId,
        matchStatus: matchStatus as MatchStatus,
        roundState,
        players,
        teamAPosition,
        teamBPosition,
        currentTeam,
        currentMimePlayerId: asString(raw.currentMimePlayerId),
        timerEndsAt: asString(raw.timerEndsAt),
        isSpecialTile: raw.isSpecialTile === true || (cardPhase && isSpecialTile(landingTile)),
        isPaused: raw.isPaused === true || matchStatus === "MATCH_PAUSED",
        pausedAt: asString(raw.pausedAt),
        pauseReason: asString(raw.pauseReason),
        disconnectedUserId: asString(raw.disconnectedUserId),
        reconnectDeadline: asString(raw.reconnectDeadline),
        remainingRoundSecondsOnPause: pausedSeconds,
        winnerTeam: asTeam(raw.winnerTeam),
        finishReason: asString(raw.finishReason),
        gamePhase: asString(raw.gamePhase),
    };
};

export const readEnvelope = (message: unknown): { type: string; data: Record<string, unknown>; occurredAt: string | null } | null => {
    const raw = asRecord(message);
    if (!raw) return null;
    const type = asString(raw.type);
    const data = asRecord(raw.data);
    if (!type || !data) return null;
    return {
        type,
        data,
        occurredAt: asString(raw.occurredAt),
    };
};

export const errorText = (message: unknown): string | null => {
    const raw = asRecord(message);
    if (!raw) return null;
    const direct = asString(raw.message);
    if (direct) return direct;
    const data = asRecord(raw.data);
    return data ? asString(data.message) : null;
};

export const parseWordCard = (data: unknown): WordOption[] => {
    const raw = asRecord(data);
    if (!raw) return [];
    const list = Array.isArray(raw.wordCard) ? raw.wordCard : Array.isArray(raw.words) ? raw.words : [];
    return list.flatMap((entry) => {
        const word = asRecord(entry);
        if (!word) return [];
        const wordId = asString(word.wordId);
        const text = asString(word.text);
        const category = asString(word.category);
        if (!wordId || !text || !category) return [];
        return [{ wordId, text, category }];
    });
};

export const parseGuess = (data: unknown, occurredAt: string): MatchGuess | null => {
    const raw = asRecord(data);
    if (!raw) return null;
    const playerId = asString(raw.playerId);
    const message = asString(raw.message);
    if (!playerId || !message) return null;
    const playerName = asString(raw.playerName) || "Jogador";
    return {
        id: `${playerId}-${occurredAt}-${message}`,
        playerId,
        playerName,
        message,
        isCorrect: raw.isCorrect === true,
        guesserTeam: asTeam(raw.guesserTeam),
        occurredAt,
    };
};

export const parseMatchEnded = (message: unknown): MatchEndedView | null => {
    const envelope = readEnvelope(message);
    if (!envelope || envelope.type !== "MATCH_ENDED") return null;
    return {
        winnerTeam: asTeam(envelope.data.winnerTeam),
        finishReason: asString(envelope.data.finishReason) || asString(envelope.data.reason),
        abandonedByNickname: asString(envelope.data.abandonedByNickname),
    };
};

export interface SorteioEvent {
    type: "SORTEIO_PLAYERS_SELECTED" | "SORTEIO_ROLL" | "SORTEIO_TIE" | "SORTEIO_COMPLETE";
    playerAId?: string;
    playerBId?: string;
    playerANickname?: string;
    playerBNickname?: string;
    playerId?: string;
    team?: Team;
    value?: number;
    rollA?: number;
    rollB?: number;
    winnerTeam?: Team;
}

export const parseSorteioEvent = (message: unknown): SorteioEvent | null => {
    const raw = asRecord(message);
    if (!raw) return null;
    const type = asString(raw.type);
    if (type !== "SORTEIO_PLAYERS_SELECTED" && type !== "SORTEIO_ROLL" && type !== "SORTEIO_TIE" && type !== "SORTEIO_COMPLETE") {
        return null;
    }
    return {
        type,
        playerAId: asString(raw.playerAId) || undefined,
        playerBId: asString(raw.playerBId) || undefined,
        playerANickname: asString(raw.playerANickname) || undefined,
        playerBNickname: asString(raw.playerBNickname) || undefined,
        playerId: asString(raw.playerId) || undefined,
        team: asTeam(raw.team) || undefined,
        value: asInt(raw.value) ?? undefined,
        rollA: asInt(raw.rollA) ?? undefined,
        rollB: asInt(raw.rollB) ?? undefined,
        winnerTeam: asTeam(raw.winnerTeam) || undefined,
    };
};

export const emptySorteio = (): SorteioState => ({
    playerAId: null,
    playerBId: null,
    playerANickname: null,
    playerBNickname: null,
    rollA: null,
    rollB: null,
    tie: false,
    tieRollA: null,
    tieRollB: null,
});

const playerOnTeam = (state: AuthoritativeMatchState, userId: string | null): MatchPlayerState | null => {
    if (!userId) return null;
    return state.players.find((player) => player.userId === userId) || null;
};

const matchBlocked = (state: AuthoritativeMatchState): string | null => {
    if (state.matchStatus === "MATCH_FINISHED" || state.winnerTeam) return "A partida ja terminou.";
    if (state.isPaused || state.matchStatus === "MATCH_PAUSED") return "A partida esta pausada.";
    return null;
};

export const rollEligibility = (state: AuthoritativeMatchState, userId: string | null): ActionAccess => {
    const blocked = matchBlocked(state);
    if (blocked) return { allowed: false, reason: blocked };
    if (state.matchStatus === "MATCH_SETUP" || !state.currentTeam) {
        return { allowed: false, reason: "O sorteio inicial ainda nao terminou." };
    }
    if (state.roundState !== "ROUND_WAITING_FOR_DICE") {
        return { allowed: false, reason: "O dado so pode ser jogado no inicio da rodada." };
    }
    const player = playerOnTeam(state, userId);
    if (!player) return { allowed: false, reason: "Voce nao esta nesta partida." };
    if (player.team !== state.currentTeam) {
        return { allowed: false, reason: "Aguarde o time da vez jogar o dado." };
    }
    return { allowed: true, reason: "Sua equipe pode jogar o dado." };
};

export const wordEligibility = (state: AuthoritativeMatchState, userId: string | null): ActionAccess => {
    const blocked = matchBlocked(state);
    if (blocked) return { allowed: false, reason: blocked };
    if (state.roundState !== "ROUND_WAITING_FOR_WORD_SELECTION") {
        return { allowed: false, reason: "A carta ainda nao pode ser sorteada." };
    }
    if (!userId || userId !== state.currentMimePlayerId) {
        return { allowed: false, reason: "Aguarde o mimico sortear e escolher a palavra." };
    }
    return { allowed: true, reason: "Sorteie a carta e escolha uma palavra. O tempo so comeca depois da escolha." };
};

export const chatAccess = (state: AuthoritativeMatchState, userId: string | null): ChatAccess => {
    if (state.matchStatus === "MATCH_FINISHED" || state.winnerTeam) {
        return { mode: "disabled", reason: "A partida terminou." };
    }
    if (state.isPaused || state.matchStatus === "MATCH_PAUSED") {
        return { mode: "disabled", reason: "O chat fica pausado junto com a partida." };
    }
    if (state.roundState === "ROUND_GUESSING") {
        if (userId && userId === state.currentMimePlayerId) {
            return { mode: "disabled", reason: "Quem faz a mimica nao pode chutar." };
        }
        const player = playerOnTeam(state, userId);
        if (!player) return { mode: "disabled", reason: "Voce nao esta nesta partida." };
        const special = state.isSpecialTile || isSpecialTile(currentTeamPosition(state));
        if (player.team === state.currentTeam) {
            return { mode: "guess", reason: special ? "Casa especial: seu chute vale para a equipe." : "Digite o chute da sua equipe." };
        }
        if (special) {
            return { mode: "guess", reason: "Casa especial: um chute certo rouba a vez." };
        }
        return { mode: "disabled", reason: "Nesta casa so o parceiro do mimico pode chutar." };
    }
    return { mode: "free", reason: "Converse com a mesa. Os chutes valem quando a mimica comecar." };
};

export const sorteioSelectEligibility = (
    state: AuthoritativeMatchState,
    userId: string | null,
    hostId: string | null
): ActionAccess => {
    if (state.matchStatus !== "MATCH_SETUP" || state.currentTeam) {
        return { allowed: false, reason: "O sorteio inicial ja foi concluido." };
    }
    if (!userId || !hostId || userId !== hostId) {
        return { allowed: false, reason: "Aguarde o host escolher um jogador de cada time." };
    }
    return { allowed: true, reason: "Escolha um jogador do Time A e um do Time B." };
};

export const sorteioRollEligibility = (
    state: AuthoritativeMatchState,
    sorteio: SorteioState | null,
    userId: string | null
): ActionAccess => {
    if (state.matchStatus !== "MATCH_SETUP" || state.currentTeam) {
        return { allowed: false, reason: "O sorteio inicial ja foi concluido." };
    }
    if (!sorteio?.playerAId || !sorteio.playerBId) {
        return { allowed: false, reason: "Aguarde o host escolher os jogadores." };
    }
    if (userId !== sorteio.playerAId && userId !== sorteio.playerBId) {
        return { allowed: false, reason: "Aguarde os jogadores escolhidos rolarem o dado." };
    }
    const alreadyRolled = userId === sorteio.playerAId ? sorteio.rollA !== null : sorteio.rollB !== null;
    if (alreadyRolled) {
        return { allowed: false, reason: "Aguarde o outro jogador rolar o dado." };
    }
    return { allowed: true, reason: "Role o dado do sorteio. O servidor decide o vencedor." };
};

const secondsBetween = (start: string | null, end: string | null): number | null => {
    if (!start || !end) return null;
    const startMs = Date.parse(start);
    const endMs = Date.parse(end);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
    return Math.max(0, Math.ceil((endMs - startMs) / 1000));
};

export const remainingSeconds = (state: AuthoritativeMatchState, nowMs: number): number | null => {
    if (state.roundState !== "ROUND_GUESSING" || state.matchStatus === "MATCH_FINISHED") return null;
    if (state.isPaused || state.matchStatus === "MATCH_PAUSED") {
        if (state.remainingRoundSecondsOnPause != null) return state.remainingRoundSecondsOnPause;
        return secondsBetween(state.pausedAt, state.timerEndsAt);
    }
    if (!state.timerEndsAt) return null;
    const endsAt = Date.parse(state.timerEndsAt);
    if (Number.isNaN(endsAt)) return null;
    return Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
};

export const remainingReconnectSeconds = (state: AuthoritativeMatchState, nowMs: number): number | null => {
    if (!state.isPaused && state.matchStatus !== "MATCH_PAUSED") return null;
    if (!state.reconnectDeadline) return null;
    const deadline = Date.parse(state.reconnectDeadline);
    if (Number.isNaN(deadline)) return null;
    return Math.max(0, Math.ceil((deadline - nowMs) / 1000));
};

export const connectionStatusAfterRestore = (
    state: AuthoritativeMatchState | null,
    userId: string | null
): ConnectionStatus => {
    if (!state) return "CONNECTED";
    if (state.finishReason === "RECONNECTION_FORFEIT" || state.matchStatus === "MATCH_FINISHED") {
        return state.finishReason === "RECONNECTION_FORFEIT" ? "RECOVERY_TIMEOUT" : "CONNECTED";
    }
    if ((state.isPaused || state.matchStatus === "MATCH_PAUSED") && userId && state.disconnectedUserId === userId) {
        return "PAUSED_BY_DISCONNECTION";
    }
    return "CONNECTED";
};

export const deriveDiceValue = (
    previous: AuthoritativeMatchState | null,
    next: AuthoritativeMatchState
): number | null => {
    if (!previous?.currentTeam || previous.roundState !== "ROUND_WAITING_FOR_DICE") return null;
    if (next.roundState !== "ROUND_WAITING_FOR_WORD_SELECTION" && next.matchStatus !== "MATCH_FINISHED") return null;
    const before = previous.currentTeam === "A" ? previous.teamAPosition : previous.teamBPosition;
    const after = previous.currentTeam === "A" ? next.teamAPosition : next.teamBPosition;
    const delta = after - before;
    if (delta < 1 || delta > 6) return null;
    return delta;
};

export const deriveRoundFeedback = (
    previous: AuthoritativeMatchState | null,
    next: AuthoritativeMatchState,
    awaitingCorrectResolution: boolean
): RoundFeedback | null => {
    if (!previous) {
        return next.matchStatus === "MATCH_FINISHED" || next.winnerTeam ? "BOARD_WIN" : null;
    }
    const finishedNow = next.matchStatus === "MATCH_FINISHED" || Boolean(next.winnerTeam);
    const finishedBefore = previous.matchStatus === "MATCH_FINISHED" || Boolean(previous.winnerTeam);
    if (finishedNow && !finishedBefore) return "BOARD_WIN";
    if (previous.roundState === "ROUND_GUESSING" && next.roundState === "ROUND_WAITING_FOR_DICE") {
        if (awaitingCorrectResolution && previous.currentTeam && next.currentTeam && previous.currentTeam !== next.currentTeam) {
            return "STEAL";
        }
        if (awaitingCorrectResolution) return "CORRECT_GUESS";
        return "TIMEOUT";
    }
    return null;
};

export const categoryLabel = (category: string): string => {
    switch (category) {
        case "EU_SOU":
        case "eu_sou":
            return "Eu sou";
        case "EU_FACO":
        case "eu_faco":
            return "Eu faco";
        case "OBJETO":
        case "objeto":
            return "Objeto";
        default:
            return category;
    }
};

export const finishReasonLabel = (reason: string | null): string => {
    switch (reason) {
        case "BOARD_WIN":
            return "O time chegou na casa 52.";
        case "RECONNECTION_FORFEIT":
            return "Vitoria por desconexao. O outro time venceu porque a reconexao estourou o prazo.";
        case "MANUAL_FORFEIT":
            return "A partida terminou por desistencia.";
        case "ADMIN_CANCELLED":
            return "A partida foi cancelada.";
        case "ABANDONED":
            return "Um jogador abandonou a partida.";
        default:
            return "A partida terminou.";
    }
};

export const feedbackLabel = (feedback: RoundFeedback): string => {
    switch (feedback) {
        case "CORRECT_GUESS":
            return "Acerto. A equipe continua e o mimico troca.";
        case "STEAL":
            return "Roubo. A vez passou para a outra equipe.";
        case "TIMEOUT":
            return "Tempo esgotado. A vez passou para a outra equipe.";
        case "BOARD_WIN":
            return "Fim de jogo. Uma equipe chegou na casa 52.";
    }
};

export const playerName = (state: AuthoritativeMatchState, userId: string | null): string => {
    if (!userId) return "Jogador";
    return state.players.find((player) => player.userId === userId)?.nickname || "Jogador";
};
