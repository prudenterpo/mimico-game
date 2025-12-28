export interface User {
    id: string;
    nickname: string;
    email: string;
    avatar?: string;
    isOnline?: boolean;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

export interface ChatMessage {
    id: string;
    userId: any;
    userName: string;
    message: string;
    timestamp: string;
}

export interface GameTable {
    id: string;
    name: string;
    hostId: string;
    players: User[];
    status: "waiting" | "starting" | "in_progress" | "finished";
    createdAt: Date;
}

export interface Invite {
    id: string;
    tableId: string;
    tableName: string;
    hostName: string;
    hostId: string;
    invitedUserId: number;
    expiresAt: Date;
}

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

export interface UserProfileResponse {
    userId: string;
    email: string;
    nickname: string;
    avatarUrl: string | null;
    roles: string[];
    createdAt: string;
}

export type WordCategory = "eu_sou" | "eu_faco" | "objeto";

export interface Word {
    id: string;
    word: string;
    category: WordCategory;
    difficulty: 1 | 2 | 3;
}

export interface ApiResponse<T> {
    data: T;
    message?: string;
    error?: string;
}

export type PlayerSlotStatus = 'pending' | 'accepted' | 'rejected' | 'ready';

export interface PlayerSlot {
    odUserId: string;
    nickname: string;
    status: PlayerSlotStatus;
}
