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
    hostNickname?: string;
    players: TablePlayer[];
    status: TableStatus;
    teamAssignments: TeamAssignment[];
    createdAt?: string;
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

export type TableStatus =
    | "TABLE_WAITING"
    | "TABLE_READY_TO_START"
    | "TABLE_IN_MATCH"
    | "TABLE_BETWEEN_MATCHES"
    | "TABLE_CLOSED";

export type TablePlayerStatus = "accepted" | "pending" | "rejected" | "expired";

export interface TablePlayer {
    userId: string;
    nickname: string;
    status: TablePlayerStatus;
}

export interface TeamAssignment {
    team: Team;
    playerIds: string[];
}

export interface TableResponse {
    tableId?: string;
    id?: string;
    name: string;
    hostUserId?: string;
    hostId?: string;
    hostNickname?: string;
    status: TableStatus | string;
    players?: Array<UserProfileResponse | TablePlayer>;
    teamAssignments?: TeamAssignment[];
    createdAt?: string;
}

export interface TablePlayersEventData {
    tableId?: string;
    status?: TableStatus | string;
    players?: TablePlayer[];
    pendingInvites?: TablePlayer[];
    rejectedInvites?: TablePlayer[];
    expiredInvites?: TablePlayer[];
}

export interface TableTeamsEventData {
    tableId: string;
    status?: TableStatus | string;
    teamAssignments: TeamAssignment[];
}

export interface TableMessageEventData {
    tableId: string;
    senderUserId: string;
    senderDisplayName: string;
    message: string;
    sentAt: string;
}

export interface MatchStartedEventData {
    matchId?: string;
    tableId: string;
    status?: string;
}

export interface TableClosedEventData {
    tableId: string;
    reason: "HOST_LEFT" | "HOST_CLOSED" | "SYSTEM_CLOSED" | string;
}

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
