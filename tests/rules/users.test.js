import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import { ALICE, BOB, EARLIER, anon, as, seed, setupRules } from "./helpers";

let env;
beforeAll(async () => {
    env = await setupRules();
});
afterAll(() => env.cleanup());

beforeEach(async () => {
    await env.clearFirestore();
    await seed(env, async (db) => {
        await setDoc(doc(db, "users", ALICE), {
            uid: ALICE,
            name: "Alice",
            photoURL: "",
            createdAt: EARLIER,
        });
        // Written before profiles stopped carrying an email.
        await setDoc(doc(db, "users", BOB), {
            uid: BOB,
            name: "Bob",
            email: "bob@example.com",
            photoURL: "",
            createdAt: EARLIER,
        });
    });
});

/** What syncUserProfile() writes for a first sign-in. */
const newProfile = (uid) => ({ uid, name: "New", photoURL: "", createdAt: serverTimestamp() });

describe("reading profiles", () => {
    it("lets any signed-in user fetch one by id", async () => {
        await assertSucceeds(getDoc(doc(as(env, BOB), "users", ALICE)));
    });

    it("refuses signed-out reads", async () => {
        await assertFails(getDoc(doc(anon(env), "users", ALICE)));
    });

    // Listing would hand out every user's name and UPI ID at once.
    it("refuses listing the collection", async () => {
        await assertFails(getDocs(collection(as(env, ALICE), "users")));
    });
});

describe("creating a profile", () => {
    it("allows your own, without an email", async () => {
        await assertSucceeds(setDoc(doc(as(env, "carol"), "users", "carol"), newProfile("carol")));
    });

    it("refuses one carrying an email", async () => {
        await assertFails(
            setDoc(doc(as(env, "carol"), "users", "carol"), {
                ...newProfile("carol"),
                email: "carol@example.com",
            })
        );
    });

    it("refuses one for somebody else", async () => {
        await assertFails(setDoc(doc(as(env, ALICE), "users", "carol"), newProfile("carol")));
    });

    it("refuses a uid that doesn't match the document", async () => {
        await assertFails(setDoc(doc(as(env, "carol"), "users", "carol"), newProfile("mallory")));
    });
});

describe("updating a profile", () => {
    it("lets an old profile strip its email (syncUserProfile)", async () => {
        await assertSucceeds(updateDoc(doc(as(env, BOB), "users", BOB), { email: deleteField() }));
    });

    it("saves a UPI ID that also strips the email (saveUpiId)", async () => {
        await assertSucceeds(
            updateDoc(doc(as(env, BOB), "users", BOB), { upiId: "bob@ybl", email: deleteField() })
        );
    });

    it("saves a UPI ID on a profile with no email to strip", async () => {
        await assertSucceeds(
            updateDoc(doc(as(env, ALICE), "users", ALICE), { upiId: "alice@ybl", email: deleteField() })
        );
    });

    it("refuses any update that leaves an old email in place", async () => {
        await assertFails(updateDoc(doc(as(env, BOB), "users", BOB), { upiId: "bob@ybl" }));
    });

    it("refuses putting an email back", async () => {
        await assertFails(updateDoc(doc(as(env, ALICE), "users", ALICE), { email: "a@example.com" }));
    });

    it("refuses unknown fields", async () => {
        await assertFails(updateDoc(doc(as(env, ALICE), "users", ALICE), { isAdmin: true }));
    });

    it("refuses changing your uid or join date", async () => {
        await assertFails(updateDoc(doc(as(env, ALICE), "users", ALICE), { uid: BOB }));
        await assertFails(
            updateDoc(doc(as(env, ALICE), "users", ALICE), { createdAt: serverTimestamp() })
        );
    });

    it("refuses editing someone else's profile", async () => {
        await assertFails(updateDoc(doc(as(env, ALICE), "users", BOB), { email: deleteField() }));
    });

    it("never allows deleting a profile", async () => {
        await assertFails(deleteDoc(doc(as(env, ALICE), "users", ALICE)));
    });
});
