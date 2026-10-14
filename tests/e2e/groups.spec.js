import { test, expect, signIn, openGroup } from "./fixtures";

test("a new group shows up without a reload", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "+ Create Group" }).click();
    await page.getByLabel("Group Name").fill("Flat 4B");
    await page.getByRole("dialog").getByRole("button", { name: "Create Group" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Flat 4B")).toBeVisible();
});

test("the admin can rename the group", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "Rename" }).click();
    await page.locator("header input[type=text]").fill("Room 202");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "Room 202", level: 1 })).toBeVisible();
});

test("the admin can turn the invite link off and on", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "Turn link off" }).click();
    await expect(page.getByText("The invite link is off")).toBeVisible();
    await expect(page.getByRole("button", { name: /copy invite link/i })).toBeDisabled();

    await page.getByRole("button", { name: "Turn link on" }).click();
    await expect(page.getByRole("button", { name: /copy invite link/i })).toBeEnabled();
});

test("admin controls are hidden from everyone else", async ({ page }) => {
    // Priya is admin of Goa Trip, not you.
    await openGroup(page, "Goa Trip");
    await expect(page.getByRole("button", { name: "Rename" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete Group" })).toHaveCount(0);
    await expect(page.getByText("Invite link is off")).toBeVisible();
});

test("someone who left while owing money stays in the ledger", async ({ page }) => {
    await openGroup(page, "Goa Trip");
    await expect(page.getByText("Sana Khan").first()).toBeVisible();
    await expect(page.getByText("left group").first()).toBeVisible();
    await expect(page.getByText("Paid by Sana Khan (left group)")).toBeVisible();
});

test("deleting a group takes you home and removes it", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "Delete Group" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete Group" }).click();

    await expect(page.getByRole("heading", { name: "Your Groups" })).toBeVisible();
    await expect(page.getByText("Goa Trip")).toBeVisible();
    await expect(page.getByText("Hostel Room 101")).toHaveCount(0);
});
