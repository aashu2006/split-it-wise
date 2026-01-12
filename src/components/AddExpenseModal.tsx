"use client";

import { useState } from "react";
import AddExpenseForm from "./AddExpenseForm";
import { User } from "@/types";

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    members: User[];
    currentUserId: string;
    onExpenseAdded: () => void;
}

export default function AddExpenseModal({
    isOpen,
    onClose,
    groupId,
    members,
    currentUserId,
    onExpenseAdded,
}: AddExpenseModalProps) {
    const handleExpenseAdded = () => {
        onExpenseAdded();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
