import { test, expect, signIn, openGroup, openSettings } from "./fixtures";

/**
 * Everything you can click looks clickable, as on any website: the pointer
 * (hand) cursor, and a visible change when the mouse is over it (it lights
 * up, its border brightens, or its text underlines). These sweep every
 * screen and sheet for anything that doesn't.
 */

const CLICKABLE = [
    "a[href]",
    "button",
    "select",
    "summary",
    'input[type="checkbox"]',
    'input[type="radio"]',
    '[role="button"]',
    '[role="menuitem"]',
    '[role="tab"]',
    '[role="option"]',
    '[role="switch"]',
].join(",");

/**
 * Tags every visible, enabled clickable element in the active layer (an open
 * sheet or menu, else the page) with data-audit=<n>, and returns how many.
 */
const tagClickables = (page) =>
    page.evaluate((selector) => {
        const layer =
            document.querySelector('[role="menu"]') ??
            [...document.querySelectorAll('[role="dialog"]')].at(-1) ??
            document.body;
        const found = [...layer.querySelectorAll(selector)]
            .filter((el) => el.getClientRects().length > 0)
            .filter((el) => !el.closest("nextjs-portal"))
            .filter((el) => !el.disabled && el.getAttribute("aria-disabled") !== "true")
            // A selected tab is already showing its "on" state.
            .filter((el) => el.getAttribute("aria-pressed") !== "true");
        document.querySelectorAll("[data-audit]").forEach((el) => el.removeAttribute("data-audit"));
        found.forEach((el, i) => el.setAttribute("data-audit", String(i)));
        return found.length;
    }, CLICKABLE);

/** What the element looks like, including the row or label it sits in. */
const appearance = (element) =>
    element.evaluate((el) => {
        const looks = [];
        for (let node = el, depth = 0; node && depth < 3; node = node.parentElement, depth++) {
            const s = getComputedStyle(node);
            looks.push(
                [s.backgroundColor, s.color, s.borderColor, s.textDecorationLine, s.opacity].join("|")
            );
        }
        return { looks: looks.join(" / "), cursor: getComputedStyle(el).cursor };
    });

const expectAllClickablesLookClickable = async (page, where) => {
    // Hover states animate; turn that off so the check reads the end state.
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });

    const count = await tagClickables(page);
    const problems = [];
    for (let i = 0; i < count; i++) {
        const element = page.locator(`[data-audit="${i}"]`);
        const label = ((await element.getAttribute("aria-label")) || (await element.innerText()) || "")
            .trim()
            .slice(0, 40);

        await page.mouse.move(0, 0);
        const before = await appearance(element);
        await element.hover();
        const after = await appearance(element);

        if (before.cursor !== "pointer") problems.push(`${label}: cursor is ${before.cursor}`);
        if (before.looks === after.looks) {
            const tag = await element.evaluate((el) => `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}>`);
            problems.push(`${tag} ${label}: nothing changes on hover`);
        }
    }
    await page.mouse.move(0, 0);
    expect(problems, `on ${where}`).toEqual([]);
};

// Hover only exists with a mouse.
test.skip(({ isMobile }) => isMobile, "no hover on touch screens");

test("landing, groups and the account menu", async ({ page }) => {
    await page.goto("/");
    await expectAllClickablesLookClickable(page, "landing");

    await signIn(page);
    await expectAllClickablesLookClickable(page, "your groups");

    await page.getByRole("button", { name: /^Account:/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expectAllClickablesLookClickable(page, "account menu");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "new group" }).click();
    await expectAllClickablesLookClickable(page, "new group sheet");
});

test("a group and every sheet it opens", async ({ page }) => {
    await openGroup(page, "Hostel Room 101");
    await expectAllClickablesLookClickable(page, "group");

    for (const split of ["equal", "exact", "percent"]) {
        await page.getByRole("button", { name: "add expense" }).click();
        await page.getByRole("dialog").getByRole("button", { name: split }).click();
        await expectAllClickablesLookClickable(page, `add expense, ${split} split`);
        await page.keyboard.press("Escape");
    }

    await page.getByRole("button", { name: /^Pizza night/ }).click();
    await expectAllClickablesLookClickable(page, "edit expense");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "mark paid" }).click();
    await expectAllClickablesLookClickable(page, "mark paid sheet");
    await page.keyboard.press("Escape");

    await openSettings(page);
    await expectAllClickablesLookClickable(page, "group settings");
});
