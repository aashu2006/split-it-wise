"use client";

import { deleteExpense, involvesOnlyMembers } from "@/lib/expenses";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "./ConfirmModal";
import { useState } from "react";

/**
 * @param {Object} props
 * @param {import("@/types").Expense[]} props.expenses
 * @param {import("@/types").User[]} props.members - Current members
 * @param {import("@/types").User[]} props.profiles
 *   Everyone in the ledger, including people who have left, so an expense
 *   they paid for can still say who paid.
 * @param {string} props.currentUserId
 * @param {string} props.groupId
 * @param {boolean} props.isAdmin
 * @param {(expense: import("@/types").Expense) => void} props.onEdit
 */
export default function ExpenseList({
    expenses,
    members,
    profiles,
    currentUserId,
    groupId,
    isAdmin,
    onEdit,
}) {
    const [deleting, setDeleting] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const { showToast } = useToast();

    // Create a map of uid to user for quick lookup
    const userMap = new Map(profiles.map((p) => [p.uid, p]));
    const currentUids = new Set(members.map((m) => m.uid));

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const handleDelete = async (expense) => {
        setPendingDelete(null);
        setDeleting(expense.id);

        try {
            await deleteExpense(expense.id, groupId, currentUserId);
        } catch (error) {
            showToast(error.message || "Failed to delete expense");
        } finally {
            setDeleting(null);
        }
    };

    // Editing and deleting are open to the same people, matching the rules.
    const canChange = (expense) => {
        return expense.createdBy === currentUserId || isAdmin;
    };

    const handleEdit = (expense) => {
        // Explained on tap rather than by hiding the button, so it doesn't look
        // like editing is simply missing for this one expense.
        if (!involvesOnlyMembers(expense, members.map((m) => m.uid))) {
            showToast(
                "This expense involves someone who has left the group, so it can't be edited. Delete and re-add it if it's wrong."
            );
            return;
        }
        onEdit(expense);
    };

    if (expenses.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No expenses yet. Add your first expense to get started!
            </div>
        );
    }

    return (
        <>
            <div className="space-y-3">
                {expenses.map((expense) => {
                    const payer = userMap.get(expense.paidBy);
                    const splitLabel =
                        expense.splitType === "percentage"
                            ? "By %"
                            : expense.splitType === "exact"
                            ? "Exact"
                            : "Equal";

                    const splitCount = expense.splits
                        ? Object.keys(expense.splits).length
                        : members.length;

                    const splitSummary = expense.splits
                        ? Object.values(expense.splits).every((v, _, arr) => v === arr[0])
                            ? `₹${Object.values(expense.splits)[0]?.toFixed(2)} each`
                            : `${splitCount} people`
                        : `₹${(expense.amount / members.length).toFixed(2)} per person`;

                    return (
                        <div
                            key={expense.id}
                            className="bg-muted rounded-lg p-4 border border-border"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg font-semibold text-foreground">
                                            ₹{expense.amount.toFixed(2)}
                                        </span>
                                        {expense.description && (
                                            <span className="text-muted-foreground">• {expense.description}</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Paid by <span className="font-medium">{payer?.name || "Someone who left"}</span>
                                        {expense.paidBy === currentUserId && " (You)"}
                                        {payer && !currentUids.has(expense.paidBy) && " (left group)"}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {formatDate(expense.createdAt)} • {splitLabel} split • {splitSummary}
                                        {expense.updatedAt && " • edited"}
                                    </div>
                                </div>

                                {canChange(expense) && (
                                    <div className="flex items-center gap-4 ml-4">
                                        <button
                                            onClick={() => handleEdit(expense)}
                                            disabled={deleting === expense.id}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium disabled:opacity-50"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setPendingDelete(expense)}
                                            disabled={deleting === expense.id}
                                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50"
                                        >
                                            {deleting === expense.id ? "..." : "Delete"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <ConfirmModal
                isOpen={pendingDelete !== null}
                title="Delete expense"
                message={
                    pendingDelete
                        ? `Delete ₹${pendingDelete.amount.toFixed(2)}${
                              pendingDelete.description ? ` — ${pendingDelete.description}` : ""
                          }? Everyone's balances will be recalculated.`
                        : ""
                }
                confirmText="Delete"
                onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
                onCancel={() => setPendingDelete(null)}
                danger
            />
        </>
    );
}
