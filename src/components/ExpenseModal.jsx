"use client";

import { useState } from "react";
import ExpenseForm from "./ExpenseForm";
import ConfirmModal from "./ConfirmModal";
import { deleteExpense } from "@/lib/expenses";
import { useToast } from "@/context/ToastContext";
import { formatRupees, textButtonClass } from "@/components/ui/kit";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

/**
 * Adds an expense, or edits one when `expense` is given. Editing also offers
 * delete, since the expense list itself has no buttons on its rows.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} props.groupId
 * @param {import("@/types").User[]} props.members
 * @param {string} props.currentUserId
 * @param {import("@/types").Expense | null} [props.expense] - The expense being edited
 */
export default function ExpenseModal({
    isOpen,
    onClose,
    groupId,
    members,
    currentUserId,
    expense = null,
}) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { showToast } = useToast();

    const handleDelete = async () => {
        setConfirmingDelete(false);
        setDeleting(true);
        try {
            await deleteExpense(expense.id, groupId, currentUserId);
            onClose();
        } catch (error) {
            showToast(error.message || "couldn't delete the expense");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{expense ? "edit expense" : "add expense"}</DialogTitle>
                        {/* Not shown — the form's own labels carry the visual
                            explanation. This is what a screen reader announces
                            when the dialog opens, and Radix warns without it. */}
                        <DialogDescription className="sr-only">
                            {expense
                                ? "Change what was spent, who paid, or how it is split."
                                : "Record what was spent, who paid, and how it should be split."}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Keyed so moving from one expense to another starts the form
                        afresh from that expense, rather than keeping the last one's
                        half-edited fields. */}
                    <ExpenseForm
                        key={expense?.id ?? "new"}
                        groupId={groupId}
                        members={members}
                        currentUserId={currentUserId}
                        expense={expense}
                        onSaved={onClose}
                    />

                    {expense && (
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            disabled={deleting}
                            className={`${textButtonClass("text-negative")} self-start`}
                        >
                            {deleting ? "deleting…" : "delete expense"}
                        </button>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmModal
                isOpen={confirmingDelete}
                title="delete this expense?"
                message={
                    expense
                        ? `${expense.description}, ${formatRupees(expense.amount)}. everyone's balances will be worked out again.`
                        : ""
                }
                confirmText="delete"
                onConfirm={handleDelete}
                onCancel={() => setConfirmingDelete(false)}
                danger
            />
        </>
    );
}
