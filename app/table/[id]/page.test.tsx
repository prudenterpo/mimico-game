import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TableSetupPage from "./page";
import { useStore } from "@/stores/store";
import {
    acceptedPlayers,
    hostUser,
    inviteeUsers,
    mixedStatusPlayers,
    readyTableResponse,
    tableId,
    validTeamAssignments
} from "@/test/fixtures/tableSetup";

const router = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ id: tableId }),
    useRouter: () => router,
}));

const baseTable = {
    id: tableId,
    name: "Mesa da rodada",
    hostId: hostUser.id,
    hostNickname: hostUser.nickname,
    players: mixedStatusPlayers,
    status: "TABLE_WAITING" as const,
    teamAssignments: [],
};

describe("TableSetupPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({
            user: hostUser,
            token: "fake.jwt.token",
            isAuthenticated: true,
            currentTable: baseTable,
            currentTablePlayers: mixedStatusPlayers,
            tableTeamAssignments: [],
            tableChatMessages: [],
            tableClosedReason: null,
            matchStartedId: null,
            restoreAuth: vi.fn().mockResolvedValue(true),
            connectWebSocket: vi.fn((onConnected?: () => void) => onConnected?.()),
            disconnectWebSocket: vi.fn(),
            fetchTable: vi.fn().mockResolvedValue(readyTableResponse),
            connectToTable: vi.fn(),
            assignTeams: vi.fn(),
            startMatch: vi.fn(),
            leaveTable: vi.fn(),
            clearTableChat: vi.fn(),
            resetTableRuntimeState: vi.fn(),
            logout: vi.fn(),
        });
    });

    it("renders table statuses, chat and disabled host start reason", async () => {
        render(<TableSetupPage />);

        expect(await screen.findByRole("heading", { name: "Jogadores e convites" })).toBeInTheDocument();
        expect(screen.getAllByText("Aceito").length).toBeGreaterThan(0);
        expect(screen.getByText("Pendente")).toBeInTheDocument();
        expect(screen.getByText("Recusado")).toBeInTheDocument();
        expect(screen.getByText("Expirado")).toBeInTheDocument();
        expect(screen.getByRole("complementary", { name: "Chat da mesa" })).toBeInTheDocument();

        expect(screen.getByRole("button", { name: "Iniciar partida" })).toBeDisabled();
        expect(screen.getAllByText(/A mesa precisa de 4 jogadores aceitos/i).length).toBeGreaterThan(0);

        await waitFor(() => expect(useStore.getState().connectToTable).toHaveBeenCalledWith(tableId));
    });

    it("enables host start only when accepted players and teams are valid", async () => {
        useStore.setState({
            currentTable: {
                ...baseTable,
                players: acceptedPlayers,
                status: "TABLE_READY_TO_START",
                teamAssignments: validTeamAssignments,
            },
            currentTablePlayers: acceptedPlayers,
            tableTeamAssignments: validTeamAssignments,
        });

        render(<TableSetupPage />);

        expect(await screen.findByRole("button", { name: "Iniciar partida" })).toBeEnabled();
        expect(screen.getByText(/Mesa pronta/i)).toBeInTheDocument();
    });

    it("renders read-only teams for non-host players", async () => {
        useStore.setState({
            user: inviteeUsers[0],
            currentTable: {
                ...baseTable,
                players: acceptedPlayers,
                status: "TABLE_READY_TO_START",
                teamAssignments: validTeamAssignments,
            },
            currentTablePlayers: acceptedPlayers,
            tableTeamAssignments: validTeamAssignments,
        });

        render(<TableSetupPage />);

        await waitFor(() => expect(screen.queryByText("Carregando mesa...")).not.toBeInTheDocument());
        expect(screen.queryByRole("button", { name: "Iniciar partida" })).not.toBeInTheDocument();
        expect(screen.getAllByText("Somente o host pode editar os times.")).toHaveLength(2);
        expect(screen.getByText("Aguardando o host iniciar a partida.")).toBeInTheDocument();
    });
});
