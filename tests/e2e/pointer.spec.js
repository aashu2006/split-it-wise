import { test, expect, signIn, openGroup, openSettings } from "./fixtures";

/**
 * Everything you can click shows the pointer (hand) cursor, as on any other
 * website. Tailwind v4 stopped giving buttons one, so this used to be missed
 * one element at a time; globals.css now sets it for every clickable kind of
 * element, and these tests sweep each screen and sheet for anything left out.
 */

/** Visible, enabled, clickable elements on the page whose cursor isn't a pointer. */
const withoutPointer = (page) =>
    page.evaluate(() => {
        const clickable = [
            "a[href]",
            "button",
            "select",
            "summary",
            "label",
            'input[type="checkbox"]',
            'input[type="radio"]',
            '[role="button"]',
            '[role="menuitem"]',
            '[role="tab"]',
            '[role="option"]',
            '[role="switch"]',
            '[role="checkbox"]',
        ].join(",");
        return [...document.querySelectorAll(clickable)]
            .filter((el) => el.getClientRects().length > 0)
            .filter((el) => !el.closest("nextjs-portal"))
            .filter((el) => !el.disabled && el.getAttribute("aria-disabled") !== "true")
            .filter((el) => getComputedStyle(el).cursor !== "pointer")
            .map((el) => `<${el.tagName.toLowerCase()}> ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40)}`);
    });

const expectAllPointers = async (page, where) => {
    expect(await withoutPointer(page), `clickable things without a pointer on: ${where}`).toEqual([]);
};

test("landing, groups and the account menu", async ({ page }) => {
    await page.goto("/");
    await expectAllPointers(page, "landing");

    await signIn(page);
    await expectAllPointers(page, "your groups");

    await page.getByRole("button", { name: /^Account:/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expectAllPointers(page, "account menu");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "new group" }).click();
    await expectAllPointers(page, "new group sheet");
});

test("a group and every sheet it opens", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await expectAllPointers(page, "group");

    for (const split of ["equal", "exact", "percent"]) {
        await page.getByRole("button", { name: "add expense" }).click();
        await page.getByRole("dialog").getByRole("button", { name: split }).click();
        await expectAllPointers(page, `add expense, ${split} split`);
        await page.keyboard.press("Escape");
    }

    await page.getByRole("button", { name: /^Pizza night/ }).click();
    await expectAllPointers(page, "edit expense");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "mark paid" }).click();
    await expectAllPointers(page, "mark paid sheet");
    await page.keyboard.press("Escape");

    await openSettings(page);
    await expectAllPointers(page, "group settings");
});
