"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";
import Link from "next/link";

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
            className="min-h-screen flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--color-background)' }}
        >
            <Card className="w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                            <span className="text-4xl">🐵</span>
                        </div>
                    </div>
                    <h1 className="text-3xl mb-2" style={{ color: 'var(--color-accent)' }}>
                        Entrar
                    </h1>
                    <p className="text-sm opacity-70" style={{ color: 'var(--color-accent)' }}>
                        Entre para jogar Mímico!
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="email"
                        label="Email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        fullWidth
                    />

                    <Input
                        type="password"
                        label="Senha"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        fullWidth
                    />

                    {error && (
                        <div
                            className="p-3 rounded-lg text-sm"
                            style={{
                                backgroundColor: 'rgba(243, 129, 129, 0.1)',
                                color: 'var(--color-error)'
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        isLoading={isLoading}
                    >
                        Entrar
                    </Button>

                    <div className="text-center text-sm" style={{ color: 'var(--color-accent)' }}>
                        Não tem conta?{" "}
                        <Link
                            href="/register"
                            className="font-semibold hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            Registrar
                        </Link>
                    </div>
                </form>
            </Card>
        </main>
    );
}