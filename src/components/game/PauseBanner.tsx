"use client";

import { useEffect, useRef, useState } from "react";
import { playerName, remainingReconnectSeconds } from "@/lib/matchRules";
import { AuthoritativeMatchState } from "@/types/gameplay";

interface PauseBannerProps {
    match: AuthoritativeMatchState;
    onDeadline: () => void;
}

export default function PauseBanner({ match, onDeadline }: PauseBannerProps) {
    const [now, setNow] = useState(() => Date.now());
    const notified = useRef(false);
    const seconds = remainingReconnectSeconds(match, now);
    const name = playerName(match, match.disconnectedUserId);
    const mediaFailure = match.pauseReason === "MIME_MEDIA_FAILED";

    useEffect(() => {
        if (!match.reconnectDeadline) return;
        const timerId = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(timerId);
    }, [match.reconnectDeadline]);

    useEffect(() => {
        if (seconds === null) return;
        if (seconds > 0) {
            notified.current = false;
            return;
        }
        if (notified.current) return;
        notified.current = true;
        onDeadline();
    }, [onDeadline, seconds]);

    return (
        <div role="status" data-testid="pause-banner" className="mb-3 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <p className="font-semibold">Partida pausada</p>
            <p className="mt-1">
                {mediaFailure
                    ? `${name} perdeu o video. Os comandos ficam bloqueados ate o servidor retomar.`
                    : `${name} desconectou. Os comandos ficam bloqueados ate o servidor retomar.`}
            </p>
            {seconds !== null && (
                <p className="mt-1" data-testid="reconnect-countdown">
                    Reconexao: <span className="font-bold">{seconds}</span> segundos
                </p>
            )}
        </div>
    );
}
