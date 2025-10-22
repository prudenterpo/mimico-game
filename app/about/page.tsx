"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {motion, Variants} from "framer-motion";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import Modal from "@/components/Modal";

export default function AboutPage() {
    const [isRulesOpen, setIsRulesOpen] = useState(false);

    const steps = [
        {
            number: 1,
            icon: "/icons/create_room.svg",
            title: "Monte sua mesa",
            text: "Crie uma mesa e convide seus amigos. São 4 jogadores em 2 equipes.",
        },
        {
            number: 2,
            icon: "/icons/dice_card.svg",
            title: "Role o dado e pegue o cartão",
            text: "Avance no tabuleiro e escolha uma das palavras sorteadas.",
        },
        {
            number: 3,
            icon: "/icons/mime_camera.svg",
            title: "Mime na câmera, acerte no chat",
            text: "Um faz a mímica, os outros tentam adivinhar no chat. Quem acerta continua!",
        },
    ];

    const container: Variants = {
        hidden: { opacity: 0, y: 10 },
        show: {
            opacity: 1,
            y: 0,
            transition: { staggerChildren: 0.15, delayChildren: 0.1 },
        },
    };

    const item: Variants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 180, damping: 20 },
        },
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FFF8F1] to-[#FAFAFA]">
            <header className="bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-4 py-3 flex-shrink-0">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-3 group"
                        aria-label="Voltar para a Home"
                    >
                        <Logo size="md" />
                        <h1
                            className="text-xl font-heading transition-opacity group-hover:opacity-90"
                            style={{ color: "var(--color-accent)" }}
                        >
                            Mímico
                        </h1>
                    </Link>

                    <Button
                        variant="ghost"
                        onClick={() => setIsRulesOpen(true)}
                        className="transition-colors hover:bg-black hover:text-white"
                    >
                        Regras do Jogo
                    </Button>
                </div>
            </header>

            <main className="flex-1 relative overflow-hidden">
                <div className="pointer-events-none">
                    <div
                        className="hidden md:block absolute bottom-0 left-0 opacity-90"
                        style={{ width: 500 }}
                    >
                        <Image
                            src="/left_main_illustration.svg"
                            alt=""
                            width={500}
                            height={380}
                            className="w-full h-auto object-contain"
                        />
                    </div>
                    <div
                        className="hidden md:block absolute bottom-0 right-0 opacity-90"
                        style={{ width: 420 }}
                    >
                        <Image
                            src="/right_main_illustration.svg"
                            alt=""
                            width={420}
                            height={340}
                            className="w-full h-auto object-contain"
                        />
                    </div>
                </div>

                <section className="relative z-10 max-w-6xl mx-auto px-4 py-20">
                    <div className="text-center mb-14">
                        <h2
                            className="text-4xl sm:text-5xl font-heading font-bold mb-3"
                            style={{ color: "var(--color-accent)" }}
                        >
                            Como jogar o Mímico
                        </h2>
                        <p className="text-gray-600 text-base sm:text-lg">
                            Três passos simples para começar a diversão
                        </p>
                    </div>

                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-3 gap-10 justify-items-center"
                    >
                        {steps.map((card, i) => (
                            <motion.div
                                key={i}
                                variants={item}
                                whileHover={{ scale: 1.03 }}
                                className="relative bg-white/95 backdrop-blur rounded-2xl shadow-lg hover:shadow-xl p-8 pt-14 w-full max-w-xs text-center transition-all"
                            >
                                <motion.div
                                    whileHover={{
                                        y: -2,
                                        boxShadow: "0 0 12px rgba(122,217,193,0.5)",
                                    }}
                                    className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--color-accent)]
                                        text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl
                                        font-bol shadow-[0_0_10px_rgba(122,217,193,0.8),0_0_20px_rgba(122,217,193,0.4)]"
                                >
                                    {card.number}
                                </motion.div>

                                <motion.div
                                    aria-hidden
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        repeatType: "mirror",
                                        ease: "easeInOut",
                                    }}
                                    className="mx-auto mb-5"
                                >
                                    <Image
                                        src={card.icon}
                                        alt=""
                                        width={64}
                                        height={64}
                                        style={{ filter: "invert(63%) sepia(35%) saturate(379%) hue-rotate(120deg) brightness(92%) contrast(93%)" }}
                                    />
                                </motion.div>

                                <h3 className="text-xl font-semibold mb-3 text-[var(--color-accent)]">
                                    {card.title}
                                </h3>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    {card.text}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>
            </main>

            <Modal
                isOpen={isRulesOpen}
                onClose={() => setIsRulesOpen(false)}
                title="Regras do Jogo"
            >
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                    <p>Resumo rápido para jogar bem:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Cada rodada traz 3 palavras — escolha uma e comece a mímica.</li>
                        <li>
                            Apenas gestos! As tentativas vão pelo chat e o sistema detecta o
                            acerto.
                        </li>
                        <li>
                            Acertou, continua; nas casas “Todos”, qualquer equipe pode ganhar
                            a vez.
                        </li>
                    </ul>
                </div>
            </Modal>
        </div>
    );
}
