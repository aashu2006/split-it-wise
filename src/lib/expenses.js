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
import {
    isDemoMode,
    demoAddExpense,
    demoDeleteExpense,
    demoGetExpense,
    demoGetGroupExpenses,
} from "./demo";

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

    const record = {
        groupId,
        amount: Number(amount.toFixed(2)),
        description: description.trim(),
        paidBy,
        createdBy,
        splitType,
        splits,
    };

    if (isDemoMode) return demoAddExpense(record);

    const expensesRef = collection(db, "expenses");
    const docRef = await addDoc(expensesRef, {
        ...record,
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
    if (isDemoMode) return demoGetGroupExpenses(groupId);

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
    const expense = isDemoMode
        ? await demoGetExpense(expenseId)
        : await getDoc(doc(db, "expenses", expenseId)).then((snap) =>
              snap.exists() ? snap.data() : null
          );

    if (!expense) {
        throw new Error("Expense not found");
    }

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

    if (isDemoMode) return demoDeleteExpense(expenseId);

    await deleteDoc(doc(db, "expenses", expenseId));
};
