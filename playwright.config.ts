import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const reuseExistingServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    workers: 1,
    timeout: 180_000,
    expect: { timeout: 30_000 },
    reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
    use: {
        baseURL,
        viewport: { width: 1440, height: 900 },
        ignoreHTTPSErrors: true,
        trace: "retain-on-failure",
        video: "retain-on-failure",
    },
    webServer: reuseExistingServer
        ? undefined
        : {
              command: "npm run build && npm run start",
              url: baseURL,
              reuseExistingServer: !process.env.CI,
              timeout: 180_000,
              env: {
                  ...process.env,
                  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
                  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws",
                  NEXT_TELEMETRY_DISABLED: "1",
              },
          },
    projects: [
        {
            name: "chromium-fake-media",
            use: {
                ...devices["Desktop Chrome"],
                launchOptions: {
                    args: [
                        "--use-fake-ui-for-media-stream",
                        "--use-fake-device-for-media-stream",
                        "--autoplay-policy=no-user-gesture-required",
                    ],
                },
                permissions: ["camera", "microphone"],
            },
        },
    ],
});
