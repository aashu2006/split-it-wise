import { test, expect, signIn } from "./fixtures";

test("landing page explains the app and offers sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("split bills, not friendships.");
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "split-it-wise on GitHub" })).toBeVisible();
});

test("signing in shows your groups and what you get back or pay in each", async ({ page }) => {
    await signIn(page);
    await expect(page.getByText("demo", { exact: true })).toBeVisible();

    const groups = page.getByRole("list", { name: "your groups" });
    await expect(groups.getByRole("listitem").filter({ hasText: "Hostel Room 101" })).toContainText(
        "+300.00you get back"
    );
    await expect(groups.getByRole("listitem").filter({ hasText: "Goa Trip" })).toContainText(
        "−400.00you pay"
    );
    // +300 here and −400 there.
    await expect(page.getByText("overall you need to pay ₹100.00")).toBeVisible();
});

test("dark mode is the default, and light mode is one tap away", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Switch between light and dark mode" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // The choice sticks across a reload.
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("the account menu switches theme and logs out", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("menuitem", { name: "light mode" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: /^Account:/ }).click();
    await expect(page.getByRole("menuitem", { name: /contribute on github/ })).toHaveAttribute(
        "href",
        "https://github.com/aashu2006/split-it-wise"
    );
    await page.getByRole("menuitem", { name: "log out" }).click();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});

test("buttons show a pointer cursor", async ({ page }) => {
    await page.goto("/");
    const cursor = await page
        .getByRole("button", { name: /continue with google/i })
        .evaluate((element) => getComputedStyle(element).cursor);
    expect(cursor).toBe("pointer");
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
