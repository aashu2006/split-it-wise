import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import {
    ADMIN,
    ALICE,
    BOB,
    EARLIER,
    GONE,
    GROUP,
    OUTSIDER,
    as,
    groupDoc,
    seed,
    setupRules,
} from "./helpers";

const CAROL = "carol";

let env;
beforeAll(async () => {
    env = await setupRules();
});
afterAll(() => env.cleanup());

beforeEach(async () => {
    await env.clearFirestore();
    await seed(env, async (db) => {
        await setDoc(doc(db, "groups", GROUP), groupDoc({ members: [ADMIN, ALICE, BOB, CAROL] }));
        // Alice paid Bob back, and Carol was the one who logged it.
        await setDoc(doc(db, "settlements", "paid"), {
            groupId: GROUP,
            from: ALICE,
            to: BOB,
            amount: 100,
            createdBy: CAROL,
            createdAt: EARLIER,
        });
    });
});

const settlementRef = (uid, id = "paid") => doc(as(env, uid), "settlements", id);

/** What addSettlement() writes. */
const newSettlement = (overrides = {}) => ({
    groupId: GROUP,
    from: ALICE,
    to: BOB,
    amount: 50,
    createdBy: ALICE,
    createdAt: serverTimestamp(),
    ...overrides,
});

describe("reading settlements", () => {
    it("is allowed to members and refused to outsiders", async () => {
        await assertSucceeds(getDoc(settlementRef(BOB)));
        await assertFails(getDoc(settlementRef(OUTSIDER)));
    });
});

describe("recording a repayment", () => {
    it("allows it the way the app writes it", async () => {
        await assertSucceeds(addDoc(collection(as(env, ALICE), "settlements"), newSettlement()));
    });

    // Whoever is holding the phone when the cash changes hands logs it.
    it("allows a member to record one between two other members", async () => {
        await assertSucceeds(
            addDoc(collection(as(env, CAROL), "settlements"), newSettlement({ createdBy: CAROL }))
        );
    });

    it("refuses it to anyone outside the group", async () => {
        await assertFails(
            addDoc(collection(as(env, OUTSIDER), "settlements"), newSettlement({ createdBy: OUTSIDER }))
        );
    });

    it("refuses recording it under someone else's name", async () => {
        await assertFails(addDoc(collection(as(env, BOB), "settlements"), newSettlement()));
    });

    it("refuses paying yourself, non-members and non-positive amounts", async () => {
        const db = as(env, ALICE);
        await assertFails(addDoc(collection(db, "settlements"), newSettlement({ to: ALICE })));
        await assertFails(addDoc(collection(db, "settlements"), newSettlement({ to: GONE })));
        await assertFails(addDoc(collection(db, "settlements"), newSettlement({ from: GONE })));
        await assertFails(addDoc(collection(db, "settlements"), newSettlement({ amount: 0 })));
        await assertFails(addDoc(collection(db, "settlements"), newSettlement({ amount: "50" })));
    });
});

describe("changing a repayment", () => {
    it("is never allowed; delete and record it again instead", async () => {
        await assertFails(updateDoc(settlementRef(CAROL), { amount: 1 }));
        await assertFails(updateDoc(settlementRef(ADMIN), { amount: 1 }));
    });
});

describe("undoing a repayment", () => {
    it("is allowed to whoever logged it", async () => {
        await assertSucceeds(deleteDoc(settlementRef(CAROL)));
    });

    // Otherwise a member could log a repayment they never made, wiping their
    // own debt, and the person supposedly paid couldn't take it back.
    it("is allowed to either side of the payment", async () => {
        await assertSucceeds(deleteDoc(settlementRef(BOB)));
    });

    it("is allowed to the payer too", async () => {
        await assertSucceeds(deleteDoc(settlementRef(ALICE)));
    });

    it("is allowed to the admin", async () => {
        await assertSucceeds(deleteDoc(settlementRef(ADMIN)));
    });

    it("is refused to uninvolved members and outsiders", async () => {
        // Dave is in the group but had nothing to do with this payment.
        await seed(env, (db) =>
            setDoc(doc(db, "groups", GROUP), groupDoc({ members: [ADMIN, ALICE, BOB, CAROL, "dave"] }))
        );
        await assertFails(deleteDoc(settlementRef("dave")));
        await assertFails(deleteDoc(settlementRef(OUTSIDER)));
    });
});
