import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
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
    GROUP,
    OUTSIDER,
    anon,
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

beforeEach(async () => {
    await env.clearFirestore();
    await seed(env, async (db) => {
        await setDoc(doc(db, "groups", GROUP), groupDoc());
        await setDoc(doc(db, "groups", "closed"), groupDoc({ joinOpen: false }));
        // Created before the invite switch existed: no joinOpen at all.
        const { joinOpen: _, ...legacy } = groupDoc();
        await setDoc(doc(db, "groups", "legacy"), legacy);
    });
});

const groupRef = (uid, id = GROUP) => doc(as(env, uid), "groups", id);

/** What createGroup() writes. */
const newGroup = (adminId) => ({
    name: "Trip",
    adminId,
    members: [adminId],
    joinOpen: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
});

describe("reading groups", () => {
    // The invite page needs the group before the visitor is a member, so the
    // unguessable group id is what keeps it private.
    it("lets any signed-in user fetch one by id", async () => {
        await assertSucceeds(getDoc(groupRef(OUTSIDER)));
    });

    it("refuses signed-out reads", async () => {
        await assertFails(getDoc(doc(anon(env), "groups", GROUP)));
    });

    it("lets you list the groups you belong to", async () => {
        const db = as(env, ALICE);
        await assertSucceeds(
            getDocs(query(collection(db, "groups"), where("members", "array-contains", ALICE)))
        );
    });

    it("refuses listing every group", async () => {
        await assertFails(getDocs(collection(as(env, ALICE), "groups")));
    });
});

describe("creating a group", () => {
    it("allows one you admin and are the only member of", async () => {
        await assertSucceeds(setDoc(doc(as(env, ALICE), "groups", "new"), newGroup(ALICE)));
    });

    it("refuses making someone else the admin", async () => {
        await assertFails(setDoc(doc(as(env, ALICE), "groups", "new"), newGroup(BOB)));
    });

    it("refuses adding other members up front", async () => {
        await assertFails(
            setDoc(doc(as(env, ALICE), "groups", "new"), { ...newGroup(ALICE), members: [ALICE, BOB] })
        );
    });

    it("refuses unknown fields and a non-boolean joinOpen", async () => {
        await assertFails(
            setDoc(doc(as(env, ALICE), "groups", "new"), { ...newGroup(ALICE), premium: true })
        );
        await assertFails(
            setDoc(doc(as(env, ALICE), "groups", "new"), { ...newGroup(ALICE), joinOpen: "yes" })
        );
    });
});

describe("joining through an invite link", () => {
    /** What addMemberToGroup() writes. */
    const join = (uid, id) =>
        updateDoc(groupRef(uid, id), { members: arrayUnion(uid), updatedAt: serverTimestamp() });

    it("lets you add yourself while the link is on", async () => {
        await assertSucceeds(join(OUTSIDER, GROUP));
    });

    it("treats a group with no joinOpen field as open", async () => {
        await assertSucceeds(join(OUTSIDER, "legacy"));
    });

    it("refuses once the admin has turned the link off", async () => {
        await assertFails(join(OUTSIDER, "closed"));
    });

    it("refuses adding someone other than yourself", async () => {
        await assertFails(
            updateDoc(groupRef(OUTSIDER), {
                members: arrayUnion("friend"),
                updatedAt: serverTimestamp(),
            })
        );
    });

    it("refuses changing anything else on the way in", async () => {
        await assertFails(
            updateDoc(groupRef(OUTSIDER), {
                members: arrayUnion(OUTSIDER),
                name: "Mine now",
                updatedAt: serverTimestamp(),
            })
        );
        await assertFails(
            updateDoc(groupRef(OUTSIDER), {
                members: arrayUnion(OUTSIDER),
                joinOpen: false,
                updatedAt: serverTimestamp(),
            })
        );
    });

    it("refuses joining without stamping updatedAt", async () => {
        await assertFails(updateDoc(groupRef(OUTSIDER), { members: arrayUnion(OUTSIDER) }));
    });
});

describe("admin changes", () => {
    const stamp = (changes) => ({ ...changes, updatedAt: serverTimestamp() });

    it("lets the admin rename the group", async () => {
        await assertSucceeds(updateDoc(groupRef(ADMIN), stamp({ name: "Room 202" })));
    });

    it("lets the admin remove a member", async () => {
        await assertSucceeds(updateDoc(groupRef(ADMIN), stamp({ members: arrayRemove(BOB) })));
    });

    it("lets the admin turn the invite link off and on", async () => {
        await assertSucceeds(updateDoc(groupRef(ADMIN), stamp({ joinOpen: false })));
        await assertSucceeds(updateDoc(groupRef(ADMIN, "closed"), stamp({ joinOpen: true })));
    });

    it("refuses handing the group to someone else", async () => {
        await assertFails(updateDoc(groupRef(ADMIN), stamp({ adminId: ALICE })));
    });

    it("refuses the admin removing themselves", async () => {
        await assertFails(updateDoc(groupRef(ADMIN), stamp({ members: arrayRemove(ADMIN) })));
    });

    it("refuses changes without stamping updatedAt", async () => {
        await assertFails(updateDoc(groupRef(ADMIN), { name: "Room 202" }));
    });

    it("refuses unknown fields and a non-boolean joinOpen", async () => {
        await assertFails(updateDoc(groupRef(ADMIN), stamp({ premium: true })));
        await assertFails(updateDoc(groupRef(ADMIN), stamp({ joinOpen: "no" })));
    });

    it("refuses all of it to a plain member", async () => {
        await assertFails(updateDoc(groupRef(ALICE), stamp({ name: "Alice's now" })));
        await assertFails(updateDoc(groupRef(ALICE), stamp({ members: arrayRemove(BOB) })));
        await assertFails(updateDoc(groupRef(ALICE), stamp({ joinOpen: false })));
    });
});

describe("deleting a group", () => {
    it("is allowed to the admin", async () => {
        await assertSucceeds(deleteDoc(groupRef(ADMIN)));
    });

    it("is refused to members and outsiders", async () => {
        await assertFails(deleteDoc(groupRef(ALICE)));
        await assertFails(deleteDoc(groupRef(OUTSIDER)));
    });
});
