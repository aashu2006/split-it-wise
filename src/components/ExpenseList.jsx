"use client";

import { deleteExpense, involvesOnlyMembers } from "@/lib/expenses";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "./ConfirmModal";
import { formatRupees } from "@/components/ui/kit";
import { useState } from "react";

const toDate = (timestamp) =>
    timestamp ? (timestamp.toDate ? timestamp.toDate() : new Date(timestamp)) : null;

/** "14 oct", the day heading expenses are grouped under. */
const dayLabel = (date) =>
    date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }).toLowerCase() : "";

/**
 * The group's expenses, newest first, grouped by day.
 *
 * A row opens the expense for editing when you're allowed to change it (you
 * added it, or you're the admin); delete lives in that sheet too. Everyone
 * else's rows are plain text.
 *
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
    // An expense that can't be edited (it involves someone who left) but can
    // still be deleted, waiting on confirmation.
    const [pendingDelete, setPendingDelete] = useState(null);
    const { showToast } = useToast();

    const userMap = new Map(profiles.map((p) => [p.uid, p]));
    const currentUids = new Set(members.map((m) => m.uid));

    const payerName = (uid) => {
        if (uid === currentUserId) return "you";
        const name = userMap.get(uid)?.name || "someone who left";
        return currentUids.has(uid) ? name : `${name} (left group)`;
    };

    const splitSummary = (expense) => {
        const shares = Object.values(expense.splits ?? {});
        if (shares.length === 0) return `split ${members.length} ways`;
        if (expense.splitType === "percentage") return "split by %";
        if (expense.splitType === "exact") return "exact split";
        return shares.every((share) => share === shares[0])
            ? `${formatRupees(shares[0])} each`
            : `split ${shares.length} ways`;
    };

    // Editing and deleting are open to the same people, matching the rules.
    const canChange = (expense) => expense.createdBy === currentUserId || isAdmin;

    const open = (expense) => {
        if (!involvesOnlyMembers(expense, [...currentUids])) {
            setPendingDelete(expense);
            return;
        }
        onEdit(expense);
    };

    const handleDelete = async (expense) => {
        setPendingDelete(null);
        try {
            await deleteExpense(expense.id, groupId, currentUserId);
        } catch (error) {
            showToast(error.message || "couldn't delete the expense");
        }
    };

    if (expenses.length === 0) {
        return (
            <p className="text-[15px] text-muted-foreground">
                no expenses yet. add the first one below.
            </p>
        );
    }

    // Consecutive expenses on the same day share a heading.
    const days = [];
    for (const expense of expenses) {
        const label = dayLabel(toDate(expense.createdAt));
        const last = days[days.length - 1];
        if (last && last.label === label) last.expenses.push(expense);
        else days.push({ label, expenses: [expense] });
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                {days.map((day) => (
                    <section key={day.label || "undated"} aria-label={day.label || "expenses"}>
                        <p className="font-mono text-[11px] text-subtle">{day.label}</p>
                        <ul aria-label="expenses">
                            {day.expenses.map((expense) => {
                                const content = (
                                    <>
                                        <span className="flex min-w-0 flex-col gap-0.5 text-left">
                                            <span className="truncate text-[15px] text-foreground">
                                                {expense.description}
                                            </span>
                                            <span className="text-[13px] text-subtle">
                                                {payerName(expense.paidBy)} paid · {splitSummary(expense)}
                                                {expense.updatedAt && " · edited"}
                                            </span>
                                        </span>
                                        <span className="shrink-0 font-mono text-sm text-foreground">
                                            {formatRupees(expense.amount)}
                                        </span>
                                    </>
                                );

                                return (
                                    <li key={expense.id} className="border-b border-hairline">
                                        {canChange(expense) ? (
                                            <button
                                                type="button"
                                                onClick={() => open(expense)}
                                                aria-label={`${expense.description}, ${formatRupees(expense.amount)}. open to edit`}
                                                className="flex w-full items-start justify-between gap-4 py-3 transition-opacity hover:opacity-80"
                                            >
                                                {content}
                                            </button>
                                        ) : (
                                            <div className="flex items-start justify-between gap-4 py-3">
                                                {content}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </div>

            <ConfirmModal
                isOpen={pendingDelete !== null}
                title="can't edit this one"
                message={
                    pendingDelete
                        ? `${pendingDelete.description} involves someone who has left the group, so it can't be edited. you can delete it and add it again if it's wrong.`
                        : ""
                }
                confirmText="delete expense"
                onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
                onCancel={() => setPendingDelete(null)}
                danger
            />
        </>
    );
}
