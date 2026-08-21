import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { getGroup } from "./groups";

/**
 * Record a repayment between two members
 *
 * Stored apart from expenses on purpose: a settlement moves money that has
 * already been spent, so folding it into the expenses collection would inflate
 * the group's spending totals every time someone paid a friend back.
 *
 * @param {string} groupId - Group ID
 * @param {string} from - User ID who paid
 * @param {string} to - User ID who was paid
 * @param {number} amount - Amount in INR
 * @param {string} createdBy - User ID recording the settlement
 * @returns {Promise<string>} Settlement ID
 */
export const addSettlement = async (groupId, from, to, amount, createdBy) => {
    if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
    }
    if (from === to) {
        throw new Error("Cannot settle up with yourself");
    }

    const settlementsRef = collection(db, "settlements");
    const docRef = await addDoc(settlementsRef, {
        groupId,
        from,
        to,
        amount: Number(amount.toFixed(2)),
        createdBy,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
};

/**
 * Get all settlements for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<import("@/types").Settlement[]>} Array of settlements sorted by latest first
 */
export const getGroupSettlements = async (groupId) => {
    const settlementsRef = collection(db, "settlements");
    const q = query(
        settlementsRef,
        where("groupId", "==", groupId),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((settlement) => ({
        id: settlement.id,
        ...settlement.data(),
    }));
};

/**
 * Delete a settlement, for when one is recorded by mistake (creator or admin)
 * @param {string} settlementId - Settlement ID
 * @param {string} groupId - Group ID
 * @param {string} requesterId - User ID making the request
 * @returns {Promise<void>}
 */
export const deleteSettlement = async (settlementId, groupId, requesterId) => {
    const settlementRef = doc(db, "settlements", settlementId);
    const settlementSnap = await getDoc(settlementRef);

    if (!settlementSnap.exists()) {
        throw new Error("Settlement not found");
    }

    const settlement = settlementSnap.data();

    const group = await getGroup(groupId);
    if (!group) {
        throw new Error("Group not found");
    }

    const isCreator = settlement.createdBy === requesterId;
    const isAdmin = group.adminId === requesterId;

    if (!isCreator && !isAdmin) {
        throw new Error("Only the person who recorded it or the group admin can delete it");
    }

    await deleteDoc(settlementRef);
};
