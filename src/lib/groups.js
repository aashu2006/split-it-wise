import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { calculateBalancesByUid } from "./calculations";

/**
 * Create a new group
 * @param {string} name - Group name
 * @param {string} adminId - User ID of the creator (becomes admin)
 * @returns {Promise<string>} Group ID
 */
export const createGroup = async (name, adminId) => {
    const groupRef = doc(collection(db, "groups"));
    const groupId = groupRef.id;

    await setDoc(groupRef, {
        name,
        adminId,
        members: [adminId], // Creator is automatically a member
        joinOpen: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return groupId;
};

/**
 * Get all groups where user is a member
 * @param {string} userId - User ID
 * @returns {Promise<import("@/types").Group[]>} Array of groups
 */
export const getUserGroups = async (userId) => {
    const groupsRef = collection(db, "groups");
    const q = query(groupsRef, where("members", "array-contains", userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
};

/**
 * Get a single group by ID
 * @param {string} groupId - Group ID
 * @returns {Promise<import("@/types").Group | null>} Group or null if not found
 */
export const getGroup = async (groupId) => {
    const groupRef = doc(db, "groups", groupId);
    const snapshot = await getDoc(groupRef);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data(),
    };
};

/**
 * Add a user to a group
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID to add
 * @returns {Promise<void>}
 */
export const addMemberToGroup = async (groupId, userId) => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
        members: arrayUnion(userId),
        updatedAt: serverTimestamp(),
    });
};

/**
 * Remove a member from a group (admin only)
 *
 * Refuses to remove anyone who still owes or is owed money. Expenses can only
 * reference current members, so a removed member cannot be settled up until
 * they rejoin — letting them leave mid-debt strands the balance.
 *
 * This check can only run on the client: security rules can't sum a
 * collection. It guards against accidents rather than a determined admin, but
 * calculateBalancesByUid keeps a removed member in the ledger either way, so a
 * bypass no longer loses the money.
 *
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID to remove
 * @param {string} requesterId - User ID making the request (must be admin)
 * @returns {Promise<void>}
 */
export const removeMemberFromGroup = async (groupId, userId, requesterId) => {
    const group = await getGroup(groupId);
    if (!group) throw new Error("Group not found");
    if (group.adminId !== requesterId) throw new Error("Only admin can remove members");
    if (userId === group.adminId) throw new Error("Admin cannot be removed");

    // Queried here rather than through lib/expenses and lib/settlements to keep
    // this module free of a circular import (both of those import getGroup from
    // this file).
    const [expenses, settlements] = await Promise.all([
        getDocs(query(collection(db, "expenses"), where("groupId", "==", groupId))),
        getDocs(query(collection(db, "settlements"), where("groupId", "==", groupId))),
    ]);
    const balances = calculateBalancesByUid(
        expenses.docs.map((expense) => expense.data()),
        group.members,
        settlements.docs.map((settlement) => settlement.data())
    );

    const balance = balances[userId] ?? 0;
    if (balance !== 0) {
        throw new Error(
            balance > 0
                ? `They are still owed ₹${balance.toFixed(2)}. Settle up before removing them.`
                : `They still owe ₹${Math.abs(balance).toFixed(2)}. Settle up before removing them.`
        );
    }

    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
        members: arrayRemove(userId),
        updatedAt: serverTimestamp(),
    });
};

/**
 * Turn the group's invite link on or off (admin only)
 *
 * The invite link is just the group id, so it can't be rotated: anyone who has
 * ever seen it holds it forever, and removing a member doesn't stop them
 * walking back in. Closing the group is the only revocation available without
 * a backend to mint and expire real tokens.
 *
 * @param {string} groupId - Group ID
 * @param {boolean} joinOpen - true to accept new members via the link, false to refuse
 * @param {string} requesterId - User ID making the request (must be admin)
 * @returns {Promise<void>}
 */
export const setGroupJoinOpen = async (groupId, joinOpen, requesterId) => {
    const group = await getGroup(groupId);
    if (!group) throw new Error("Group not found");
    if (group.adminId !== requesterId) throw new Error("Only admin can change the invite link");

    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
        joinOpen,
        updatedAt: serverTimestamp(),
    });
};

/**
 * Update group name (admin only)
 * @param {string} groupId - Group ID
 * @param {string} newName - New group name
 * @param {string} requesterId - User ID making the request (must be admin)
 * @returns {Promise<void>}
 */
export const updateGroupName = async (groupId, newName, requesterId) => {
    const group = await getGroup(groupId);
    if (!group) throw new Error("Group not found");
    if (group.adminId !== requesterId) throw new Error("Only admin can rename group");

    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
        name: newName,
        updatedAt: serverTimestamp(),
    });
};

// Firestore allows 500 writes per batch, but the rule for deleting someone
// else's expense or settlement reads the group document, and a batched write
// gets only 20 document reads for the whole request. In practice those reads
// hit the same group and are cached, so larger batches pass — 20 is the size
// that stays within budget even if they aren't.
const CASCADE_DELETE_BATCH_SIZE = 20;

/**
 * Delete a group and every expense in it (admin only)
 *
 * Expenses and settlements go first so that the group document still exists
 * while the rules check whether the requester is its admin. If this fails
 * partway through, the group survives and the delete can simply be retried.
 *
 * @param {string} groupId - Group ID
 * @param {string} requesterId - User ID making the request (must be admin)
 * @returns {Promise<void>}
 */
export const deleteGroup = async (groupId, requesterId) => {
    const group = await getGroup(groupId);
    if (!group) throw new Error("Group not found");
    if (group.adminId !== requesterId) throw new Error("Only admin can delete group");

    for (const collectionName of ["expenses", "settlements"]) {
        const owned = await getDocs(
            query(collection(db, collectionName), where("groupId", "==", groupId))
        );

        for (let i = 0; i < owned.docs.length; i += CASCADE_DELETE_BATCH_SIZE) {
            const batch = writeBatch(db);
            owned.docs
                .slice(i, i + CASCADE_DELETE_BATCH_SIZE)
                .forEach((owned) => batch.delete(owned.ref));
            await batch.commit();
        }
    }

    const groupRef = doc(db, "groups", groupId);
    await deleteDoc(groupRef);
};

/**
 * Check if user is a member of a group
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} true if user is a member
 */
export const isUserMember = async (groupId, userId) => {
    const group = await getGroup(groupId);
    if (!group) return false;
    return group.members.includes(userId);
};
