import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./validationSchemas";

describe("auth validation schemas", () => {
    it("blocks invalid register email, nickname and password confirmation", () => {
        const result = registerSchema.safeParse({
            nickname: "abc",
            email: "not-an-email",
            password: "Password1!",
            confirmPassword: "Password2!",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const fields = result.error.flatten().fieldErrors;
            expect(fields.email?.[0]).toBe("Email inválido.");
            expect(fields.nickname?.[0]).toBe("O nickname deve ter no mínimo 5 caracteres.");
            expect(fields.confirmPassword?.[0]).toBe("As senhas não coincidem.");
        }
    });

    it("blocks empty login credentials", () => {
        const result = loginSchema.safeParse({
            email: "",
            password: "",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const fields = result.error.flatten().fieldErrors;
            expect(fields.email?.[0]).toBe("Email inválido.");
            expect(fields.password?.[0]).toBe("O campo Senha é obrigatório.");
        }
    });
});
