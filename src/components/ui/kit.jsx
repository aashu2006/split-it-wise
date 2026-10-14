"use client";

import { DropdownMenu } from "radix-ui";
import { useTheme } from "next-themes";

/**
 * The handful of pieces every screen is built from, so the look is decided in
 * one place: a mono label, an outlined button with its action on the right,
 * a quiet icon button, and the header row.
 */

export const REPO_URL = "https://github.com/aashu2006/split-it-wise";

/** Small mono caption above a section ("settle up", "balances"). */
export const labelClass = "font-mono text-xs text-subtle";

/**
 * The app's one button shape: mono text on the left, a hint (+, →) on the
 * right, a hairline border. `solid` raises it onto the muted surface for the
 * main action on a screen.
 */
export const buttonClass = (solid = false) =>
    `flex h-12 w-full items-center justify-between rounded-md border border-border px-4 font-mono text-sm text-foreground transition-colors hover:border-subtle disabled:opacity-50 ${
        solid ? "bg-muted" : "bg-transparent"
    }`;

/** A compact outlined button for inline actions ("mark paid"). */
export const smallButtonClass =
    "h-11 shrink-0 rounded-md border border-border bg-transparent px-3.5 font-mono text-[13px] text-foreground transition-colors hover:border-subtle disabled:opacity-50";

/** Text inputs and selects. */
export const fieldClass =
    "h-12 w-full rounded-md border border-border bg-transparent px-3.5 text-[15px] text-foreground placeholder:text-subtle focus:border-subtle focus:outline-none disabled:opacity-50";

/** ₹1,200.00 — Indian digit grouping, always two decimals. */
export const formatRupees = (amount) =>
    `₹${Math.abs(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

/**
 * @param {Object} props
 * @param {string} props.label - What the button does, for screen readers
 * @param {import("react").ReactNode} props.children - The icon
 */
export function IconButton({ label, children, className = "", ...props }) {
    return (
        <button
            type="button"
            aria-label={label}
            className={`flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

/** The header row: something on the left, actions on the right. */
export function AppHeader({ left, right }) {
    return (
        <header className="flex h-16 items-center justify-between">
            <div className="flex items-center">{left}</div>
            <div className="-mr-3 flex items-center">{right}</div>
        </header>
    );
}

/** The wordmark, which doubles as the logo. */
export function Wordmark() {
    return <span className="font-mono text-[13px] text-muted-foreground">split-it-wise</span>;
}

export function GitHubIcon({ size = 18 }) {
    return (
        <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
    );
}

/** Icon link to the repository, for the header. */
export function GitHubLink() {
    return (
        <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="split-it-wise on GitHub"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
            <GitHubIcon />
        </a>
    );
}

const menuItemClass =
    "flex h-11 cursor-pointer items-center justify-between rounded-sm px-3 font-mono text-[13px] text-foreground outline-none data-[highlighted]:bg-muted";

/**
 * The signed-in user's menu: theme, the repository, and logging out. Lives
 * behind the initial in the header so the header itself stays empty.
 *
 * @param {Object} props
 * @param {string} props.name - Shown as the initial and at the top of the menu
 * @param {string} [props.email]
 * @param {() => void} props.onLogout
 */
export function AccountMenu({ name, email, onLogout }) {
    const { resolvedTheme, setTheme } = useTheme();
    const initial = (name || "?").trim().charAt(0).toLowerCase();

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    aria-label={`Account: ${name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-md"
                >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border font-mono text-xs text-foreground">
                        {initial}
                    </span>
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    className="z-50 min-w-56 rounded-md border border-border bg-background p-1 shadow-lg"
                >
                    <div className="px-3 py-2.5">
                        <p className="text-sm text-foreground">{name}</p>
                        {email && <p className="mt-0.5 text-xs text-muted-foreground">{email}</p>}
                    </div>
                    <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
                    <DropdownMenu.Item
                        className={menuItemClass}
                        onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    >
                        {/* Worded by the CSS-driven class, not resolvedTheme, so the
                            label is right on the first paint (see ThemeToggle). */}
                        <span className="dark:hidden">dark mode</span>
                        <span className="hidden dark:inline">light mode</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild className={menuItemClass}>
                        <a href={REPO_URL} target="_blank" rel="noreferrer">
                            contribute on github
                            <GitHubIcon size={14} />
                        </a>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
                    <DropdownMenu.Item className={menuItemClass} onSelect={onLogout}>
                        log out
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

/**
 * "2h ago", "3d ago", or a date once it's older than a few weeks: how long
 * since something happened, for list subtitles.
 *
 * @param {import("firebase/firestore").Timestamp | Date | null | undefined} timestamp
 * @returns {string}
 */
export const timeAgo = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 28) return `${Math.round(days / 7)}w ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }).toLowerCase();
};
