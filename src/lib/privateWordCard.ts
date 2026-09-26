import { WordOption } from "@/types/gameplay";

const STORAGE_KEY = "mimico.privateWordCard";

interface StoredWordCard {
    matchId: string;
    words: WordOption[];
    selectedWordId: string | null;
}

const memory: { value: StoredWordCard | null } = { value: null };

const canUseSession = (): boolean => typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

export const readPrivateWordCard = (matchId: string): StoredWordCard | null => {
    const stored = memory.value;
    if (stored?.matchId === matchId) return stored;
    if (!canUseSession()) return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredWordCard;
        if (!parsed || parsed.matchId !== matchId || !Array.isArray(parsed.words)) return null;
        memory.value = parsed;
        return parsed;
    } catch {
        return null;
    }
};

export const writePrivateWordCard = (matchId: string, words: WordOption[], selectedWordId: string | null) => {
    const value = { matchId, words, selectedWordId };
    memory.value = value;
    if (!canUseSession()) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

export const clearPrivateWordCard = () => {
    memory.value = null;
    if (!canUseSession()) return;
    window.sessionStorage.removeItem(STORAGE_KEY);
};
