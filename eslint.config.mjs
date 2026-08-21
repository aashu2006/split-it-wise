import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

/**
 * There's no TypeScript compiler here any more, so this is the whole static
 * safety net: unused bindings, bad hook dependencies, and the Next-specific
 * mistakes that only show up as a slow page rather than an error.
 */
const eslintConfig = defineConfig([
    ...nextVitals,
    {
        rules: {
            /**
             * Downgraded from error, not switched off — the rule is right, but
             * every hit is a "fetch on mount, then setState" effect, and the
             * real fix is to move those reads onto Firestore onSnapshot
             * listeners so the data arrives as a subscription rather than as a
             * one-shot fetch the effect has to store. That's the "Real-time
             * updates" roadmap item, not something to paper over with a
             * per-line disable. Kept visible as a warning until then.
             */
            "react-hooks/set-state-in-effect": "warn",
        },
    },
    globalIgnores([".next/**", "out/**", "build/**"]),
]);

export default eslintConfig;
