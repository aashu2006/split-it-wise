"use client";

import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import { addSettlement } from "@/lib/settlements";
import { buildUpiLink } from "@/lib/upi";
import { Settlement, Transfer, User } from "@/types";

interface SettleUpModalProps {
    transfer: Transfer | null;
    members: User[];
    currentUserId: string;
    groupId: string;
    groupName: string;
    onClose: () => void;
    /**
     * Passed the settlement as it was stored, so the caller can add it to its
     * list without refetching the group.
     */
    onSettled: (settlement: Settlement) => void;
}

export default function SettleUpModal({
    transfer,
    members,
    currentUserId,
    groupId,
    groupName,
    onClose,
    onSettled,
}: SettleUpModalProps) {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!transfer) return null;

    const payer = members.find((m) => m.uid === transfer.from);
    const payee = members.find((m) => m.uid === transfer.to);
    const isPayer = currentUserId === transfer.from;

    // Default to clearing the whole debt, but allow a part payment.
    const amountNum = amount === "" ? transfer.amount : parseFloat(amount) || 0;
    const upiLink =
        payee?.upiId && amountNum > 0
            ? buildUpiLink(payee.upiId, payee.name, amountNum, `${groupName} settle up`)
            : null;

    const handleRecord = async () => {
        setError("");

        if (amountNum <= 0) {
            setError("Enter an amount greater than 0");
            return;
        }
        if (amountNum > transfer.amount) {
            setError(`That's more than the ₹${transfer.amount.toFixed(2)} owed`);
            return;
        }

        setLoading(true);
        try {
            const settlementId = await addSettlement(
                groupId,
                transfer.from,
                transfer.to,
                amountNum,
                currentUserId
            );
            setAmount("");
            // createdAt is a local stand-in for the serverTimestamp() written
            // server-side; it only affects where this lands in the list.
            onSettled({
                id: settlementId,
                groupId,
                from: transfer.from,
                to: transfer.to,
                amount: Number(amountNum.toFixed(2)),
                createdBy: currentUserId,
                createdAt: Timestamp.now(),
            });
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to record the payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Settle up</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <p className="text-gray-700 mb-4">
                    <span className="font-medium">{isPayer ? "You" : payer?.name}</span>
                    {isPayer ? " pay " : " pays "}
                    <span className="font-medium">{payee?.name}</span>
                </p>

                <div className="mb-4">
                    <label htmlFor="settle-amount" className="block text-sm font-medium text-gray-900 mb-1">
                        Amount (₹)
                    </label>
                    <input
                        type="number"
                        id="settle-amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={transfer.amount.toFixed(2)}
                        step="0.01"
                        min="0"
                        max={transfer.amount}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                        disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Leave blank to settle the full ₹{transfer.amount.toFixed(2)}
                    </p>
                </div>

                {/* Paying happens outside the app, so the UPI link and the record
                    button are deliberately two separate steps. */}
                {isPayer && upiLink && (
                    <a
                        href={upiLink}
                        className="block w-full text-center px-4 py-2 mb-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                        Pay ₹{amountNum.toFixed(2)} via UPI
                    </a>
                )}

                {isPayer && !payee?.upiId && (
                    <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-2 mb-2">
                        {payee?.name} hasn&apos;t added a UPI ID yet, so pay them however you
                        normally would and record it here.
                    </p>
                )}

                {error && (
                    <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2 mb-2">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleRecord}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {loading ? "Recording..." : "Mark as paid"}
                </button>

                <p className="text-xs text-gray-500 mt-2 text-center">
                    Only record it once the money has actually moved.
                </p>
            </div>
        </div>
    );
}
