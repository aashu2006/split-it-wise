import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
    addDoc,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
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

let env;
beforeAll(async () => {
    env = await setupRules();
});
afterAll(() => env.cleanup());

const stored = (overrides) => ({
    groupId: GROUP,
    description: "Groceries",
    createdAt: EARLIER,
    paidBy: ALICE,
    createdBy: ALICE,
    ...overrides,
});

beforeEach(async () => {
    await env.clearFirestore();
    await seed(env, async (db) => {
        await setDoc(doc(db, "groups", GROUP), groupDoc());
        await setDoc(
            doc(db, "expenses", "alices"),
            stored({ amount: 90, splitType: "equal", splits: { [ADMIN]: 30, [ALICE]: 30, [BOB]: 30 } })
        );
        await setDoc(
            doc(db, "expenses", "percent"),
            stored({
                amount: 100,
                splitType: "percentage",
                splits: { [ALICE]: 50, [BOB]: 50 },
                percentages: { [ALICE]: 50, [BOB]: 50 },
            })
        );
        // GONE has since been removed from the group.
        await setDoc(
            doc(db, "expenses", "withLeaver"),
            stored({ amount: 60, splitType: "equal", splits: { [ALICE]: 30, [GONE]: 30 } })
        );
        // From before splits were stored at all.
        await setDoc(doc(db, "expenses", "legacy"), stored({ amount: 30 }));
    });
});

const expenseRef = (uid, id) => doc(as(env, uid), "expenses", id);

/** What addExpense() writes. */
const newExpense = (overrides = {}) => ({
    groupId: GROUP,
    amount: 30,
    description: "Chai",
    paidBy: ALICE,
    createdBy: ALICE,
    splitType: "equal",
    splits: { [ALICE]: 15, [BOB]: 15 },
    createdAt: serverTimestamp(),
    ...overrides,
});

/** What updateExpense() writes. */
const edit = (overrides = {}) => ({
    amount: 120,
    description: "Groceries + snacks",
    paidBy: BOB,
    splitType: "exact",
    splits: { [ALICE]: 60, [BOB]: 60 },
    percentages: deleteField(),
    updatedAt: serverTimestamp(),
    ...overrides,
});

describe("reading expenses", () => {
    it("lets members list their group's expenses, as the app queries them", async () => {
        const db = as(env, BOB);
        await assertSucceeds(
            getDocs(
                query(
                    collection(db, "expenses"),
                    where("groupId", "==", GROUP),
                    orderBy("createdAt", "desc")
                )
            )
        );
    });

    it("refuses them to anyone outside the group", async () => {
        await assertFails(getDoc(expenseRef(OUTSIDER, "alices")));
        await assertFails(
            getDocs(query(collection(as(env, OUTSIDER), "expenses"), where("groupId", "==", GROUP)))
        );
    });
});

describe("adding an expense", () => {
    it("allows it the way the app writes it", async () => {
        await assertSucceeds(addDoc(collection(as(env, ALICE), "expenses"), newExpense()));
    });

    it("allows storing percentages with a percentage split", async () => {
        await assertSucceeds(
            addDoc(
                collection(as(env, ALICE), "expenses"),
                newExpense({ splitType: "percentage", percentages: { [ALICE]: 50, [BOB]: 50 } })
            )
        );
    });

    it("refuses it to anyone outside the group", async () => {
        await assertFails(
            addDoc(collection(as(env, OUTSIDER), "expenses"), newExpense({ createdBy: OUTSIDER }))
        );
    });

    it("refuses recording it under someone else's name", async () => {
        await assertFails(addDoc(collection(as(env, BOB), "expenses"), newExpense()));
    });

    it("refuses payers and splits outside the group", async () => {
        const db = as(env, ALICE);
        await assertFails(addDoc(collection(db, "expenses"), newExpense({ paidBy: GONE })));
        await assertFails(
            addDoc(collection(db, "expenses"), newExpense({ splits: { [ALICE]: 15, [GONE]: 15 } }))
        );
    });

    it("refuses bad amounts, split types and descriptions", async () => {
        const db = as(env, ALICE);
        await assertFails(addDoc(collection(db, "expenses"), newExpense({ amount: 0 })));
        await assertFails(addDoc(collection(db, "expenses"), newExpense({ amount: "30" })));
        await assertFails(addDoc(collection(db, "expenses"), newExpense({ amount: 10_000_000 })));
        await assertFails(addDoc(collection(db, "expenses"), newExpense({ splitType: "vibes" })));
        await assertFails(
            addDoc(collection(db, "expenses"), newExpense({ description: "a".repeat(201) }))
        );
    });

    it("refuses unknown fields and a backdated createdAt", async () => {
        const db = as(env, ALICE);
        await assertFails(addDoc(collection(db, "expenses"), newExpense({ approved: true })));
        await assertFails(addDoc(collection(db, "expenses"), newExpense({ createdAt: EARLIER })));
    });
});

describe("editing an expense", () => {
    it("is allowed to whoever added it", async () => {
        await assertSucceeds(updateDoc(expenseRef(ALICE, "alices"), edit()));
    });

    it("is allowed to the admin, on anyone's expense", async () => {
        await assertSucceeds(updateDoc(expenseRef(ADMIN, "alices"), edit()));
    });

    it("is refused to other members and outsiders", async () => {
        await assertFails(updateDoc(expenseRef(BOB, "alices"), edit()));
        await assertFails(updateDoc(expenseRef(OUTSIDER, "alices"), edit()));
    });

    it("can switch to a percentage split and store the percentages", async () => {
        await assertSucceeds(
            updateDoc(
                expenseRef(ALICE, "alices"),
                edit({ splitType: "percentage", percentages: { [ALICE]: 50, [BOB]: 50 } })
            )
        );
    });

    it("can switch away from one and drop them", async () => {
        await assertSucceeds(updateDoc(expenseRef(ALICE, "percent"), edit()));
    });

    it("can give an expense from before stored splits its first splits", async () => {
        await assertSucceeds(updateDoc(expenseRef(ALICE, "legacy"), edit()));
    });

    it("refuses it once the expense involves someone who has left", async () => {
        await assertFails(
            updateDoc(expenseRef(ALICE, "withLeaver"), {
                description: "fixed typo",
                updatedAt: serverTimestamp(),
            })
        );
    });

    it("refuses moving it to another group or changing who added it or when", async () => {
        const ref = expenseRef(ALICE, "alices");
        await assertFails(updateDoc(ref, edit({ groupId: "elsewhere" })));
        await assertFails(updateDoc(ref, edit({ createdBy: BOB })));
        await assertFails(updateDoc(ref, edit({ createdAt: serverTimestamp() })));
    });

    it("refuses an edit without stamping updatedAt", async () => {
        const { updatedAt: _, ...unstamped } = edit();
        await assertFails(updateDoc(expenseRef(ALICE, "alices"), unstamped));
    });

    it("holds an edit to the same checks as a new expense", async () => {
        const ref = expenseRef(ALICE, "alices");
        await assertFails(updateDoc(ref, edit({ amount: 0 })));
        await assertFails(updateDoc(ref, edit({ paidBy: GONE })));
        await assertFails(updateDoc(ref, edit({ splits: { [ALICE]: 60, [GONE]: 60 } })));
        await assertFails(updateDoc(ref, edit({ description: "a".repeat(201) })));
        await assertFails(updateDoc(ref, edit({ approved: true })));
    });
});

describe("deleting an expense", () => {
    it("is allowed to whoever added it, and to the admin", async () => {
        await assertSucceeds(deleteDoc(expenseRef(ALICE, "alices")));
        await assertSucceeds(deleteDoc(expenseRef(ADMIN, "percent")));
    });

    it("is refused to other members", async () => {
        await assertFails(deleteDoc(expenseRef(BOB, "alices")));
    });
});
