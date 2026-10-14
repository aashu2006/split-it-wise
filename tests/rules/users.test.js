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
        // Written back when profiles also stored an email and a UPI ID.
        await setDoc(doc(db, "users", BOB), {
            uid: BOB,
            name: "Bob",
            email: "bob@example.com",
            upiId: "bob@ybl",
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

    // Listing would hand out every user's name and photo at once.
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
    it("lets an old profile strip its email and UPI ID (syncUserProfile)", async () => {
        await assertSucceeds(
            updateDoc(doc(as(env, BOB), "users", BOB), {
                email: deleteField(),
                upiId: deleteField(),
            })
        );
    });

    it("refuses an update that leaves a retired field in place", async () => {
        await assertFails(updateDoc(doc(as(env, BOB), "users", BOB), { email: deleteField() }));
        await assertFails(updateDoc(doc(as(env, BOB), "users", BOB), { upiId: deleteField() }));
        await assertFails(updateDoc(doc(as(env, BOB), "users", BOB), { name: "Robert" }));
    });

    it("refuses putting an email or UPI ID back", async () => {
        await assertFails(updateDoc(doc(as(env, ALICE), "users", ALICE), { email: "a@example.com" }));
        await assertFails(updateDoc(doc(as(env, ALICE), "users", ALICE), { upiId: "alice@ybl" }));
    });

    it("lets you change your own name or photo", async () => {
        await assertSucceeds(
            updateDoc(doc(as(env, ALICE), "users", ALICE), { name: "Alice P", photoURL: "x" })
        );
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
        await assertFails(
            updateDoc(doc(as(env, ALICE), "users", BOB), { email: deleteField(), upiId: deleteField() })
        );
    });

    it("never allows deleting a profile", async () => {
        await assertFails(deleteDoc(doc(as(env, ALICE), "users", ALICE)));
    });
});
