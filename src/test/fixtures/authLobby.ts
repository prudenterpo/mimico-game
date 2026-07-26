import {
    ErrorResponse,
    LobbyMessageEventData,
    LoginResponse,
    OnlineUsersResponse,
    RealtimeEventEnvelope,
    TableInviteEventData,
    UserProfileResponse
} from "@/types";

export const validAuthUser: UserProfileResponse = {
    userId: "11111111-1111-4111-8111-111111111111",
    email: "player@example.test",
    nickname: "player_1",
    avatarUrl: null,
    roles: ["PLAYER"],
    createdAt: "2026-07-26T12:00:00",
};

export const secondOnlineUser: UserProfileResponse = {
    userId: "22222222-2222-4222-8222-222222222222",
    email: "friend@example.test",
    nickname: "friend_2",
    avatarUrl: null,
    roles: ["PLAYER"],
    createdAt: "2026-07-26T12:01:00",
};

export const validLoginResponse: LoginResponse = {
    token: "fake.jwt.token",
    user: validAuthUser,
};

export const invalidLoginError: ErrorResponse = {
    code: "INVALID_CREDENTIALS",
    message: "Invalid credentials.",
};

export const onlineUsersEnvelope: RealtimeEventEnvelope<OnlineUsersResponse> = {
    type: "ONLINE_USERS_UPDATED",
    data: {
        users: [validAuthUser, secondOnlineUser],
        count: 2,
    },
    occurredAt: "2026-07-26T15:00:00Z",
};

export const lobbyMessageEnvelope: RealtimeEventEnvelope<LobbyMessageEventData> = {
    type: "LOBBY_MESSAGE_POSTED",
    data: {
        senderUserId: secondOnlineUser.userId,
        senderDisplayName: secondOnlineUser.nickname,
        message: "Oi, lobby!",
        sentAt: "2026-07-26T15:01:00Z",
    },
    occurredAt: "2026-07-26T15:01:00Z",
};

export const tableInviteEnvelope: RealtimeEventEnvelope<TableInviteEventData> = {
    type: "TABLE_INVITE_RECEIVED",
    data: {
        inviteId: "33333333-3333-4333-8333-333333333333",
        tableId: "44444444-4444-4444-8444-444444444444",
        tableName: "Mesa da rodada",
        hostId: secondOnlineUser.userId,
        hostName: secondOnlineUser.nickname,
        invitedUserId: validAuthUser.userId,
        expiresAt: "2026-07-26T15:02:00Z",
    },
    occurredAt: "2026-07-26T15:01:00Z",
};

export const malformedEnvelope = {
    type: "ONLINE_USERS_UPDATED",
    data: null,
    occurredAt: "2026-07-26T15:00:00Z",
};

export const validLobbyChatMessage = "Bora jogar?";
export const emptyLobbyChatMessage = "   ";
export const overlongLobbyChatMessage = "x".repeat(501);
