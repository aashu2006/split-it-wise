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
import { Expense, Group } from "@/types";

/**
 * Create a new group
 * @param name - Group name
 * @param adminId - User ID of the creator (becomes admin)
 * @returns Group ID
 */
export const createGroup = async (name: string, adminId: string): Promise<string> => {
    const groupRef = doc(collection(db, "groups"));
    const groupId = groupRef.id;

    await setDoc(groupRef, {
        name,
        adminId,
        members: [adminId], // Creator is automatically a member
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return groupId;
};

/**
 * Get all groups where user is a member
 * @param userId - User ID
 * @returns Array of groups
 */
export const getUserGroups = async (userId: string): Promise<Group[]> => {
    const groupsRef = collection(db, "groups");
    const q = query(groupsRef, where("members", "array-contains", userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Group[];
};

/**
 * Get a single group by ID
 * @param groupId - Group ID
 * @returns Group or null if not found
 */
export const getGroup = async (groupId: string): Promise<Group | null> => {
    const groupRef = doc(db, "groups", groupId);
    const snapshot = await getDoc(groupRef);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data(),
    } as Group;
};

/**
 * Add a user to a group
 * @param groupId - Group ID
 * @param userId - User ID to add
 */
export const addMemberToGroup = async (groupId: string, userId: string): Promise<void> => {
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
 * @param groupId - Group ID
 * @param userId - User ID to remove
 * @param requesterId - User ID making the request (must be admin)
 */
export const removeMemberFromGroup = async (
    groupId: string,
    userId: string,
    requesterId: string
): Promise<void> => {
    const group = await getGroup(groupId);
    if (!group) throw new Error("Group not found");
    if (group.adminId !== requesterId) throw new Error("Only admin can remove members");
    if (userId === group.adminId) throw new Error("Admin cannot be removed");

    // Queried here rather than through lib/expenses to keep this module free of
    // a circular import (expenses.ts imports getGroup from this file).
    const expensesRef = collection(db, "expenses");
    const expenses = await getDocs(query(expensesRef, where("groupId", "==", groupId)));
    const balances = calculateBalancesByUid(
        expenses.docs.map((expense) => expense.data() as Expense),
        group.members
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
 * Update group name (admin only)
 * @param groupId - Group ID
 * @param newName - New group name
 * @param requesterId - User ID making the request (must be admin)
 */
export const updateGroupName = async (
    groupId: string,
    newName: string,
    requesterId: string
): Promise<void> => {
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
// else's expense reads the group document, and a batched write gets only 20
// document reads for the whole request. In practice those reads hit the same
// group and are cached, so larger batches pass — 20 is the size that stays
// within budget even if they aren't.
const EXPENSE_DELETE_BATCH_SIZE = 20;

/**
 * Delete a group and every expense in it (admin only)
 *
 * Expenses go first so that the group document still exists while the rules
 * check whether the requester is its admin. If this fails partway through, the
 * group survives and the delete can simply be retried.
 *
 * @param groupId - Group ID
 * @param requesterId - User ID making the request (must be admin)
 */
export const deleteGroup = async (groupId: string, requesterId: string): Promise<void> => {
    const group = await getGroup(groupId);
    if (!group) throw new Error("Group not found");
    if (group.adminId !== requesterId) throw new Error("Only admin can delete group");

    const expensesRef = collection(db, "expenses");
    const expenses = await getDocs(query(expensesRef, where("groupId", "==", groupId)));

    for (let i = 0; i < expenses.docs.length; i += EXPENSE_DELETE_BATCH_SIZE) {
        const batch = writeBatch(db);
        expenses.docs
            .slice(i, i + EXPENSE_DELETE_BATCH_SIZE)
            .forEach((expense) => batch.delete(expense.ref));
        await batch.commit();
    }

    const groupRef = doc(db, "groups", groupId);
    await deleteDoc(groupRef);
};

/**
 * Check if user is a member of a group
 * @param groupId - Group ID
 * @param userId - User ID
 * @returns true if user is a member
 */
export const isUserMember = async (groupId: string, userId: string): Promise<boolean> => {
    const group = await getGroup(groupId);
    if (!group) return false;
    return group.members.includes(userId);
};
