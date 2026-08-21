"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Thin wrapper so layout.jsx can stay a server component — next-themes needs
 * to run on the client, and re-exporting it through a "use client" file is the
 * cheapest way to keep the boundary in one place.
 *
 * @param {Object} props
 * @param {import("react").ReactNode} props.children
 */
export function ThemeProvider({ children, ...props }) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
