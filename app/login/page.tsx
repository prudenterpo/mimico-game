"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
    const router = useRouter();
    const login = useStore((state) => state.login);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            await login(email, password);
            router.push("/lobby");
        } catch (err: any) {
            setError(err.message || "Erro ao fazer login");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden"
            style={{ backgroundColor: 'var(--color-background)' }}
        >
            <div className="hidden md:block absolute bottom-0 left-0 opacity-90"
                 style={{width: '500px', height: 'auto'}}
            >
                <Image
                    src="/left_main_illustration.svg"
                    alt=""
                    width={400}
                    height={300}
                    className="w-full h-auto object-contain"
                />
            </div>

            <div className="hidden md:block absolute bottom-0 right-0 opacity-90"
                 style={{width: '400px', height: 'auto'}}>
                <Image
                    src="/right_main_illustration.svg"
                    alt=""
                    width={400}
                    height={300}
                    className="w-full h-auto object-contain"
                />
            </div>

            <div className="max-w-sm sm:max-w-md w-full text-center relative z-10">
                <div className="flex justify-center">
                    <Link href="/" className="transition-opacity hover:opacity-80">
                        <Logo size="lg" />
                    </Link>
                </div>

                <div className="space-y-6 sm:space-y-3">
                    <h1
                        className="text-3xl sm:text-4xl font-heading"
                        style={{ color: 'var(--color-accent)' }}
                    >
                        Entrar
                    </h1>
                    <p
                        className="text-base sm:text-lg px-2 mb-6"
                        style={{ color: 'var(--color-accent)' }}
                    >
                        Entre para jogar Mímico!
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium mb-2 text-left"
                                style={{ color: 'var(--color-accent)' }}
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition-all duration-200 text-gray-800 placeholder-gray-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium mb-2 text-left"
                                style={{ color: 'var(--color-accent)' }}
                            >
                                Senha
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition-all duration-200 text-gray-800 placeholder-gray-500"
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                isLoading={isLoading}
                                className="py-3 text-lg font-semibold"
                            >
                                Entrar
                            </Button>
                        </div>

                        <div className="text-center pt-4">
                            <p className="text-gray-600 text-sm">
                                Não tem conta?{" "}
                                <Link
                                    href="/register"
                                    className="font-semibold hover:underline transition-colors"
                                    style={{ color: 'var(--color-primary)' }}
                                >
                                    Registrar
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}