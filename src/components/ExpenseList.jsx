"use client";

import { deleteExpense } from "@/lib/expenses";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "./ConfirmModal";
import { useState } from "react";

/**
 * @param {Object} props
 * @param {import("@/types").Expense[]} props.expenses
 * @param {import("@/types").User[]} props.members
 * @param {string} props.currentUserId
 * @param {string} props.groupId
 * @param {boolean} props.isAdmin
 * @param {(expenseId: string) => void} props.onExpenseDeleted
 *   Passed the id so the caller can drop it from its list without refetching.
 */
export default function ExpenseList({
    expenses,
    members,
    currentUserId,
    groupId,
    isAdmin,
    onExpenseDeleted,
}) {
    const [deleting, setDeleting] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const { showToast } = useToast();

    // Create a map of uid to user for quick lookup
    const userMap = new Map(members.map((m) => [m.uid, m]));

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
            onExpenseDeleted(expense.id);
        } catch (error) {
            showToast(error.message || "Failed to delete expense");
        } finally {
            setDeleting(null);
        }
    };

    const canDelete = (expense) => {
        return expense.createdBy === currentUserId || isAdmin;
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
                                        Paid by <span className="font-medium">{payer?.name || "Unknown"}</span>
                                        {expense.paidBy === currentUserId && " (You)"}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {formatDate(expense.createdAt)} • {splitLabel} split • {splitSummary}
                                    </div>
                                </div>

                                {canDelete(expense) && (
                                    <button
                                        onClick={() => setPendingDelete(expense)}
                                        disabled={deleting === expense.id}
                                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium ml-4 disabled:opacity-50"
                                    >
                                        {deleting === expense.id ? "..." : "Delete"}
                                    </button>
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
