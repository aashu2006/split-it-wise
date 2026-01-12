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
import { Expense } from "@/types";
import { getGroup } from "./groups";

/**
 * Add a new expense to a group
 * @param groupId - Group ID
 * @param amount - Amount in INR
 * @param description - Expense description
 * @param paidBy - User ID who paid
 * @param createdBy - User ID who created the expense
 * @returns Expense ID
 */
export const addExpense = async (
    groupId: string,
    amount: number,
    description: string,
    paidBy: string,
    createdBy: string
): Promise<string> => {
    // Validate amount
    if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
    }

    const expensesRef = collection(db, "expenses");
    const docRef = await addDoc(expensesRef, {
        groupId,
        amount: Number(amount.toFixed(2)), // Round to 2 decimals
        description: description.trim(),
        paidBy,
        createdBy,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
};

/**
 * Get all expenses for a group
 * @param groupId - Group ID
 * @returns Array of expenses sorted by latest first
 */
export const getGroupExpenses = async (groupId: string): Promise<Expense[]> => {
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
    })) as Expense[];
};

/**
 * Delete an expense (creator or admin only)
 * @param expenseId - Expense ID
 * @param groupId - Group ID
 * @param requesterId - User ID making the request
 */
export const deleteExpense = async (
    expenseId: string,
    groupId: string,
    requesterId: string
): Promise<void> => {
    // Get the expense to check creator
    const expenseRef = doc(db, "expenses", expenseId);
    const expenseSnap = await getDoc(expenseRef);

    if (!expenseSnap.exists()) {
        throw new Error("Expense not found");
    }

    const expense = expenseSnap.data() as Expense;

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
