"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { iconButtonClass } from "@/components/ui/kit";

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
            type="button"
            className={iconButtonClass}
            aria-label="Switch between light and dark mode"
        >
            <SunIcon className="hidden h-[18px] w-[18px] dark:block" strokeWidth={1.6} />
            <MoonIcon className="block h-[18px] w-[18px] dark:hidden" strokeWidth={1.6} />
        </button>
    );
}
