"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/stores/store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/validation/validationSchemas";
import { z } from "zod";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import Link from "next/link";
import Image from "next/image";
import Input from "@/components/Input";

type RegisterData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const registerUser = useStore((state) => state.register);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<RegisterData>({
        resolver: zodResolver(registerSchema),
    });

    const translateError = (msg: string) => {
        const m = msg.toLowerCase();
        if (m.includes("uppercase")) return "A senha deve conter pelo menos uma letra maiúscula.";
        if (m.includes("lowercase")) return "A senha deve conter pelo menos uma letra minúscula.";
        if (m.includes("number")) return "A senha deve conter pelo menos um número.";
        if (m.includes("special character")) return "A senha deve conter pelo menos um caractere especial.";
        if (m.includes("nickname")) return "O nickname deve ser uma única palavra, contendo apenas letras, números, hífens ou underlines.";
        if (m.includes("invalid")) return "Os dados enviados são inválidos. Verifique e tente novamente.";
        return msg;
    };

    const onSubmit = async (data: RegisterData) => {
        try {
            await registerUser(data.nickname, data.email, data.password);
            router.push("/lobby");
        } catch (err: any) {
            const dataResp = err?.response?.data;
            let message = "Erro ao registrar. Verifique os dados e tente novamente.";

            if (dataResp?.message) message = translateError(dataResp.message);

            if (dataResp?.validationErrors) {
                Object.entries<string>(dataResp.validationErrors).forEach(([field, raw]) => {
                    setError(field as keyof RegisterData, { message: translateError(raw) });
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
                        Registrar
                    </h1>
                    <p
                        className="text-base sm:text-lg px-2 mb-6"
                        style={{ color: "var(--color-accent)" }}
                    >
                        Crie sua conta para começar a jogar!
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                        <Input
                            id="nickname"
                            label="Nickname"
                            placeholder="Seu nickname"
                            required
                            fullWidth
                            autoFocus
                            {...register("nickname")}
                            error={errors.nickname?.message}
                        />

                        <Input
                            id="email"
                            label="Email"
                            type="email"
                            placeholder="seu@email.com"
                            required
                            fullWidth
                            {...register("email")}
                            error={errors.email?.message}
                        />

                        <Input
                            id="password"
                            label="Senha"
                            type="password"
                            placeholder="••••••••"
                            required
                            fullWidth
                            {...register("password")}
                            error={errors.password?.message}
                        />

                        <Input
                            id="confirmPassword"
                            label="Confirmar Senha"
                            type="password"
                            placeholder="••••••••"
                            required
                            fullWidth
                            {...register("confirmPassword")}
                            error={errors.confirmPassword?.message}
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
                                Criar Conta
                            </Button>
                        </div>

                        <div className="text-center pt-4">
                            <p className="text-gray-600 text-sm">
                                Já tem conta?{" "}
                                <Link
                                    href="/login"
                                    className="font-semibold hover:underline transition-colors"
                                    style={{ color: "var(--color-primary)" }}
                                >
                                    Entrar
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
