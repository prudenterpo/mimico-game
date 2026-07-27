import {
    MatchStartedEventData,
    RealtimeEventEnvelope,
    TableClosedEventData,
    TableMessageEventData,
    TablePlayer,
    TablePlayersEventData,
    TableResponse,
    TableTeamsEventData,
    TeamAssignment,
    User,
} from "@/types";

export const hostUser: User = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "host@example.test",
    nickname: "host_1",
    isOnline: true,
};

export const inviteeUsers: User[] = [
    {
        id: "22222222-2222-4222-8222-222222222222",
        email: "friend2@example.test",
        nickname: "friend_2",
        isOnline: true,
    },
    {
        id: "33333333-3333-4333-8333-333333333333",
        email: "friend3@example.test",
        nickname: "friend_3",
        isOnline: true,
    },
    {
        id: "44444444-4444-4444-8444-444444444444",
        email: "friend4@example.test",
        nickname: "friend_4",
        isOnline: true,
    },
];

export const tableId = "55555555-5555-4555-8555-555555555555";
export const matchId = "66666666-6666-4666-8666-666666666666";

export const acceptedPlayers: TablePlayer[] = [
    { userId: hostUser.id, nickname: hostUser.nickname, status: "accepted" },
    ...inviteeUsers.map((user) => ({ userId: user.id, nickname: user.nickname, status: "accepted" as const })),
];

export const mixedStatusPlayers: TablePlayer[] = [
    acceptedPlayers[0],
    { userId: inviteeUsers[0].id, nickname: inviteeUsers[0].nickname, status: "pending" },
    { userId: inviteeUsers[1].id, nickname: inviteeUsers[1].nickname, status: "rejected" },
    { userId: inviteeUsers[2].id, nickname: inviteeUsers[2].nickname, status: "expired" },
];

export const validTeamAssignments: TeamAssignment[] = [
    { team: "A", playerIds: [hostUser.id, inviteeUsers[0].id] },
    { team: "B", playerIds: [inviteeUsers[1].id, inviteeUsers[2].id] },
];

export const validCreateTableResponse: TableResponse = {
    tableId,
    name: "Mesa da rodada",
    hostUserId: hostUser.id,
    hostNickname: hostUser.nickname,
    status: "TABLE_WAITING",
    players: [acceptedPlayers[0]],
    teamAssignments: [],
    createdAt: "2026-07-27T12:00:00Z",
};

export const readyTableResponse: TableResponse = {
    ...validCreateTableResponse,
    status: "TABLE_READY_TO_START",
    players: acceptedPlayers,
    teamAssignments: validTeamAssignments,
};

export const tablePlayersEnvelope: RealtimeEventEnvelope<TablePlayersEventData> = {
    type: "TABLE_PLAYERS_UPDATED",
    data: {
        tableId,
        status: "TABLE_WAITING",
        players: mixedStatusPlayers,
    },
    occurredAt: "2026-07-27T12:01:00Z",
};

export const tableTeamsEnvelope: RealtimeEventEnvelope<TableTeamsEventData> = {
    type: "TABLE_TEAMS_UPDATED",
    data: {
        tableId,
        status: "TABLE_READY_TO_START",
        teamAssignments: validTeamAssignments,
    },
    occurredAt: "2026-07-27T12:02:00Z",
};

export const tableMessageEnvelope: RealtimeEventEnvelope<TableMessageEventData> = {
    type: "TABLE_MESSAGE_POSTED",
    data: {
        tableId,
        senderUserId: inviteeUsers[0].id,
        senderDisplayName: inviteeUsers[0].nickname,
        message: "Bora montar os times?",
        sentAt: "2026-07-27T12:03:00Z",
    },
    occurredAt: "2026-07-27T12:03:00Z",
};

export const matchStartedEnvelope: RealtimeEventEnvelope<MatchStartedEventData> = {
    type: "MATCH_STARTED",
    data: {
        tableId,
        matchId,
        status: "MATCH_SETUP",
    },
    occurredAt: "2026-07-27T12:04:00Z",
};

export const tableClosedEnvelope: RealtimeEventEnvelope<TableClosedEventData> = {
    type: "TABLE_CLOSED",
    data: {
        tableId,
        reason: "HOST_CLOSED",
    },
    occurredAt: "2026-07-27T12:05:00Z",
};
