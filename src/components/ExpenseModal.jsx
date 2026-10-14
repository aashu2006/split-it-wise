"use client";

import ExpenseForm from "./ExpenseForm";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

/**
 * Adds an expense, or edits one when `expense` is given.
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
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground">
                        {expense ? "Edit Expense" : "Add Expense"}
                    </DialogTitle>
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
            </DialogContent>
        </Dialog>
    );
}
