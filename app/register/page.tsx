"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const register = useStore((state) => state.register);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validações
        if (password !== confirmPassword) {
            setError("As senhas não coincidem");
            return;
        }

        if (password.length < 8) {
            setError("A senha deve ter no mínimo 8 caracteres");
            return;
        }

        setIsLoading(true);

        try {
            await register(name, email, password);
            router.push("/lobby");
        } catch (err: any) {
            setError(err.message || "Erro ao registrar");
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
                        Registrar
                    </h1>
                    <p className="text-sm opacity-70" style={{ color: 'var(--color-accent)' }}>
                        Crie sua conta para começar a jogar!
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="text"
                        label="Nome"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        fullWidth
                    />

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

                    <Input
                        type="password"
                        label="Confirmar Senha"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                        Criar Conta
                    </Button>

                    <div className="text-center text-sm" style={{ color: 'var(--color-accent)' }}>
                        Já tem conta?{" "}
                        <Link
                            href="/login"
                            className="font-semibold hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            Entrar
                        </Link>
                    </div>
                </form>
            </Card>
        </main>
    );
}