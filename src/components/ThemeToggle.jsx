"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

/**
 * Light/dark switch.
 *
 * Both icons are always rendered and CSS picks which one shows, rather than
 * branching in JS on the current theme. The server has no idea what "system"
 * will resolve to in the browser, so any JS branch here is a guaranteed
 * hydration mismatch — the usual workaround is a mounted flag and a blank
 * placeholder on the first paint, which flickers. Letting the `dark` class on
 * <html> do the choosing means the correct icon is right from the first frame.
 */
export default function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Toggle light or dark theme"
        >
            <SunIcon className="w-5 h-5 hidden dark:block" />
            <MoonIcon className="w-5 h-5 block dark:hidden" />
        </button>
    );
}
