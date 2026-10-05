const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api").replace(/\/$/, "");

export class BackendContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BackendContractError";
    }
}

function reportAndThrow(detail: string): never {
    const message = [
        "BACKEND_CONTRACT_MISSING",
        "O backend em localhost recusou o contrato que este harness consome.",
        "Isso ja deveria estar em api-mimico origin/develop (474a2f0).",
        "Este repositorio nao aplica patches a API.",
        detail,
    ].join("\n");
    console.error(message);
    throw new BackendContractError(message);
}

async function readBody(response: Response): Promise<string> {
    try {
        return (await response.text()).slice(0, 500);
    } catch {
        return "";
    }
}

export async function assertBackendContract(): Promise<void> {
    let tablesResponse: Response;
    try {
        tablesResponse = await fetch(`${API_BASE}/tables`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "probe-contract" }),
        });
    } catch (error) {
        reportAndThrow(`POST ${API_BASE}/tables nao alcançou o servidor: ${String(error)}`);
    }

    if (tablesResponse.status === 404) {
        reportAndThrow(`POST ${API_BASE}/tables devolveu 404. Path HTTP de mesas em falta.`);
    }

    if (tablesResponse.status !== 401 && tablesResponse.status !== 403) {
        reportAndThrow(
            `POST ${API_BASE}/tables devolveu ${tablesResponse.status} (esperado 401/403 sem JWT). Body: ${await readBody(tablesResponse)}`
        );
    }

    let registerProbe: Response;
    try {
        registerProbe = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
    } catch (error) {
        reportAndThrow(`POST ${API_BASE}/auth/register nao alcançou o servidor: ${String(error)}`);
    }

    if (registerProbe.status === 404) {
        reportAndThrow(`POST ${API_BASE}/auth/register devolveu 404.`);
    }
}

export async function registerUser(user: { nickname: string; email: string; password: string }): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nickname: user.nickname,
            email: user.email,
            password: user.password,
        }),
    });

    if (!response.ok && response.status !== 409) {
        reportAndThrow(`POST ${API_BASE}/auth/register falhou (${response.status}): ${await readBody(response)}`);
    }
}

export { API_BASE };
