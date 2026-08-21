"use client";

import { useState } from "react";
import { deleteSettlement } from "@/lib/settlements";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "./ConfirmModal";

/**
 * @param {Object} props
 * @param {import("@/types").Transfer[]} props.transfers
 * @param {import("@/types").Settlement[]} props.settlements
 * @param {import("@/types").User[]} props.members
 * @param {string} props.currentUserId
 * @param {string} props.groupId
 * @param {boolean} props.isAdmin
 * @param {(transfer: import("@/types").Transfer) => void} props.onSettle
 * @param {(settlementId: string) => void} props.onSettlementDeleted
 *   Passed the id so the caller can drop it from its list without refetching.
 */
export default function SettleUp({
    transfers,
    settlements,
    members,
    currentUserId,
    groupId,
    isAdmin,
    onSettle,
    onSettlementDeleted,
}) {
    const [deleting, setDeleting] = useState(null);
    const [pendingUndo, setPendingUndo] = useState(null);
    const { showToast } = useToast();

    const nameFor = (uid) =>
        members.find((m) => m.uid === uid)?.name || "Someone who left";

    const handleDelete = async (settlement) => {
        setPendingUndo(null);
        setDeleting(settlement.id);

        try {
            await deleteSettlement(settlement.id, groupId, currentUserId);
            onSettlementDeleted(settlement.id);
        } catch (error) {
            showToast(error.message || "Failed to undo the payment");
        } finally {
            setDeleting(null);
        }
    };

    return (
        <>
            <div className="space-y-4">
                {transfers.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                        Everyone is settled up 🎉
                    </div>
                ) : (
                    <div className="space-y-2">
                        {transfers.map((transfer) => {
                            // Anyone can record a payment they witnessed, but the person
                            // actually out of pocket gets the primary action.
                            const isPayer = transfer.from === currentUserId;

                            return (
                                <div
                                    key={`${transfer.from}-${transfer.to}`}
                                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                >
                                    <div className="text-sm text-gray-900">
                                        <span className="font-medium">
                                            {isPayer ? "You" : nameFor(transfer.from)}
                                        </span>
                                        <span className="text-gray-500">
                                            {isPayer ? " pay " : " pays "}
                                        </span>
                                        <span className="font-medium">
                                            {transfer.to === currentUserId ? "you" : nameFor(transfer.to)}
                                        </span>
                                        <span className="font-semibold"> ₹{transfer.amount.toFixed(2)}</span>
                                    </div>

                                    <button
                                        onClick={() => onSettle(transfer)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
                                            isPayer
                                                ? "bg-green-600 text-white hover:bg-green-700"
                                                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                                        }`}
                                    >
                                        {isPayer ? "Settle up" : "Mark paid"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {settlements.length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Payments made</h3>
                        <div className="space-y-1">
                            {settlements.map((settlement) => {
                                const canDelete = settlement.createdBy === currentUserId || isAdmin;

                                return (
                                    <div
                                        key={settlement.id}
                                        className="flex items-center justify-between gap-3 text-sm text-gray-600 py-1"
                                    >
                                        <span>
                                            {nameFor(settlement.from)} paid {nameFor(settlement.to)}{" "}
                                            <span className="font-medium text-gray-900">
                                                ₹{settlement.amount.toFixed(2)}
                                            </span>
                                        </span>
                                        {canDelete && (
                                            <button
                                                onClick={() => setPendingUndo(settlement)}
                                                disabled={deleting === settlement.id}
                                                className="text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                                            >
                                                {deleting === settlement.id ? "..." : "Undo"}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={pendingUndo !== null}
                title="Undo this payment?"
                message={
                    pendingUndo
                        ? `This removes the record that ${nameFor(pendingUndo.from)} paid ${nameFor(
                              pendingUndo.to
                          )} ₹${pendingUndo.amount.toFixed(2)}, so the debt comes back.`
                        : ""
                }
                confirmText="Undo payment"
                onConfirm={() => pendingUndo && handleDelete(pendingUndo)}
                onCancel={() => setPendingUndo(null)}
                danger
            />
        </>
    );
}
