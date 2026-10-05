export interface SmokeUser {
    role: "host" | "guest";
    nickname: string;
    email: string;
    password: string;
}

const PASSWORD = "SmokePass1!";

export function createFourUsers(runId = `${Date.now()}`): SmokeUser[] {
    const suffix = runId.replace(/[^a-zA-Z0-9]/g, "").slice(-8);
    return [
        { role: "host", nickname: `host_${suffix}`, email: `host.${suffix}@smoke.test`, password: PASSWORD },
        { role: "guest", nickname: `g1_${suffix}`, email: `g1.${suffix}@smoke.test`, password: PASSWORD },
        { role: "guest", nickname: `g2_${suffix}`, email: `g2.${suffix}@smoke.test`, password: PASSWORD },
        { role: "guest", nickname: `g3_${suffix}`, email: `g3.${suffix}@smoke.test`, password: PASSWORD },
    ];
}

export const TABLE_NAME = "Mesa smoke 4p";
