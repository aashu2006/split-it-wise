"use client";

import { useState, useEffect } from "react";
import { addExpense } from "@/lib/expenses";
import { User, SplitType } from "@/types";

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
    const [splitType, setSplitType] = useState<SplitType>("equal");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Equal split: which members are included
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
        new Set(members.map((m) => m.uid))
    );

    // Exact split: amount per member
    const [exactAmounts, setExactAmounts] = useState<{ [uid: string]: string }>(
        Object.fromEntries(members.map((m) => [m.uid, ""]))
    );

    // Percentage split: percentage per member
    const [percentages, setPercentages] = useState<{ [uid: string]: string }>(
        Object.fromEntries(members.map((m) => [m.uid, ""]))
    );

    // Reset split inputs when members change
    useEffect(() => {
        setSelectedMembers(new Set(members.map((m) => m.uid)));
        setExactAmounts(Object.fromEntries(members.map((m) => [m.uid, ""])));
        setPercentages(Object.fromEntries(members.map((m) => [m.uid, ""])));
    }, [members]);

    const toggleMember = (uid: string) => {
        const next = new Set(selectedMembers);
        if (next.has(uid)) {
            if (next.size <= 1) return; // at least 1 member
            next.delete(uid);
        } else {
            next.add(uid);
        }
        setSelectedMembers(next);
    };

    const buildSplits = (): { [uid: string]: number } | null => {
        const amountNum = parseFloat(amount);
        if (!amount || isNaN(amountNum) || amountNum <= 0) return null;

        if (splitType === "equal") {
            const selected = members.filter((m) => selectedMembers.has(m.uid));
            if (selected.length === 0) return null;
            const share = Math.round((amountNum / selected.length) * 100) / 100;
            const splits: { [uid: string]: number } = {};
            selected.forEach((m) => {
                splits[m.uid] = share;
            });
            return splits;
        }

        if (splitType === "exact") {
            const splits: { [uid: string]: number } = {};
            let total = 0;
            for (const m of members) {
                const val = parseFloat(exactAmounts[m.uid] || "0");
                if (val < 0) return null;
                if (val > 0) {
                    splits[m.uid] = Math.round(val * 100) / 100;
                    total += splits[m.uid];
                }
            }
            total = Math.round(total * 100) / 100;
            if (total !== amountNum) return null;
            if (Object.keys(splits).length === 0) return null;
            return splits;
        }

        if (splitType === "percentage") {
            const splits: { [uid: string]: number } = {};
            let totalPct = 0;
            for (const m of members) {
                const pct = parseFloat(percentages[m.uid] || "0");
                if (pct < 0) return null;
                totalPct += pct;
                if (pct > 0) {
                    splits[m.uid] = Math.round((amountNum * pct) / 100 * 100) / 100;
                }
            }
            totalPct = Math.round(totalPct * 100) / 100;
            if (totalPct !== 100) return null;
            if (Object.keys(splits).length === 0) return null;
            return splits;
        }

        return null;
    };

    const getExactTotal = (): number => {
        let total = 0;
        for (const uid of Object.keys(exactAmounts)) {
            total += parseFloat(exactAmounts[uid] || "0") || 0;
        }
        return Math.round(total * 100) / 100;
    };

    const getPercentageTotal = (): number => {
        let total = 0;
        for (const uid of Object.keys(percentages)) {
            total += parseFloat(percentages[uid] || "0") || 0;
        }
        return Math.round(total * 100) / 100;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const amountNum = parseFloat(amount);
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            setError("Please enter a valid amount greater than 0");
            return;
        }

        if (!description.trim()) {
            setError("Please enter a description");
            return;
        }

        const splits = buildSplits();
        if (!splits) {
            if (splitType === "exact") {
                const diff = Math.round((amountNum - getExactTotal()) * 100) / 100;
                setError(`Exact amounts must add up to ₹${amountNum.toFixed(2)}. Off by ₹${Math.abs(diff).toFixed(2)}`);
            } else if (splitType === "percentage") {
                const diff = Math.round((100 - getPercentageTotal()) * 100) / 100;
                setError(`Percentages must add up to 100%. Currently ${getPercentageTotal()}%`);
            } else {
                setError("Please select at least one member for the split");
            }
            return;
        }

        setLoading(true);

        try {
            await addExpense(
                groupId,
                amountNum,
                description.trim(),
                paidBy,
                currentUserId,
                splitType,
                splits
            );

            // Reset form
            setAmount("");
            setDescription("");
            setPaidBy(currentUserId);
            setSplitType("equal");
            setSelectedMembers(new Set(members.map((m) => m.uid)));
            setExactAmounts(Object.fromEntries(members.map((m) => [m.uid, ""])));
            setPercentages(Object.fromEntries(members.map((m) => [m.uid, ""])));
            onExpenseAdded();
        } catch (err: any) {
            setError(err.message || "Failed to add expense");
        } finally {
            setLoading(false);
        }
    };

    const amountNum = parseFloat(amount) || 0;

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

            {/* Split Type Tabs */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                    Split method
                </label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    {(["equal", "exact", "percentage"] as SplitType[]).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setSplitType(type)}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                                splitType === type
                                    ? "bg-green-600 text-white"
                                    : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                            disabled={loading}
                        >
                            {type === "equal" ? "Equal" : type === "exact" ? "Exact" : "Percent"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split Configuration */}
            <div className="space-y-2">
                {splitType === "equal" && (
                    <>
                        <p className="text-xs text-gray-500">Select who is part of this expense:</p>
                        <div className="space-y-1">
                            {members.map((member) => (
                                <label
                                    key={member.uid}
                                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedMembers.has(member.uid)}
                                            onChange={() => toggleMember(member.uid)}
                                            className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                            disabled={loading}
                                        />
                                        <span className="text-sm text-gray-900">
                                            {member.name}
                                            {member.uid === currentUserId ? " (You)" : ""}
                                        </span>
                                    </div>
                                    {selectedMembers.has(member.uid) && amountNum > 0 && (
                                        <span className="text-sm text-gray-600">
                                            ₹{(amountNum / selectedMembers.size).toFixed(2)}
                                        </span>
                                    )}
                                </label>
                            ))}
                        </div>
                        {amountNum > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mt-1">
                                <p className="text-sm text-blue-800">
                                    ₹{(amountNum / selectedMembers.size).toFixed(2)} per person ({selectedMembers.size} of {members.length} members)
                                </p>
                            </div>
                        )}
                    </>
                )}

                {splitType === "exact" && (
                    <>
                        <p className="text-xs text-gray-500">Enter the exact amount each person owes:</p>
                        <div className="space-y-2">
                            {members.map((member) => (
                                <div key={member.uid} className="flex items-center gap-2">
                                    <span className="text-sm text-gray-900 min-w-[100px] truncate">
                                        {member.name}
                                        {member.uid === currentUserId ? " (You)" : ""}
                                    </span>
                                    <div className="flex items-center flex-1">
                                        <span className="text-gray-500 mr-1">₹</span>
                                        <input
                                            type="number"
                                            value={exactAmounts[member.uid] || ""}
                                            onChange={(e) =>
                                                setExactAmounts({ ...exactAmounts, [member.uid]: e.target.value })
                                            }
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 text-sm"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div
                            className={`rounded-md p-2 mt-1 border ${
                                amountNum > 0 && getExactTotal() === amountNum
                                    ? "bg-green-50 border-green-200"
                                    : "bg-orange-50 border-orange-200"
                            }`}
                        >
                            <p
                                className={`text-sm ${
                                    amountNum > 0 && getExactTotal() === amountNum
                                        ? "text-green-800"
                                        : "text-orange-800"
                                }`}
                            >
                                Total: ₹{getExactTotal().toFixed(2)} / ₹{amountNum.toFixed(2)}
                                {amountNum > 0 && getExactTotal() !== amountNum && (
                                    <span> (₹{Math.abs(amountNum - getExactTotal()).toFixed(2)} remaining)</span>
                                )}
                            </p>
                        </div>
                    </>
                )}

                {splitType === "percentage" && (
                    <>
                        <p className="text-xs text-gray-500">Enter the percentage each person owes:</p>
                        <div className="space-y-2">
                            {members.map((member) => (
                                <div key={member.uid} className="flex items-center gap-2">
                                    <span className="text-sm text-gray-900 min-w-[100px] truncate">
                                        {member.name}
                                        {member.uid === currentUserId ? " (You)" : ""}
                                    </span>
                                    <div className="flex items-center flex-1">
                                        <input
                                            type="number"
                                            value={percentages[member.uid] || ""}
                                            onChange={(e) =>
                                                setPercentages({ ...percentages, [member.uid]: e.target.value })
                                            }
                                            placeholder="0"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 text-sm"
                                            disabled={loading}
                                        />
                                        <span className="text-gray-500 ml-1">%</span>
                                    </div>
                                    {amountNum > 0 && parseFloat(percentages[member.uid] || "0") > 0 && (
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            = ₹{((amountNum * parseFloat(percentages[member.uid] || "0")) / 100).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div
                            className={`rounded-md p-2 mt-1 border ${
                                getPercentageTotal() === 100
                                    ? "bg-green-50 border-green-200"
                                    : "bg-orange-50 border-orange-200"
                            }`}
                        >
                            <p
                                className={`text-sm ${
                                    getPercentageTotal() === 100 ? "text-green-800" : "text-orange-800"
                                }`}
                            >
                                Total: {getPercentageTotal()}% / 100%
                                {getPercentageTotal() !== 100 && (
                                    <span> ({Math.abs(100 - getPercentageTotal()).toFixed(2)}% remaining)</span>
                                )}
                            </p>
                        </div>
                    </>
                )}
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
