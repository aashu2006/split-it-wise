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
 * Add a new expense to a group
 * @param {string} groupId - Group ID
 * @param {number} amount - Amount in INR
 * @param {string} description - Expense description
 * @param {string} paidBy - User ID who paid
 * @param {string} createdBy - User ID who created the expense
 * @param {import("@/types").SplitType} splitType - How the expense is split
 * @param {Object<string, number>} splits - Map of uid to amount owed
 * @returns {Promise<string>} Expense ID
 */
export const addExpense = async (
    groupId,
    amount,
    description,
    paidBy,
    createdBy,
    splitType,
    splits
) => {
    // Validate amount
    if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
    }

    const expensesRef = collection(db, "expenses");
    const docRef = await addDoc(expensesRef, {
        groupId,
        amount: Number(amount.toFixed(2)),
        description: description.trim(),
        paidBy,
        createdBy,
        splitType,
        splits,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
};

/**
 * Get all expenses for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<import("@/types").Expense[]>} Array of expenses sorted by latest first
 */
export const getGroupExpenses = async (groupId) => {
    const expensesRef = collection(db, "expenses");
    const q = query(
        expensesRef,
        where("groupId", "==", groupId),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
};

/**
 * Delete an expense (creator or admin only)
 * @param {string} expenseId - Expense ID
 * @param {string} groupId - Group ID
 * @param {string} requesterId - User ID making the request
 * @returns {Promise<void>}
 */
export const deleteExpense = async (expenseId, groupId, requesterId) => {
    // Get the expense to check creator
    const expenseRef = doc(db, "expenses", expenseId);
    const expenseSnap = await getDoc(expenseRef);

    if (!expenseSnap.exists()) {
        throw new Error("Expense not found");
    }

    const expense = expenseSnap.data();

    // Get group to check admin
    const group = await getGroup(groupId);
    if (!group) {
        throw new Error("Group not found");
    }

    // Check if requester is creator or admin
    const isCreator = expense.createdBy === requesterId;
    const isAdmin = group.adminId === requesterId;

    if (!isCreator && !isAdmin) {
        throw new Error("Only expense creator or group admin can delete expenses");
    }

    await deleteDoc(expenseRef);
};
