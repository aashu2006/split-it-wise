"use client";

import AddExpenseForm from "./AddExpenseForm";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} props.groupId
 * @param {import("@/types").User[]} props.members
 * @param {string} props.currentUserId
 * @param {(expense: import("@/types").Expense) => void} props.onExpenseAdded
 */
export default function AddExpenseModal({
    isOpen,
    onClose,
    groupId,
    members,
    currentUserId,
    onExpenseAdded,
}) {
    const handleExpenseAdded = (expense) => {
        onExpenseAdded(expense);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground">
                        Add Expense
                    </DialogTitle>
                    {/* Not shown — the form's own labels carry the visual
                        explanation. This is what a screen reader announces
                        when the dialog opens, and Radix warns without it. */}
                    <DialogDescription className="sr-only">
                        Record what was spent, who paid, and how it should be split.
                    </DialogDescription>
                </DialogHeader>

                <AddExpenseForm
                    groupId={groupId}
                    members={members}
                    currentUserId={currentUserId}
                    onExpenseAdded={handleExpenseAdded}
                />
            </DialogContent>
        </Dialog>
    );
}
