"use client";

import { useEffect, useState } from "react";
import { remainingSeconds } from "@/lib/matchRules";
import { AuthoritativeMatchState } from "@/types/gameplay";

interface RoundClockProps {
    match: AuthoritativeMatchState;
}

export default function RoundClock({ match }: RoundClockProps) {
    const [now, setNow] = useState(() => Date.now());
    const paused = match.isPaused || match.matchStatus === "MATCH_PAUSED";
    const ticking = match.roundState === "ROUND_GUESSING" && !paused && Boolean(match.timerEndsAt);

    useEffect(() => {
        if (!ticking) return;
        const timerId = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(timerId);
    }, [ticking, match.timerEndsAt]);

    const seconds = remainingSeconds(match, now);
    if (seconds === null) return null;

    const urgent = seconds <= 10;

    return (
        <p
            aria-live="polite"
            data-testid="round-timer"
            className={`text-sm font-semibold ${urgent ? "text-red-600" : "text-gray-800"}`}
        >
            <span className="text-2xl font-bold">{seconds}</span> segundos{paused ? " pausados" : ""}
        </p>
    );
}
