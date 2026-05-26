"use client";

import { Expense, User } from "@/types";
import { deleteExpense } from "@/lib/expenses";
import { useState } from "react";

interface ExpenseListProps {
    expenses: Expense[];
    members: User[];
    currentUserId: string;
    groupId: string;
    isAdmin: boolean;
    onExpenseDeleted: () => void;
}

export default function ExpenseList({
    expenses,
    members,
    currentUserId,
    groupId,
    isAdmin,
    onExpenseDeleted,
}: ExpenseListProps) {
    const [deleting, setDeleting] = useState<string | null>(null);

    // Create a map of uid to user for quick lookup
    const userMap = new Map(members.map((m) => [m.uid, m]));

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const handleDelete = async (expenseId: string, description: string) => {
        if (!confirm(`Delete expense: ${description}?`)) return;

        setDeleting(expenseId);
        try {
            await deleteExpense(expenseId, groupId, currentUserId);
            onExpenseDeleted();
        } catch (error: any) {
            alert(error.message || "Failed to delete expense");
        } finally {
            setDeleting(null);
        }
    };

    const canDelete = (expense: Expense) => {
        return expense.createdBy === currentUserId || isAdmin;
    };

    if (expenses.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No expenses yet. Add your first expense to get started!
            </div>
        );
    }

    return (
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
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg font-semibold text-gray-900">
                                        ₹{expense.amount.toFixed(2)}
                                    </span>
                                    {expense.description && (
                                        <span className="text-gray-600">• {expense.description}</span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Paid by <span className="font-medium">{payer?.name || "Unknown"}</span>
                                    {expense.paidBy === currentUserId && " (You)"}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {formatDate(expense.createdAt)} • {splitLabel} split • {splitSummary}
                                </div>
                            </div>

                            {canDelete(expense) && (
                                <button
                                    onClick={() => handleDelete(expense.id, expense.description)}
                                    disabled={deleting === expense.id}
                                    className="text-red-600 hover:text-red-700 text-sm font-medium ml-4 disabled:opacity-50"
                                >
                                    {deleting === expense.id ? "..." : "Delete"}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
