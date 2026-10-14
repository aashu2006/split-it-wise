import { defineConfig } from "vitest/config";

/**
 * Security rules tests. Kept apart from vitest.config.mjs because they need
 * the Firestore emulator running, which `npm run test:rules` takes care of.
 */
export default defineConfig({
    test: {
        include: ["tests/rules/**/*.test.js"],
        // Every file clears and reseeds the same emulator database, so they
        // can't run side by side.
        fileParallelism: false,
        testTimeout: 15_000,
        hookTimeout: 30_000,
    },
});
