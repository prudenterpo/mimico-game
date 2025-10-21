"use client";

import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/Logo";
import Button from "@/components/Button";

export default function AboutPage() {
    return (
        <main
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden"
            style={{ backgroundColor: "var(--color-background)" }}
        >
            {/* Illustrações de fundo */}
            <div
                className="hidden md:block absolute bottom-0 left-0 opacity-90"
                style={{ width: "500px", height: "auto" }}
            >
                <Image
                    src="/left_main_illustration.svg"
                    alt=""
                    width={400}
                    height={300}
                    className="w-full h-auto object-contain"
                />
            </div>

            <div
                className="hidden md:block absolute bottom-0 right-0 opacity-90"
                style={{ width: "400px", height: "auto" }}
            >
                <Image
                    src="/right_main_illustration.svg"
                    alt=""
                    width={400}
                    height={300}
                    className="w-full h-auto object-contain"
                />
            </div>

            {/* Conteúdo */}
            <div className="max-w-4xl w-full text-center relative z-10">
                <div className="flex justify-center mb-4">
                    <Logo size="lg" />
                </div>

                <h1
                    className="text-4xl sm:text-5xl font-heading mb-6"
                    style={{ color: "var(--color-accent)" }}
                >
                    Como jogar o Mímico 🎭
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                    {/* Card 1 */}
                    <div className="bg-white/80 backdrop-blur-md border-2 border-[#7AD9C1] rounded-2xl shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition">
                        <Image
                            src="/icons/signup.svg"
                            alt="Cadastro"
                            width={60}
                            height={60}
                            className="mb-4"
                        />
                        <h2 className="text-xl font-semibold mb-2 text-[var(--color-accent)]">
                            1. Faça seu cadastro
                        </h2>
                        <p className="text-gray-700 text-sm">
                            Crie sua conta e personalize seu avatar. É rápido e gratuito!
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white/80 backdrop-blur-md border-2 border-[#7AD9C1] rounded-2xl shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition">
                        <Image
                            src="/icons/table.svg"
                            alt="Mesa de jogo"
                            width={60}
                            height={60}
                            className="mb-4"
                        />
                        <h2 className="text-xl font-semibold mb-2 text-[var(--color-accent)]">
                            2. Crie uma mesa
                        </h2>
                        <p className="text-gray-700 text-sm">
                            Inicie uma mesa e configure as regras da partida.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white/80 backdrop-blur-md border-2 border-[#7AD9C1] rounded-2xl shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition">
                        <Image
                            src="/icons/friends.svg"
                            alt="Amigos"
                            width={60}
                            height={60}
                            className="mb-4"
                        />
                        <h2 className="text-xl font-semibold mb-2 text-[var(--color-accent)]">
                            3. Convide até 3 amigos
                        </h2>
                        <p className="text-gray-700 text-sm">
                            Envie o link da sua mesa e joguem em vídeo chamada!
                        </p>
                    </div>

                    {/* Card 4 (opcional) */}
                    <div className="bg-white/80 backdrop-blur-md border-2 border-[#7AD9C1] rounded-2xl shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition">
                        <Image
                            src="/icons/mime.svg"
                            alt="Mímica"
                            width={60}
                            height={60}
                            className="mb-4"
                        />
                        <h2 className="text-xl font-semibold mb-2 text-[var(--color-accent)]">
                            4. Faça sua melhor mímica!
                        </h2>
                        <p className="text-gray-700 text-sm">
                            Use criatividade, gesto e expressão — mas sem falar!
                        </p>
                    </div>
                </div>

                {/* Botão voltar */}
                <div className="mt-10">
                    <Link href="/">
                        <Button variant="outlined">Voltar à Home</Button>
                    </Link>
                </div>
            </div>
        </main>
    );
}
