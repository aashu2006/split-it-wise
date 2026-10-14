import { test as base, expect } from "@playwright/test";

/**
 * Shared setup for the end-to-end tests.
 *
 * The app runs in demo mode here (see playwright.config.mjs): signing in opens
 * a sample account, and every test gets a fresh browser context, so each one
 * starts from the same seeded groups. What the seed contains:
 *
 *   Hostel Room 101   you are admin; Aarav (you), Priya Nair, Rahul Verma
 *                     Pizza night ₹640 (exact), Wifi bill ₹900, Groceries ₹1200
 *                     → Rahul needs to pay you ₹300
 *   Goa Trip          Priya is admin; invite link off; Sana has left but still
 *                     has money to get back; one recorded repayment
 */
export const test = base.extend({
    // Any uncaught error in the page fails the test, even if every assertion
    // passed: a crash in a corner of the UI is still a bug.
    // (Playwright calls the second argument `use`; renamed so the React
    // hooks lint rule doesn't mistake it for React's use().)
    page: async ({ page }, provide) => {
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await provide(page);
        expect(errors, "uncaught errors in the page").toEqual([]);
    },
});

export { expect };

/** Sign in to the demo account and land on the groups list. */
export const signIn = async (page) => {
    await page.goto("/");
    await page.getByRole("button", { name: /continue with google/i }).click();
    await expect(page.getByRole("heading", { name: "your groups" })).toBeVisible();
};

/** Sign in and open one of the seeded groups. */
export const openGroup = async (page, name) => {
    await signIn(page);
    await page.getByRole("link", { name: new RegExp(name) }).click();
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
};

/** The row for one expense in the group's expense list. */
export const expenseRow = (page, description) =>
    page.getByRole("list", { name: "expenses" }).getByRole("listitem").filter({ hasText: description });

/** The newest expense row. */
export const firstExpense = (page) =>
    page.getByRole("list", { name: "expenses" }).first().getByRole("listitem").first();

/** Open the gear sheet. */
export const openSettings = async (page) => {
    await page.getByRole("button", { name: "group settings" }).click();
    await expect(page.getByRole("heading", { name: "group settings" })).toBeVisible();
    return page.getByRole("dialog");
};
