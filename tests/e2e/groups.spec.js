import { test, expect, signIn, openGroup, openSettings } from "./fixtures";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("a new group shows up without a reload", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "new group" }).click();
    await page.getByLabel("name").fill("Flat 4B");
    await page.getByRole("dialog").getByRole("button", { name: "create group" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("link", { name: /Flat 4B/ })).toBeVisible();
});

test("the invite button copies the link", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "copy invite link" }).click();

    await expect(page.getByText("invite link copied")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/\/join\/demo-group-hostel$/);
});

test("the admin can rename the group from settings", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    const settings = await openSettings(page);
    await settings.getByLabel("name").fill("Room 202");
    await settings.getByRole("button", { name: "save" }).click();
    await expect(page.getByText("renamed")).toBeVisible();
    // The page behind an open sheet is hidden from assistive tech, so close it
    // before looking for the new heading.
    await page.keyboard.press("Escape");

    await expect(page.getByRole("heading", { name: "Room 202", level: 1 })).toBeVisible();
});

test("the admin can turn the invite link off and on", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    const settings = await openSettings(page);

    await settings.getByRole("button", { name: "turn link off" }).click();
    await expect(settings.getByText("the invite link is off")).toBeVisible();
    await settings.getByRole("button", { name: "turn link on" }).click();
    await expect(settings.getByRole("textbox", { name: "invite link" })).toBeVisible();
});

test("admin controls are hidden from everyone else", async ({ page }) => {
    // Priya is admin of Goa Trip, not you.
    await openGroup(page, "Goa Trip");
    const settings = await openSettings(page);
    await expect(settings.getByRole("button", { name: "save" })).toHaveCount(0);
    await expect(settings.getByRole("button", { name: /turn link/ })).toHaveCount(0);
    await expect(settings.getByRole("button", { name: "delete group" })).toHaveCount(0);
    await expect(settings.getByRole("button", { name: "remove" })).toHaveCount(0);
    await expect(settings.getByText("the invite link is off")).toBeVisible();
});

test("the invite button explains when the link is off", async ({ page }) => {
    await openGroup(page, "Goa Trip");
    await page.getByRole("button", { name: "copy invite link" }).click();
    await expect(page.getByText("ask the admin to turn it on")).toBeVisible();
});

test("someone who left with money outstanding stays in the ledger", async ({ page }) => {
    await openGroup(page, "Goa Trip");
    await expect(page.getByRole("list", { name: "balances" })).toContainText("Sana Khan");
    await expect(page.getByRole("list", { name: "balances" })).toContainText("left group");
    await expect(page.getByText("Sana Khan (left group) paid")).toBeVisible();
});

test("someone with money outstanding can't be removed", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    const settings = await openSettings(page);
    const rahul = settings.getByRole("listitem").filter({ hasText: "Rahul Verma" });
    await expect(rahul).toContainText("needs to pay ₹300.00, settle up first");
    await expect(rahul.getByRole("button", { name: "remove" })).toBeDisabled();
});

test("deleting a group asks first, then takes you home", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    const settings = await openSettings(page);
    await settings.getByRole("button", { name: "delete group" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "delete group" }).click();

    await expect(page.getByRole("heading", { name: "your groups" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Goa Trip/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Hostel Room 101/ })).toHaveCount(0);
});
