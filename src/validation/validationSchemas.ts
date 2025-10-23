import { z } from "zod";

export const registerSchema = z
    .object({
        nickname: z
            .string()
            .min(5, "O nickname deve ter no mínimo 5 caracteres.")
            .max(20, "O nickname deve ter no máximo 20 caracteres.")
            .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, hífens ou underlines."),
        email: z.string().email("Email inválido."),
        password: z
            .string()
            .min(8, "A senha deve ter no mínimo 8 caracteres.")
            .max(100, "A senha deve ter no máximo 100 caracteres.")
            .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
            .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula.")
            .regex(/[0-9]/, "A senha deve conter pelo menos um número.")
            .regex(/[@$!%*?&#]/, "A senha deve conter pelo menos um caractere especial."),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "As senhas não coincidem.",
        path: ["confirmPassword"],
    });

export const loginSchema = z.object({
    email: z.string().email("Email inválido."),
    password: z.string().min(1, "O campo Senha é obrigatório."),
});
