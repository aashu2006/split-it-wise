import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
    resolve: {
        // Mirrors the "@/*" path alias in jsconfig.json.
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        include: ["src/**/*.test.js"],
    },
});
