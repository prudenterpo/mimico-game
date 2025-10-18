import Button from "./Button";
import Avatar from "./Avatar";
import Badge from "./Badge";
import { User } from "@/types";
import React from "react";

interface UsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    onCreateTable: () => void;
}

export default function UsersModal({ isOpen, onClose, users, onCreateTable }: UsersModalProps) {
    if (!isOpen) return null;

    console.log("UsersModal rendering, isOpen:", isOpen);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleCreateTable = () => {
        onClose();
        onCreateTable();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={handleBackdropClick}
        >
            <div
                className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>
                            Usuários Online
                        </h3>
                        <Badge variant="teal">{users.length}</Badge>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Avatar name={user.name} size="md" online />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm" style={{ color: "var(--color-accent)" }}>
                                        {user.name}
                                    </p>
                                    <p className="text-xs text-gray-500">Online</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4">
                    <Button
                        variant="primary"
                        fullWidth
                        onClick={handleCreateTable}
                    >
                        Criar Mesa
                    </Button>
                </div>
            </div>
        </div>
    );
}