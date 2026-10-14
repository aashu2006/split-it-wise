import { test, expect, openGroup } from "./fixtures";

const toMake = (page) => page.getByRole("list", { name: "payments to make" });

test("balances are turned into the fewest payments", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await expect(toMake(page)).toContainText("Rahul Verma → you ₹300.00");
    await expect(page.getByRole("button", { name: "mark paid" })).toHaveCount(1);
});

test("balances use plain words, never owe or owing", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await expect(page.getByText("you get back", { exact: true })).toBeVisible();
    await expect(page.locator("main, body")).not.toContainText(/\bow(e|ed|es|ing)\b/i);
});

test("marking a payment as paid settles the group", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "mark paid" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Rahul Verma → you");
    await dialog.getByRole("button", { name: "mark as paid" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("everyone is settled up.")).toBeVisible();
    await expect(page.getByText("you're all settled")).toBeVisible();
});

test("a part payment leaves the rest to pay", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "mark paid" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("amount (₹)").fill("100");
    await dialog.getByRole("button", { name: "mark as paid" }).click();

    await expect(dialog).toBeHidden();
    await expect(toMake(page)).toContainText("Rahul Verma → you ₹200.00");
});

test("paying more than is due is refused", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "mark paid" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("amount (₹)").fill("500");
    await dialog.getByRole("button", { name: "mark as paid" }).click();
    await expect(dialog.getByText("that's more than the ₹300.00 to pay")).toBeVisible();
});

test("a payment recorded by mistake can be undone", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "mark paid" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "mark as paid" }).click();
    await expect(page.getByText("everyone is settled up.")).toBeVisible();

    await page.getByRole("list", { name: "recorded payments" }).getByRole("button", { name: "undo" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "undo payment" }).click();

    await expect(toMake(page)).toContainText("Rahul Verma → you ₹300.00");
});
