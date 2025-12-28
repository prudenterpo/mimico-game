"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Logo from "@/components/Logo";
import Link from "next/link";
import Modal from "@/components/Modal";
import { ArrowLeftEndOnRectangleIcon } from "@heroicons/react/20/solid";

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id as string;

    const [timeLeft, setTimeLeft] = useState(60);
    const [isRolling, setIsRolling] = useState(false);
    const [diceResult, setDiceResult] = useState<number | null>(null);
    const [gamePhase, setGamePhase] = useState<'dice' | 'word-selection' | 'mime' | 'waiting'>('dice');
    const [selectedWords] = useState(['Cachorro', 'Correr', 'Telefone']); // Mock words
    const [currentMime] = useState('João Silva'); // Mock current mime player
    const [teamAPosition, setTeamAPosition] = useState(5);
    const [teamBPosition, setTeamBPosition] = useState(12);
    const [message, setMessage] = useState("");
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    const { user } = useStore();
    const mockUser = user || { id: "1", nickname: "Você (Mock)", email: "voce@teste.com", isOnline: true };

    useEffect(() => {
        if (gamePhase === 'mime' && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, gamePhase]);

    const handleRollDice = async () => {
        setIsRolling(true);
        setTimeout(() => {
            const result = Math.floor(Math.random() * 6) + 1;
            setDiceResult(result);
            setIsRolling(false);
            setGamePhase('word-selection');
        }, 2000);
    };

    const handleWordSelection = (word: string) => {
        setGamePhase('mime');
        setTimeLeft(60);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            setMessage("");
        }
    };

    const createWindingPath = () => {
        const spaces = [];
        const specialTiles = [5, 11, 17, 23, 29, 35, 40, 44, 48, 51];

        const pathCoordinates = generateWindingPath();

        for (let i = 1; i <= 52; i++) {
            const isSpecial = specialTiles.includes(i);
            const hasTeamA = teamAPosition === i;
            const hasTeamB = teamBPosition === i;
            const coord = pathCoordinates[i - 1];

            spaces.push(
                <div
                    key={i}
                    className={`
                        absolute w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all duration-300
                        ${isSpecial
                        ? 'bg-amber-100 border-amber-400 text-amber-800'
                        : 'bg-white border-gray-300 text-gray-600'
                    }
                    `}
                    style={{
                        left: `${coord.x}%`,
                        top: `${coord.y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    {i}
                    {hasTeamA && (
                        <div className="absolute -top-2 -left-2 w-4 h-4 bg-teal-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                    )}
                    {hasTeamB && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                    )}
                </div>
            );
        }
        return spaces;
    };

    const generateWindingPath = () => {
        const coords = [];
        const rows = 8;
        const cols = 13;
        let currentPos = 0;

        for (let col = 0; col < cols && currentPos < 52; col++) {
            coords.push({ x: 10 + (col * 80 / cols), y: 85 });
            currentPos++;
        }

        for (let row = rows - 2; row >= 0 && currentPos < 52; row--) {
            coords.push({ x: 90, y: 15 + (row * 70 / (rows - 1)) });
            currentPos++;
        }

        for (let col = cols - 2; col >= 0 && currentPos < 52; col--) {
            coords.push({ x: 10 + (col * 80 / cols), y: 15 });
            currentPos++;
        }

        for (let row = 1; row < rows - 1 && currentPos < 52; row++) {
            coords.push({ x: 10, y: 15 + (row * 70 / (rows - 1)) });
            currentPos++;
        }

        let innerMargin = 15;
        while (currentPos < 52) {
            coords.push({
                x: 20 + innerMargin + ((currentPos % 4) * 15),
                y: 30 + innerMargin + (Math.floor((currentPos % 8) / 4) * 15)
            });
            currentPos++;
        }

        return coords;
    };

    return (
        <div className="h-screen flex flex-col" style={{ backgroundColor: "var(--color-background)" }}>
            <header className="bg-white shadow-sm px-4 py-3 flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/lobby" className="transition-opacity hover:opacity-80">
                            <Logo size="md" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-heading" style={{ color: "var(--color-accent)" }}>
                                Mímico - Partida
                            </h1>
                            <p className="text-sm text-gray-500">Mesa do João</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                                <span>Time A: {teamAPosition}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span>Time B: {teamBPosition}</span>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowLeaveModal(true)}
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                        >
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col lg:hidden p-4 gap-4">

                {gamePhase === 'mime' ? (
                    <div className="bg-white rounded-lg shadow-lg p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold" style={{color: "var(--color-accent)"}}>
                                {currentMime} fazendo mímica
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className={`text-xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-700'}`}>
                                    {timeLeft}s
                                </div>
                                <div className="text-2xl">⏳</div>
                            </div>
                        </div>

                        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <div className="text-white text-center">
                                <div className="text-4xl mb-2">📹</div>
                                <div>{currentMime}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {['Maria Santos', 'Pedro Costa', 'Ana Lima'].map((name, index) => (
                                <div key={index} className="aspect-video bg-gray-200 rounded flex items-center justify-center text-xs">
                                    <Avatar nickname={name} size="sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-lg p-4">
                        <h3 className="font-semibold mb-4 text-center" style={{ color: "var(--color-accent)" }}>
                            Tabuleiro
                        </h3>
                        <div className="relative h-64 bg-gray-50 rounded-lg overflow-hidden">
                            {createWindingPath()}
                        </div>
                        <div className="mt-3 flex justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                                <span>Time A: {teamAPosition}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span>Time B: {teamBPosition}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-lg p-6">
                    {gamePhase === 'dice' && (
                        <div className="text-center">
                            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-accent)" }}>
                                Sua vez de jogar!
                            </h3>
                            <div className="mb-6">
                                {isRolling ? (
                                    <div className="text-6xl animate-spin">🎲</div>
                                ) : diceResult ? (
                                    <div className="text-6xl mb-2">🎲</div>
                                ) : (
                                    <div className="text-6xl opacity-50">🎲</div>
                                )}
                                {diceResult && (
                                    <div className="text-3xl font-bold mt-2" style={{ color: "var(--color-accent)" }}>
                                        {diceResult}
                                    </div>
                                )}
                            </div>
                            <Button
                                onClick={handleRollDice}
                                disabled={isRolling}
                                variant="primary"
                                fullWidth
                                className="py-4 text-lg"
                            >
                                {isRolling ? 'Jogando...' : 'Jogar Dado'}
                            </Button>
                        </div>
                    )}

                    {gamePhase === 'word-selection' && (
                        <div className="text-center">
                            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-accent)" }}>
                                Escolha uma categoria:
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { word: 'Cachorro', category: 'Eu sou', color: 'bg-blue-100 border-blue-300 text-blue-800' },
                                    { word: 'Correr', category: 'Eu faço', color: 'bg-green-100 border-green-300 text-green-800' },
                                    { word: 'Telefone', category: 'Objeto', color: 'bg-purple-100 border-purple-300 text-purple-800' }
                                ].map((item, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleWordSelection(item.word)}
                                        className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${item.color}`}
                                    >
                                        <div className="text-sm opacity-70">{item.category}</div>
                                        <div className="text-lg font-semibold">{item.word}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {gamePhase === 'mime' && (
                        <div className="text-center">
                            <div className="mb-4">
                                <div className="text-4xl mb-3">⏳</div>
                                <div className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-700'}`}>
                                    {timeLeft}s
                                </div>
                                <div className="text-sm text-gray-500 mt-1">restantes</div>
                            </div>
                            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                                <p className="text-teal-800 font-semibold">
                                    Palavra: "Cachorro"
                                </p>
                                <p className="text-teal-600 text-sm mt-1">
                                    Faça gestos para sua equipe adivinhar!
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-lg flex-1 flex flex-col min-h-60">
                    <div className="p-4 border-b">
                        <h3 className="font-semibold" style={{ color: "var(--color-accent)" }}>
                            Chat do Jogo
                        </h3>
                        {gamePhase === 'mime' && (
                            <p className="text-xs text-teal-600 mt-1">
                                Digite para adivinhar a palavra!
                            </p>
                        )}
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                        <div className="text-center text-gray-500 text-sm">
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-xl">💬</span>
                            </div>
                            {gamePhase === 'mime' ? 'Digite suas tentativas aqui...' : 'Aguardando próxima rodada...'}
                        </div>
                    </div>

                    <div className="p-4 border-t">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                placeholder={gamePhase === 'mime' ? "Sua resposta..." : "Digite uma mensagem..."}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition-all duration-200 text-gray-800 placeholder-gray-500"
                            />
                            <Button variant="teal" className="px-4">
                                Enviar
                            </Button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex flex-1 max-w-7xl mx-auto w-full p-4 gap-4">

                <div className="w-2/3 bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-accent)" }}>
                        Tabuleiro - Imagem e Ação
                    </h2>

                    <div className="relative h-96 bg-gray-50 rounded-lg overflow-hidden mb-4">
                        {createWindingPath()}
                    </div>

                    <div className="flex justify-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-teal-500 rounded-full"></div>
                            <span>Time A: Posição {teamAPosition}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                            <span>Time B: Posição {teamBPosition}</span>
                        </div>
                    </div>
                </div>

                <div className="w-1/3 space-y-4">

                    <div className="bg-white rounded-lg shadow-lg p-4">
                        <h3 className="font-semibold mb-3" style={{ color: "var(--color-accent)" }}>
                            Vídeo Chamada
                        </h3>

                        {gamePhase === 'mime' ? (
                            <div className="space-y-3">
                                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative">
                                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                                        {currentMime} (Fazendo mímica)
                                    </div>
                                    <div className="text-white text-center">
                                        <div className="text-3xl mb-2">📹</div>
                                        <div>{currentMime}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {['Maria Santos', 'Pedro Costa', 'Ana Lima'].map((name, index) => (
                                        <div key={index} className="aspect-video bg-gray-200 rounded flex items-center justify-center text-xs">
                                            <Avatar nickname={name} size="sm" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Lima'].map((name, index) => (
                                    <div key={index} className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                                        <Avatar nickname={name} size="md" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-lg shadow-lg flex-1 flex flex-col">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold" style={{ color: "var(--color-accent)" }}>
                                Chat do Jogo
                            </h3>
                            <p className="text-xs text-gray-500">
                                {gamePhase === 'mime' ? 'Digite para adivinhar!' : 'Converse com sua equipe'}
                            </p>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto min-h-48">
                            <div className="text-center text-gray-500 text-sm">
                                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
                                    <span className="text-xl">💬</span>
                                </div>
                                Chat do jogo aqui...
                            </div>
                        </div>

                        <div className="p-4 border-t">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Digite sua resposta..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition-all duration-200 text-gray-800 placeholder-gray-500"
                                />
                                <Button variant="teal" className="px-4">
                                    Enviar
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hidden lg:block fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-white rounded-xl shadow-xl p-6 min-w-96">
                    {gamePhase === 'dice' && (
                        <div className="text-center">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">
                                    {isRolling ? (
                                        <div className="animate-spin">🎲</div>
                                    ) : (
                                        <div className="opacity-50">🎲</div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    {diceResult && (
                                        <div className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
                                            Resultado: {diceResult}
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleRollDice}
                                        disabled={isRolling}
                                        variant="primary"
                                        className="mt-2"
                                    >
                                        {isRolling ? 'Jogando...' : 'Jogar Dado'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {gamePhase === 'word-selection' && (
                        <div>
                            <h3 className="text-center text-lg font-semibold mb-4" style={{ color: "var(--color-accent)" }}>
                                Escolha uma categoria:
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { word: 'Cachorro', category: 'Eu sou', color: 'bg-blue-100 border-blue-300 text-blue-800' },
                                    { word: 'Correr', category: 'Eu faço', color: 'bg-green-100 border-green-300 text-green-800' },
                                    { word: 'Telefone', category: 'Objeto', color: 'bg-purple-100 border-purple-300 text-purple-800' }
                                ].map((item, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleWordSelection(item.word)}
                                        className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all text-center ${item.color}`}
                                    >
                                        <div className="text-xs opacity-70">{item.category}</div>
                                        <div className="font-semibold">{item.word}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {gamePhase === 'mime' && (
                        <div className="text-center">
                            <div className="flex items-center gap-4">
                                <div className="text-3xl">⏳</div>
                                <div className="flex-1">
                                    <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-700'}`}>
                                        {timeLeft} segundos
                                    </div>
                                    <div className="text-sm text-gray-500">restantes</div>
                                </div>
                            </div>
                            <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-3">
                                <p className="text-teal-800 font-semibold">
                                    Palavra: "Cachorro"
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showLeaveModal && (
                <Modal
                    isOpen={showLeaveModal}
                    onClose={() => setShowLeaveModal(false)}
                    title={
                        <div className="flex items-center gap-3">
                            <ArrowLeftEndOnRectangleIcon className="h-6 w-6 text-red-600" />
                            <span className="font-heading text-2xl">Sair da Partida</span>
                        </div>
                    }
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => router.push("/lobby")}
                            >
                                Sair
                            </Button>
                        </>
                    }
                >
                    <p className="text-gray-600">
                        Tem certeza que deseja abandonar a partida? Sua equipe perderá automaticamente.
                    </p>
                </Modal>
            )}
        </div>
    );
}