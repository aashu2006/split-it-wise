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
import { Settlement } from "@/types";
import { getGroup } from "./groups";

/**
 * Record a repayment between two members
 *
 * Stored apart from expenses on purpose: a settlement moves money that has
 * already been spent, so folding it into the expenses collection would inflate
 * the group's spending totals every time someone paid a friend back.
 *
 * @param groupId - Group ID
 * @param from - User ID who paid
 * @param to - User ID who was paid
 * @param amount - Amount in INR
 * @param createdBy - User ID recording the settlement
 * @returns Settlement ID
 */
export const addSettlement = async (
    groupId: string,
    from: string,
    to: string,
    amount: number,
    createdBy: string
): Promise<string> => {
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
 * @param groupId - Group ID
 * @returns Array of settlements sorted by latest first
 */
export const getGroupSettlements = async (groupId: string): Promise<Settlement[]> => {
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
    })) as Settlement[];
};

/**
 * Delete a settlement, for when one is recorded by mistake (creator or admin)
 * @param settlementId - Settlement ID
 * @param groupId - Group ID
 * @param requesterId - User ID making the request
 */
export const deleteSettlement = async (
    settlementId: string,
    groupId: string,
    requesterId: string
): Promise<void> => {
    const settlementRef = doc(db, "settlements", settlementId);
    const settlementSnap = await getDoc(settlementRef);

    if (!settlementSnap.exists()) {
        throw new Error("Settlement not found");
    }

    const settlement = settlementSnap.data() as Settlement;

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
