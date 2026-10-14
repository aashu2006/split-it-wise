import { test, expect, signIn } from "./fixtures";

test("landing page explains the app and offers sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Owed or owing?");
    await expect(page.getByRole("button", { name: /continue with google/i }).first()).toBeVisible();
});

test("signing in shows your groups, in demo mode", async ({ page }) => {
    await signIn(page);
    await expect(page.getByText("demo", { exact: true })).toBeVisible();
    await expect(page.getByText("Hostel Room 101")).toBeVisible();
    await expect(page.getByText("Goa Trip")).toBeVisible();
});

test("search engines may index the landing page but not groups or invites", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /group/");
    expect(robots).toContain("Disallow: /join/");

    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.name).toBe("Split-It-Wise");

    const preview = await request.get("/opengraph-image.png");
    expect(preview.ok()).toBe(true);
    expect(preview.headers()["content-type"]).toBe("image/png");
});

test("security headers are sent", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-powered-by"]).toBeUndefined();
});
