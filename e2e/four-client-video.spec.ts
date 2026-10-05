import { test, expect, chromium, type Browser } from "@playwright/test";
import { TABLE_NAME, createFourUsers } from "./fixtures/fourUsers";
import { assertBackendContract, registerUser } from "./helpers/backendContract";
import {
    acceptInvite,
    assertFourVideoTiles,
    assignTwoAndTwo,
    chromiumFakeMediaArgs,
    createTableWithThreeInvites,
    loginViaUi,
    openIsolatedClient,
} from "./helpers/players";

test.describe.configure({ mode: "serial" });

test("four Chromium clients reach a match with fake-camera video tiles", async () => {
    await assertBackendContract();

    const users = createFourUsers();
    const [host, ...guests] = users;
    for (const user of users) {
        await registerUser(user);
    }

    const browser: Browser = await chromium.launch({
        args: chromiumFakeMediaArgs(),
    });

    const clients = [];
    try {
        for (const user of users) {
            clients.push(await openIsolatedClient(browser, user));
        }

        for (const client of clients) {
            await loginViaUi(client.page, client.user);
        }

        const hostClient = clients[0];
        const guestClients = clients.slice(1);

        const tableId = await createTableWithThreeInvites(hostClient.page, guests, TABLE_NAME);

        for (const guest of guestClients) {
            await acceptInvite(guest.page);
        }

        await expect(hostClient.page.locator("article").filter({ hasText: "Aceito" })).toHaveCount(4, { timeout: 60_000 });

        await assignTwoAndTwo(hostClient.page, users.map((user) => user.nickname));
        await expect(hostClient.page.getByRole("button", { name: "Iniciar partida" })).toBeEnabled({ timeout: 30_000 });
        await hostClient.page.getByRole("button", { name: "Iniciar partida" }).click();

        for (const client of clients) {
            await client.page.waitForURL(`**/game/${tableId}`, { timeout: 60_000 });
            await expect(client.page).toHaveURL(new RegExp(`/game/${tableId}`));
            await assertFourVideoTiles(client.page);
        }
    } finally {
        await Promise.all(clients.map((client) => client.context.close()));
        await browser.close();
    }
});
