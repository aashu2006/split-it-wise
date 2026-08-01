import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    resolve: {
        // Mirrors the "@/*" path alias in tsconfig.json.
        alias: { "@": path.resolve(__dirname, "src") },
    },
    test: {
        include: ["src/**/*.test.ts"],
    },
});
