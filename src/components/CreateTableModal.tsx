"use client";

import { useState } from "react";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import Avatar from "./Avatar";
import { User } from "@/types";

interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onlineUsers: User[];
    onCreateTable: (tableName: string, invitedUsers: User[]) => void;
}

export default function CreateTableModal({
     isOpen,
     onClose,
     onlineUsers,
     onCreateTable,
}: CreateTableModalProps) {
    const [tableName, setTableName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | null>(null);

    const toggleUser = (user: User) => {
        setError(null);
        if (selectedUsers.find((u) => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
        } else {
            if (selectedUsers.length < 3) {
                setSelectedUsers([...selectedUsers, user]);
            }
        }
    };

    const handleCreate = () => {
        const name = tableName.trim();

        if (!name) {
            setError("Digite um nome para a mesa.");
            return;
        }

        if (name.length < 3) {
            setError("O nome da mesa precisa ter pelo menos 3 caracteres.");
            return;
        }

        if (name.length > 100) {
            setError("O nome da mesa deve ter no máximo 100 caracteres.");
            return;
        }

        if (selectedUsers.length !== 3) {
            setError("Selecione exatamente 3 jogadores online.");
            return;
        }

        onCreateTable(name, selectedUsers);

        setTableName("");
        setSelectedUsers([]);
        setError(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Criar Nova Mesa"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleCreate}>
                        Criar Mesa
                    </Button>
                </>
            }
        >
            <div className="space-y-6">
                <Input
                    label="Nome da Mesa"
                    placeholder="Ex: Mesa dos Silvas"
                    value={tableName}
                    onChange={(e) => {
                        setTableName(e.target.value);
                        if (error) setError(null);
                    }}
                    fullWidth
                    autoFocus
                />

                <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: "var(--color-accent)" }}>
                        Convidar Jogadores ({selectedUsers.length}/3)
                    </label>

                    {onlineUsers.length === 0 ? (
                        <p className="text-sm opacity-70 text-center py-4" style={{ color: "var(--color-accent)" }}>
                            Nenhum jogador online disponível
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
                            {onlineUsers.map((user) => {
                                const isSelected = selectedUsers.find((u) => u.id === user.id);
                                return (
                                    <button
                                        type="button"
                                        key={user.id}
                                        onClick={() => toggleUser(user)}
                                        aria-pressed={Boolean(isSelected)}
                                        className={`w-full text-left flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                                            isSelected ? "ring-2" : "hover:shadow-md"
                                        }`}
                                        style={{
                                            backgroundColor: isSelected
                                                ? "rgba(255, 123, 84, 0.1)"
                                                : "var(--color-background)",
                                            borderColor: isSelected ? "var(--color-primary)" : "transparent",
                                        }}
                                    >
                                        <Avatar nickname={user.nickname} size="md" online={user.isOnline} />
                                        <div className="flex-1">
                                            <p className="font-medium" style={{ color: "var(--color-accent)" }}>
                                                {user.nickname}
                                            </p>
                                            <p className="text-xs opacity-70" style={{ color: "var(--color-accent)" }}>
                                                {user.email}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <span className="text-xl">✓</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {error && (
                    <p role="alert" className="text-sm font-medium text-red-500">
                        {error}
                    </p>
                )}
            </div>
        </Modal>
    );
}
