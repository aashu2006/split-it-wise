"use client";

import { useState } from "react";
import { addExpense } from "@/lib/expenses";
import { User } from "@/types";

interface AddExpenseFormProps {
    groupId: string;
    members: User[];
    currentUserId: string;
    onExpenseAdded: () => void;
}

export default function AddExpenseForm({
    groupId,
    members,
    currentUserId,
    onExpenseAdded,
}: AddExpenseFormProps) {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [paidBy, setPaidBy] = useState(currentUserId);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        const amountNum = parseFloat(amount);
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            setError("Please enter a valid amount greater than 0");
            return;
        }

        if (!description.trim()) {
            setError("Please enter a description");
            return;
        }

        setLoading(true);

        try {
            await addExpense(
                groupId,
                amountNum,
                description.trim(),
                paidBy,
                currentUserId
            );

            // Reset form
            setAmount("");
            setDescription("");
            setPaidBy(currentUserId);
            onExpenseAdded();
        } catch (err: any) {
            setError(err.message || "Failed to add expense");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-900 mb-1">
                    Amount (₹)
                </label>
                <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    disabled={loading}
                    required
                />
            </div>

            {/* Description Input */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
                    Description
                </label>
                <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Groceries, Dinner, Movie tickets"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    disabled={loading}
                    required
                />
            </div>

            {/* Paid By Select */}
            <div>
                <label htmlFor="paidBy" className="block text-sm font-medium text-gray-900 mb-1">
                    Paid by
                </label>
                <select
                    id="paidBy"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    disabled={loading}
                >
                    {members.map((member) => (
                        <option key={member.uid} value={member.uid}>
                            {member.name} {member.uid === currentUserId ? "(You)" : ""}
                        </option>
                    ))}
                </select>
            </div>

            {/* Split Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                    <strong>Equal split:</strong> ₹
                    {amount && !isNaN(parseFloat(amount))
                        ? (parseFloat(amount) / members.length).toFixed(2)
                        : "0.00"}{" "}
                    per person ({members.length} members)
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">
                    {error}
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
                {loading ? "Adding..." : "Add Expense"}
            </button>
        </form>
    );
}
