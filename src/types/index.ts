// User Types
export interface User {
    id: string;
    nickname: string;
    email: string;
    avatar?: string;
    isOnline?: boolean;
}

// Auth Types
export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

// Lobby Types
export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: Date;
}

// Table Types
export interface GameTable {
    id: string;
    name: string;
    hostId: string;
    players: User[];
    status: "waiting" | "starting" | "in_progress" | "finished";
    createdAt: Date;
}

// Invite Types
export interface Invite {
    tableId: string;
    tableName: string;
    hostName: string;
    expiresAt: Date;
}

// Match Types
export type Team = "A" | "B";

export interface Player {
    userId: string;
    userName: string;
    team: Team;
    isActive: boolean;
}

export interface MatchState {
    matchId: string;
    players: Player[];
    teamAPosition: number;
    teamBPosition: number;
    currentTurn: Team;
    currentPlayerId: string | null;
    timerExpiresAt: Date | null;
    selectedWord: string | null;
    roundNumber: number;
}

// Word Types
export type WordCategory = "eu_sou" | "eu_faco" | "objeto";

export interface Word {
    id: string;
    word: string;
    category: WordCategory;
    difficulty: 1 | 2 | 3;
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    message?: string;
    error?: string;
}