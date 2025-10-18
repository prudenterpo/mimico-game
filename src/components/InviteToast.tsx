"use client";

import { useEffect, useState } from "react";
import { Invite } from "@/types";
import Button from "./Button";

interface InviteToastProps {
    invite: Invite;
    onAccept: () => void;
    onReject: () => void;
}

export default function InviteToast({ invite, onAccept, onReject }: InviteToastProps) {
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        const expiresAt = new Date(invite.expiresAt).getTime();

        const interval = setInterval(() => {
            const now = Date.now();
            const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));

            setTimeLeft(secondsLeft);

            if (secondsLeft <= 0) {
                clearInterval(interval);
                onReject();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [invite.expiresAt, onReject]);

    return (
        <div className="space-y-3">
            <div>
                <p className="font-semibold text-base" style={{ color: 'var(--color-accent)' }}>
                    🎮 Convite para Jogar!
                </p>
                <p className="text-sm opacity-80" style={{ color: 'var(--color-accent)' }}>
                    <strong>{invite.hostName}</strong> te convidou para{" "}
                    <strong>{invite.tableName}</strong>
                </p>
            </div>

            <div className="flex items-center justify-between gap-2">
        <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{
                backgroundColor: timeLeft <= 10 ? 'var(--color-error)' : 'var(--color-success)',
                color: 'white'
            }}
        >
          ⏱️ {timeLeft}s
        </span>

                <div className="flex gap-2">
                    <button
                        onClick={onReject}
                        className="text-xs px-3 py-1 rounded-full border-2 font-semibold transition-colors"
                        style={{
                            borderColor: 'var(--color-accent)',
                            color: 'var(--color-accent)'
                        }}
                    >
                        Recusar
                    </button>
                    <button
                        onClick={onAccept}
                        className="text-xs px-3 py-1 rounded-full font-semibold text-white transition-colors"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                        Aceitar
                    </button>
                </div>
            </div>
        </div>
    );
}