import { test, expect, openGroup } from "./fixtures";

test("balances are turned into the fewest payments", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await expect(page.getByText("Rahul Verma pays you ₹300.00")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark paid" })).toHaveCount(1);
});

test("marking a payment as paid settles the group", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "Mark paid" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Rahul Verma pays Aarav Shah");
    await dialog.getByRole("button", { name: "Mark as paid" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Everyone is settled up")).toBeVisible();
});

test("a part payment leaves the rest owing", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "Mark paid" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Amount (₹)").fill("100");
    await dialog.getByRole("button", { name: "Mark as paid" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Rahul Verma pays you ₹200.00")).toBeVisible();
});

test("paying more than is owed is refused", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "Mark paid" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Amount (₹)").fill("500");
    await dialog.getByRole("button", { name: "Mark as paid" }).click();
    await expect(dialog.getByText("That's more than the ₹300.00 owed")).toBeVisible();
});

test("a payment recorded by mistake can be undone", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "Mark paid" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mark as paid" }).click();
    await expect(page.getByText("Everyone is settled up")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Undo payment" }).click();

    await expect(page.getByText("Rahul Verma pays you ₹300.00")).toBeVisible();
});
