import {
    collection,
    doc,
    addDoc,
    getDoc,
    updateDoc,
    deleteField,
    getDocs,
    deleteDoc,
    onSnapshot,
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
    demoUpdateExpense,
    demoWatchGroupExpenses,
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
 * @param {Object<string, number>} [percentages] - Map of uid to percentage, for a percentage split
 * @returns {Promise<string>} Expense ID
 */
export const addExpense = async (
    groupId,
    amount,
    description,
    paidBy,
    createdBy,
    splitType,
    splits,
    percentages
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
        // Kept so an edit can show what was typed. The shares alone can only
        // be turned back into percentages approximately.
        ...(splitType === "percentage" && percentages ? { percentages } : {}),
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
 * Listen to a group's expenses, newest first
 *
 * Fires once with the current list and again on every change, from this device
 * or any other. A write made here is reported straight away, before the server
 * acknowledges it; its createdAt is then the SDK's local estimate of the
 * serverTimestamp(), so it still sorts and displays correctly.
 *
 * @param {string} groupId - Group ID
 * @param {(expenses: import("@/types").Expense[]) => void} onChange
 * @param {(error: Error) => void} onError
 * @returns {() => void} Unsubscribe
 */
export const subscribeToGroupExpenses = (groupId, onChange, onError) => {
    if (isDemoMode) return demoWatchGroupExpenses(groupId, onChange);

    const q = query(
        collection(db, "expenses"),
        where("groupId", "==", groupId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(
        q,
        (snapshot) =>
            onChange(
                snapshot.docs.map((expense) => ({
                    id: expense.id,
                    ...expense.data({ serverTimestamps: "estimate" }),
                }))
            ),
        onError
    );
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

/**
 * Whether an expense can still be edited, given the group's current members.
 *
 * An expense that involves someone who has since left can't be: the form only
 * offers current members, so saving it would quietly drop the leaver's share
 * and with it their debt. The security rules refuse such a write anyway, since
 * splits may only name current members.
 *
 * @param {import("@/types").Expense} expense
 * @param {string[]} memberUids - UIDs of the group's current members
 * @returns {boolean}
 */
export const involvesOnlyMembers = (expense, memberUids) => {
    const current = new Set(memberUids);
    return (
        current.has(expense.paidBy) &&
        Object.keys(expense.splits ?? {}).every((uid) => current.has(uid))
    );
};

/**
 * Edit an expense (creator or admin only)
 *
 * Everything but the group, the creator and the creation time can change.
 * createdAt is left alone so an edit doesn't move the expense to the top of
 * the list; updatedAt records that it was changed.
 *
 * @param {string} expenseId - Expense ID
 * @param {string} groupId - Group ID
 * @param {string} requesterId - User ID making the request
 * @param {Object} changes
 * @param {number} changes.amount - Amount in INR
 * @param {string} changes.description
 * @param {string} changes.paidBy - User ID who paid
 * @param {import("@/types").SplitType} changes.splitType
 * @param {Object<string, number>} changes.splits - Map of uid to amount owed
 * @param {Object<string, number>} [changes.percentages] - For a percentage split
 * @returns {Promise<void>}
 */
export const updateExpense = async (
    expenseId,
    groupId,
    requesterId,
    { amount, description, paidBy, splitType, splits, percentages }
) => {
    if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
    }

    const expense = isDemoMode
        ? await demoGetExpense(expenseId)
        : await getDoc(doc(db, "expenses", expenseId)).then((snap) =>
              snap.exists() ? snap.data() : null
          );
    if (!expense) {
        throw new Error("Expense not found");
    }

    const group = await getGroup(groupId);
    if (!group) {
        throw new Error("Group not found");
    }

    if (expense.createdBy !== requesterId && group.adminId !== requesterId) {
        throw new Error("Only expense creator or group admin can edit expenses");
    }

    if (!involvesOnlyMembers(expense, group.members)) {
        throw new Error("This expense involves someone who has left the group, so it can't be edited");
    }

    const record = {
        amount: Number(amount.toFixed(2)),
        description: description.trim(),
        paidBy,
        splitType,
        splits,
    };
    const keepPercentages = splitType === "percentage" && percentages;

    if (isDemoMode) {
        return demoUpdateExpense(expenseId, {
            ...record,
            percentages: keepPercentages ? percentages : undefined,
        });
    }

    await updateDoc(doc(db, "expenses", expenseId), {
        ...record,
        // Switching away from a percentage split must not leave the old
        // percentages behind to be shown on the next edit.
        percentages: keepPercentages ? percentages : deleteField(),
        updatedAt: serverTimestamp(),
    });
};
