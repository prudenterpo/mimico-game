"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/validation/validationSchemas";
import { z } from "zod";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import Link from "next/link";
import Image from "next/image";
import Input from "@/components/Input";

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const login = useStore((state) => state.login);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const translateError = (msg: string) => {
        const lower = msg.toLowerCase();
        if (lower.includes("invalid credentials")) return "Email ou senha incorretos.";
        if (lower.includes("user not found")) return "Usuário não encontrado.";
        if (lower.includes("password")) return "Senha inválida ou incorreta.";
        if (lower.includes("email")) return "Email inválido.";
        if (lower.includes("required")) return "Preencha todos os campos obrigatórios.";
        if (lower.includes("invalid")) return "Credenciais inválidas. Verifique e tente novamente.";
        return "Erro ao fazer login. Tente novamente.";
    };

    const onSubmit = async (data: LoginForm) => {
        try {
            await login(data.email, data.password);
            router.push("/lobby");
        } catch (err: any) {
            const dataResp = err?.response?.data;
            let message = "Erro ao fazer login. Verifique suas credenciais.";

            if (dataResp?.message) message = translateError(dataResp.message);

            if (dataResp?.validationErrors) {
                Object.entries<string>(dataResp.validationErrors).forEach(([field, msg]) => {
                    setError(field as keyof LoginForm, { message: translateError(msg) });
                });
            } else {
                setError("root", { message });
            }
        }
    };

    return (
        <main
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden"
            style={{ backgroundColor: "var(--color-background)" }}
        >
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

            <div className="max-w-sm sm:max-w-md w-full text-center relative z-10">
                <div className="flex justify-center">
                    <Link href="/" className="transition-opacity hover:opacity-80">
                        <Logo size="lg" />
                    </Link>
                </div>

                <div className="space-y-6 sm:space-y-3">
                    <h1
                        className="text-3xl sm:text-4xl font-heading"
                        style={{ color: "var(--color-accent)" }}
                    >
                        Entrar
                    </h1>
                    <p
                        className="text-base sm:text-lg px-2 mb-6"
                        style={{ color: "var(--color-accent)" }}
                    >
                        Entre para jogar Mímico!
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                        <Input
                            id="email"
                            label="Email"
                            type="email"
                            placeholder="seu@email.com"
                            fullWidth
                            autoFocus
                            {...register("email")}
                            error={errors.email?.message}
                        />

                        <Input
                            id="password"
                            label="Senha"
                            type="password"
                            placeholder="••••••••"
                            fullWidth
                            {...register("password")}
                            error={errors.password?.message}
                        />

                        {errors.root?.message && (
                            <p className="text-sm text-red-500 text-left mt-1 animate-fadeIn">
                                {errors.root.message}
                            </p>
                        )}

                        <div className="pt-2">
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                isLoading={isSubmitting}
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
                                    style={{ color: "var(--color-primary)" }}
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
