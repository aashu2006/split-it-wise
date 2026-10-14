import { test, expect, openGroup, expenseRow } from "./fixtures";

const expenseDialog = (page) => page.getByRole("dialog");

test("adding an equal split updates the list and everyone's balance", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await expect(page.getByText("Expenses (3)")).toBeVisible();

    await page.getByRole("button", { name: "+ Add Expense" }).click();
    const dialog = expenseDialog(page);
    await dialog.getByLabel("Amount (₹)").fill("300");
    await dialog.getByLabel("Description").fill("Chai run");
    await dialog.getByRole("button", { name: "Add Expense" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Expenses (4)")).toBeVisible();
    await expect(expenseRow(page, "Chai run")).toContainText("₹100.00 each");
    // You paid ₹300 for three: you're now owed ₹200 more than before (₹300).
    await expect(page.getByText("Is owed ₹500.00")).toBeVisible();
});

test("an exact split must add up to the total", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "+ Add Expense" }).click();
    const dialog = expenseDialog(page);
    await dialog.getByLabel("Amount (₹)").fill("100");
    await dialog.getByLabel("Description").fill("Snacks");
    await dialog.getByRole("button", { name: "Exact" }).click();

    const shares = dialog.locator('input[type="number"]:not(#amount)');
    await shares.nth(0).fill("50");
    await shares.nth(1).fill("30");
    await dialog.getByRole("button", { name: "Add Expense" }).click();
    await expect(dialog.getByText(/must add up to ₹100\.00/)).toBeVisible();

    await shares.nth(2).fill("20");
    await dialog.getByRole("button", { name: "Add Expense" }).click();
    await expect(dialog).toBeHidden();
    await expect(expenseRow(page, "Snacks")).toContainText("Exact split");
});

test("a percentage split must add up to 100%", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: "+ Add Expense" }).click();
    const dialog = expenseDialog(page);
    await dialog.getByLabel("Amount (₹)").fill("1000");
    await dialog.getByLabel("Description").fill("Trip deposit");
    await dialog.getByRole("button", { name: "Percent" }).click();

    const percents = dialog.locator('input[type="number"]:not(#amount)');
    await percents.nth(0).fill("50");
    await percents.nth(1).fill("30");
    await dialog.getByRole("button", { name: "Add Expense" }).click();
    await expect(dialog.getByText(/must add up to 100%/)).toBeVisible();

    await percents.nth(2).fill("20");
    await dialog.getByRole("button", { name: "Add Expense" }).click();
    await expect(dialog).toBeHidden();
    await expect(expenseRow(page, "Trip deposit")).toContainText("By % split");
});

test("editing an expense keeps its place and marks it edited", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await expenseRow(page, "Pizza night").getByRole("button", { name: "Edit" }).click();

    const dialog = expenseDialog(page);
    await expect(dialog.getByRole("heading", { name: "Edit Expense" })).toBeVisible();
    await expect(dialog.getByLabel("Amount (₹)")).toHaveValue("640");
    await expect(dialog.getByLabel("Description")).toHaveValue("Pizza night");

    await dialog.getByRole("button", { name: "Equal" }).click();
    await dialog.getByLabel("Amount (₹)").fill("900");
    await dialog.getByLabel("Description").fill("Pizza + drinks");
    await dialog.getByRole("button", { name: "Save Changes" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Expenses (3)")).toBeVisible();
    const first = page.getByRole("list", { name: "Expenses" }).getByRole("listitem").first();
    await expect(first).toContainText("Pizza + drinks");
    await expect(first).toContainText("₹300.00 each");
    await expect(first).toContainText("edited");
});

test("an expense involving someone who left can't be edited", async ({ page }) => {
    // Cab to the airport was split with Sana, who has since left Goa Trip.
    await openGroup(page, "Goa Trip");
    await expenseRow(page, "Cab to the airport").getByRole("button", { name: "Edit" }).click();

    await expect(page.getByText(/left the group, so it can't be edited/)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("deleting an expense asks first, then removes it", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await expenseRow(page, "Wifi bill").getByRole("button", { name: "Delete" }).click();

    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("Delete ₹900.00");
    await confirm.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Expenses (2)")).toBeVisible();
    await expect(expenseRow(page, "Wifi bill")).toHaveCount(0);
});
