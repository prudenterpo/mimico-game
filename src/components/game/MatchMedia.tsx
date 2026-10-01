"use client";

import { useCallback } from "react";
import Button from "@/components/Button";
import { CapturedStream } from "@/lib/mediaSession";
import { useMediaStore } from "@/stores/mediaStore";

interface MediaPlayer {
    userId: string;
    nickname: string;
}

interface MatchMediaProps {
    selfId: string | null;
    mimeUserId: string | null;
    players: MediaPlayer[];
}

function attachStream(stream: CapturedStream | null) {
    return (node: HTMLVideoElement | null) => {
        if (!node || !stream) return;
        if (typeof MediaStream === "undefined" || !(stream instanceof MediaStream)) return;
        node.srcObject = stream;
    };
}

export default function MatchMedia({ selfId, mimeUserId, players }: MatchMediaProps) {
    const phase = useMediaStore((state) => state.phase);
    const localStream = useMediaStore((state) => state.localStream);
    const remotes = useMediaStore((state) => state.remotes);
    const muted = useMediaStore((state) => state.muted);
    const cameraOn = useMediaStore((state) => state.cameraOn);
    const ordered = [...players].sort((left, right) => {
        if (left.userId === mimeUserId) return -1;
        if (right.userId === mimeUserId) return 1;
        return left.nickname.localeCompare(right.nickname);
    });

    const retry = useCallback(() => {
        void useMediaStore.getState().retry();
    }, []);

    return (
        <section aria-label="Video da partida" className="order-first bg-white rounded-lg shadow-lg p-4 lg:col-span-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>Video</h2>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => useMediaStore.getState().toggleMute()}>
                        {muted ? "Ativar microfone" : "Silenciar microfone"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => useMediaStore.getState().toggleCamera()}>
                        {cameraOn ? "Desligar camera" : "Ligar camera"}
                    </Button>
                </div>
            </div>

            {phase === "permission-denied" && (
                <div role="status" data-testid="media-phase" className="mb-3 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-950">
                    <p>A camera foi bloqueada. Libere a permissao para continuar a mimica.</p>
                    <Button type="button" variant="primary" className="mt-3" onClick={retry}>Tentar camera de novo</Button>
                </div>
            )}
            {phase === "failed" && (
                <div role="status" data-testid="media-phase" className="mb-3 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-950">
                    <p>O video falhou. Se voce for o mimico, a partida fica pausada ate a camera voltar.</p>
                    <Button type="button" variant="primary" className="mt-3" onClick={retry}>Tentar camera de novo</Button>
                </div>
            )}
            {phase === "requesting" && (
                <p role="status" data-testid="media-phase" className="mb-3 text-sm text-gray-600">Pedindo acesso a camera e ao microfone.</p>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {ordered.map((player) => {
                    const local = player.userId === selfId;
                    const remote = remotes.find((entry) => entry.userId === player.userId);
                    const primary = player.userId === mimeUserId;
                    const stream = local ? localStream : remote?.stream ?? null;
                    const link = local ? (phase === "live" && cameraOn ? "connected" : phase) : remote?.link ?? "connecting";
                    return (
                        <div
                            key={player.userId}
                            data-testid={`media-tile-${player.userId}`}
                            data-primary={primary ? "true" : "false"}
                            data-link={link}
                            className={primary
                                ? "col-span-2 overflow-hidden rounded-lg bg-gray-900 text-white lg:row-span-2"
                                : "overflow-hidden rounded-lg bg-gray-900 text-white"}
                        >
                            <video
                                ref={attachStream(stream)}
                                autoPlay
                                playsInline
                                muted={local}
                                className={primary ? "aspect-video w-full bg-black object-cover" : "aspect-video w-full bg-black object-cover opacity-90"}
                            />
                            <div className="px-2 py-2 text-xs">
                                <p className="truncate font-semibold">
                                    {player.nickname}
                                    {primary ? " · mimica principal" : ""}
                                    {local ? " · voce" : ""}
                                </p>
                                {link === "failed" && <p>Sem conexao de video</p>}
                                {local && !cameraOn && phase === "live" && <p>Camera desligada</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
