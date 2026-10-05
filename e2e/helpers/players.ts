import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { SmokeUser } from "../fixtures/fourUsers";

const FAKE_MEDIA_ARGS = [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
];

export async function openIsolatedClient(browser: Browser, user: SmokeUser): Promise<{
    context: BrowserContext;
    page: Page;
    user: SmokeUser;
}> {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        permissions: ["camera", "microphone"],
        locale: "pt-BR",
    });
    const page = await context.newPage();
    return { context, page, user };
}

export function chromiumFakeMediaArgs(): string[] {
    return [...FAKE_MEDIA_ARGS];
}

export async function loginViaUi(page: Page, user: SmokeUser): Promise<void> {
    await page.goto("/login");
    await page.locator("#email").fill(user.email);
    await page.locator("#password").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL("**/lobby", { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Criar Mesa" }).first()).toBeVisible();
}

export async function acceptInvite(page: Page): Promise<void> {
    await expect(page.getByText("Convite para jogar")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Aceitar" }).click();
    await page.waitForURL("**/table/**", { timeout: 30_000 });
}

export async function createTableWithThreeInvites(hostPage: Page, guests: SmokeUser[], tableName: string): Promise<string> {
    await hostPage.getByRole("button", { name: "Criar Mesa" }).first().click();
    await expect(hostPage.getByText("Criar Nova Mesa")).toBeVisible();
    await hostPage.getByPlaceholder("Ex: Mesa dos Silvas").fill(tableName);

    for (const guest of guests) {
        await expect(hostPage.getByText(guest.email)).toBeVisible({ timeout: 60_000 });
        await hostPage.getByRole("button", { name: new RegExp(guest.nickname) }).click();
    }

    await hostPage.getByRole("button", { name: "Criar Mesa" }).last().click();
    await hostPage.waitForURL("**/table/**", { timeout: 30_000 });
    const match = hostPage.url().match(/\/table\/([^/?#]+)/);
    if (!match) {
        throw new Error(`Nao foi possivel ler tableId a partir de ${hostPage.url()}`);
    }
    return match[1];
}

export async function assignTwoAndTwo(hostPage: Page, nicknames: string[]): Promise<void> {
    const teamA = hostPage.getByRole("region", { name: "Time A" });
    const teamB = hostPage.getByRole("region", { name: "Time B" });
    await teamA.getByRole("button", { name: new RegExp(nicknames[0]) }).click();
    await teamA.getByRole("button", { name: new RegExp(nicknames[1]) }).click();
    await teamB.getByRole("button", { name: new RegExp(nicknames[2]) }).click();
    await teamB.getByRole("button", { name: new RegExp(nicknames[3]) }).click();
}

export async function assertFourVideoTiles(page: Page): Promise<void> {
    const tiles = page.locator('[data-testid^="media-tile-"]');
    await expect(tiles).toHaveCount(4, { timeout: 60_000 });

    const setupOrMime = page.getByText(/Sorteio inicial|mimica principal/);
    await expect(setupOrMime.first()).toBeVisible({ timeout: 30_000 });

    const localVideoHasFakeStream = await page.evaluate(async () => {
        const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('section[aria-label="Video da partida"] video'));
        if (videos.length < 4) return false;
        const withStream = videos.find((video) => video.srcObject instanceof MediaStream);
        if (!withStream || !(withStream.srcObject instanceof MediaStream)) return false;
        return withStream.srcObject.getVideoTracks().length > 0;
    });
    expect(localVideoHasFakeStream, "esperava stream de camera falsa num dos tiles de video").toBe(true);
}
