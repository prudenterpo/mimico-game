export interface User {
    id: string;
    nickname: string;
    email: string;
    avatar?: string;
    roles?: string[];
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
    invitedUserId: string;
    expiresAt: Date;
}

export interface ErrorResponse {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    correlationId?: string;
}

export interface LoginResponse {
    token: string;
    user: UserProfileResponse;
}

export interface RegisterResponse {
    userId: string;
    email: string;
    nickname: string;
}

export interface OnlineUsersResponse {
    users: UserProfileResponse[];
    count: number;
}

export interface RealtimeEventEnvelope<T = Record<string, unknown>> {
    type: string;
    data: T;
    occurredAt: string;
}

export interface LobbyMessageEventData {
    senderUserId: string;
    senderDisplayName: string;
    message: string;
    sentAt: string;
}

export interface TableInviteEventData {
    inviteId?: string;
    id?: string;
    tableId: string;
    tableName: string;
    hostId: string;
    hostName?: string;
    hostDisplayName?: string;
    invitedUserId: string;
    expiresAt?: string;
    expiresIn?: number;
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
