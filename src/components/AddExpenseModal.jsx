"use client";

import AddExpenseForm from "./AddExpenseForm";

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Add Expense</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <AddExpenseForm
                    groupId={groupId}
                    members={members}
                    currentUserId={currentUserId}
                    onExpenseAdded={handleExpenseAdded}
                />
            </div>
        </div>
    );
}
