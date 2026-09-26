import { Team } from "@/types";

export type MatchStatus = "MATCH_SETUP" | "MATCH_ACTIVE" | "MATCH_PAUSED" | "MATCH_FINISHED";

export type GameRoundState =
    | "ROUND_WAITING_FOR_DICE"
    | "ROUND_WAITING_FOR_WORD_SELECTION"
    | "ROUND_GUESSING"
    | "ROUND_RESOLVED";

export interface MatchPlayerState {
    userId: string;
    nickname: string;
    team: Team;
    playerOrder: number;
}

export interface AuthoritativeMatchState {
    matchId: string;
    tableId: string;
    matchStatus: MatchStatus;
    roundState: GameRoundState | null;
    players: MatchPlayerState[];
    teamAPosition: number;
    teamBPosition: number;
    currentTeam: Team | null;
    currentMimePlayerId: string | null;
    timerEndsAt: string | null;
    isSpecialTile: boolean;
    isPaused: boolean;
    pausedAt: string | null;
    pauseReason: string | null;
    disconnectedUserId: string | null;
    reconnectDeadline: string | null;
    remainingRoundSecondsOnPause: number | null;
    winnerTeam: Team | null;
    finishReason: string | null;
    gamePhase: string | null;
}

export interface WordOption {
    wordId: string;
    text: string;
    category: string;
}

export interface MatchGuess {
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    isCorrect: boolean;
    guesserTeam: Team | null;
    occurredAt: string;
}

export interface SorteioState {
    playerAId: string | null;
    playerBId: string | null;
    playerANickname: string | null;
    playerBNickname: string | null;
    rollA: number | null;
    rollB: number | null;
    tie: boolean;
    tieRollA: number | null;
    tieRollB: number | null;
}

export interface MatchEndedView {
    winnerTeam: Team | null;
    finishReason: string | null;
    abandonedByNickname: string | null;
}

export type RoundFeedback = "CORRECT_GUESS" | "STEAL" | "TIMEOUT" | "BOARD_WIN";

export type ChatMode = "guess" | "free" | "disabled";

export interface ActionAccess {
    allowed: boolean;
    reason: string;
}

export interface ChatAccess {
    mode: ChatMode;
    reason: string;
}
