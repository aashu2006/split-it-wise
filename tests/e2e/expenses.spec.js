import { test, expect, openGroup, expenseRow, firstExpense } from "./fixtures";

const openAddExpense = async (page) => {
    await page.getByRole("button", { name: "add expense" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "add expense" })).toBeVisible();
    return dialog;
};

test("adding an equal split updates the list and your balance", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await expect(page.getByText("expenses (3)")).toBeVisible();

    const dialog = await openAddExpense(page);
    await dialog.getByLabel("amount (₹)").fill("300");
    await dialog.getByLabel("for").fill("Chai run");
    await dialog.getByRole("button", { name: "add expense" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("expenses (4)")).toBeVisible();
    await expect(expenseRow(page, "Chai run")).toContainText("₹100.00 each");
    // You paid ₹300 for three: you get back ₹200 more than before (₹300).
    await expect(page.getByText("you get back", { exact: true })).toBeVisible();
    await expect(page.getByText("₹500.00", { exact: true })).toBeVisible();
});

test("an exact split must add up to the total", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    const dialog = await openAddExpense(page);
    await dialog.getByLabel("amount (₹)").fill("100");
    await dialog.getByLabel("for").fill("Snacks");
    await dialog.getByRole("button", { name: "exact" }).click();

    await dialog.getByLabel("you", { exact: true }).fill("50");
    await dialog.getByLabel("Priya Nair").fill("30");
    await dialog.getByRole("button", { name: "add expense" }).click();
    await expect(dialog.getByText(/must add up to ₹100\.00/)).toBeVisible();

    await dialog.getByLabel("Rahul Verma").fill("20");
    await dialog.getByRole("button", { name: "add expense" }).click();
    await expect(dialog).toBeHidden();
    await expect(expenseRow(page, "Snacks")).toContainText("exact split");
});

test("a percentage split must add up to 100%", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    const dialog = await openAddExpense(page);
    await dialog.getByLabel("amount (₹)").fill("1000");
    await dialog.getByLabel("for").fill("Trip deposit");
    await dialog.getByRole("button", { name: "percent" }).click();

    await dialog.getByLabel("you", { exact: true }).fill("50");
    await dialog.getByLabel("Priya Nair").fill("30");
    await dialog.getByRole("button", { name: "add expense" }).click();
    await expect(dialog.getByText(/must add up to 100%/)).toBeVisible();

    await dialog.getByLabel("Rahul Verma").fill("20");
    await dialog.getByRole("button", { name: "add expense" }).click();
    await expect(dialog).toBeHidden();
    await expect(expenseRow(page, "Trip deposit")).toContainText("split by %");
});

test("tapping an expense opens it to edit; it keeps its place and is marked edited", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: /^Pizza night/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "edit expense" })).toBeVisible();
    await expect(dialog.getByLabel("amount (₹)")).toHaveValue("640");
    await expect(dialog.getByLabel("for")).toHaveValue("Pizza night");

    await dialog.getByRole("button", { name: "equal" }).click();
    await dialog.getByLabel("amount (₹)").fill("900");
    await dialog.getByLabel("for").fill("Pizza + drinks");
    await dialog.getByRole("button", { name: "save changes" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("expenses (3)")).toBeVisible();
    await expect(firstExpense(page)).toContainText("Pizza + drinks");
    await expect(firstExpense(page)).toContainText("₹300.00 each");
    await expect(firstExpense(page)).toContainText("edited");
});

test("only expenses you can change open when tapped", async ({ page }) => {
    // In Goa Trip Priya is admin; you added only the cab.
    await openGroup(page, "Goa Trip");
    await expect(page.getByRole("button", { name: /^Hotel, 2 nights/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Cab to the airport/ })).toHaveCount(1);
});

test("an expense involving someone who left can only be deleted", async ({ page }) => {
    // Cab to the airport was split with Sana, who has since left Goa Trip.
    await openGroup(page, "Goa Trip");
    await page.getByRole("button", { name: /^Cab to the airport/ }).click();

    const confirm = page.getByRole("dialog");
    await expect(confirm.getByRole("heading", { name: "can't edit this one" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "edit expense" })).toHaveCount(0);
    await confirm.getByRole("button", { name: "cancel" }).click();
    await expect(page.getByText("expenses (3)")).toBeVisible();
});

test("deleting an expense from its edit sheet asks first", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await page.getByRole("button", { name: /^Wifi bill/ }).click();
    await page.getByRole("button", { name: "delete expense" }).click();

    const confirm = page.getByRole("dialog").filter({ hasText: "delete this expense?" });
    await expect(confirm).toContainText("Wifi bill, ₹900.00");
    await confirm.getByRole("button", { name: "delete", exact: true }).click();

    await expect(page.getByText("expenses (2)")).toBeVisible();
    await expect(expenseRow(page, "Wifi bill")).toHaveCount(0);
});
