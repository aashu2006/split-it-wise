import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { Timestamp } from "firebase/firestore";

/**
 * Shared setup for the security rules tests.
 *
 * These run against the Firestore emulator, started by `npm run test:rules`,
 * which also sets FIRESTORE_EMULATOR_HOST so the test environment finds it.
 * Nothing here touches a real project: the "demo-" prefix makes the emulator
 * refuse to talk to production even if credentials are lying around.
 */
export const PROJECT_ID = "demo-split-it-wise";

export const setupRules = () =>
    initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });

/** Signed-in Firestore client for `uid`, subject to the rules. */
export const as = (env, uid) => env.authenticatedContext(uid).firestore();

/** Signed-out client. */
export const anon = (env) => env.unauthenticatedContext().firestore();

/** Write fixtures with the rules switched off. */
export const seed = (env, write) =>
    env.withSecurityRulesDisabled((ctx) => write(ctx.firestore()));

export const EARLIER = Timestamp.fromMillis(Date.UTC(2026, 0, 1));

/**
 * The cast every suite shares: a group run by ADMIN, with ALICE and BOB as
 * members. OUTSIDER is signed in but in no group, and GONE was removed from
 * it while still appearing in its history.
 */
export const ADMIN = "admin";
export const ALICE = "alice";
export const BOB = "bob";
export const OUTSIDER = "outsider";
export const GONE = "gone";
export const GROUP = "group1";

export const groupDoc = (overrides = {}) => ({
    name: "Hostel",
    adminId: ADMIN,
    members: [ADMIN, ALICE, BOB],
    joinOpen: true,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    ...overrides,
});
