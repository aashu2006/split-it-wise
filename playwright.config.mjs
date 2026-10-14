import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// The six variables lib/firebase.js needs. Blanking them, even when a
// .env.local is present, puts the app in demo mode: an in-memory store seeded
// with sample groups, so these tests never touch a real Firebase project and
// every test starts from the same data.
const DEMO_MODE_ENV = Object.fromEntries(
    [
        "NEXT_PUBLIC_FIREBASE_API_KEY",
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
        "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
        "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        "NEXT_PUBLIC_FIREBASE_APP_ID",
    ].map((name) => [name, ""])
);

export default defineConfig({
    testDir: "tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["list"]] : "list",
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "retain-on-failure",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        // Most people split bills from their phone.
        { name: "mobile", use: { ...devices["Pixel 7"] } },
    ],
    webServer: {
        // A production build, so the tests see what ships. Built into its own
        // folder so it never collides with a running `next dev`.
        command: `next build && next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        env: { ...DEMO_MODE_ENV, NEXT_DIST_DIR: ".next-e2e" },
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
});
