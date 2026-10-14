"use client";

import { useState } from "react";
import { deleteSettlement } from "@/lib/settlements";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "./ConfirmModal";
import { formatRupees, labelClass, smallButtonClass } from "@/components/ui/kit";

/**
 * Who pays whom to clear the group, and the payments already recorded.
 *
 * @param {Object} props
 * @param {import("@/types").Transfer[]} props.transfers
 * @param {import("@/types").Settlement[]} props.settlements
 * @param {import("@/types").User[]} props.members
 * @param {string} props.currentUserId
 * @param {string} props.groupId
 * @param {boolean} props.isAdmin
 * @param {(transfer: import("@/types").Transfer) => void} props.onSettle
 */
export default function SettleUp({
    transfers,
    settlements,
    members,
    currentUserId,
    groupId,
    isAdmin,
    onSettle,
}) {
    const [deleting, setDeleting] = useState(null);
    const [pendingUndo, setPendingUndo] = useState(null);
    const { showToast } = useToast();

    const nameFor = (uid) =>
        uid === currentUserId ? "you" : members.find((m) => m.uid === uid)?.name || "someone who left";

    const handleDelete = async (settlement) => {
        setPendingUndo(null);
        setDeleting(settlement.id);

        try {
            await deleteSettlement(settlement.id, groupId, currentUserId);
        } catch (error) {
            showToast(error.message || "couldn't undo the payment");
        } finally {
            setDeleting(null);
        }
    };

    // Matches firestore.rules: whoever logged it, either side of the payment,
    // or the admin.
    const canUndo = (settlement) =>
        isAdmin ||
        [settlement.createdBy, settlement.from, settlement.to].includes(currentUserId);

    return (
        <>
            {transfers.length === 0 ? (
                <p className="text-[15px] text-muted-foreground">everyone is settled up.</p>
            ) : (
                <ul className="flex flex-col gap-2" aria-label="payments to make">
                    {transfers.map((transfer) => (
                        <li
                            key={`${transfer.from}-${transfer.to}`}
                            className="flex items-center justify-between gap-3"
                        >
                            <span className="text-[15px] text-foreground">
                                {nameFor(transfer.from)}{" "}
                                <span className="text-subtle" aria-label="pays">
                                    →
                                </span>{" "}
                                {nameFor(transfer.to)}{" "}
                                <span className="font-mono">{formatRupees(transfer.amount)}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => onSettle(transfer)}
                                className={smallButtonClass}
                            >
                                mark paid
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {settlements.length > 0 && (
                <div className="mt-6">
                    <p className={labelClass}>recorded payments</p>
                    <ul className="mt-2" aria-label="recorded payments">
                        {settlements.map((settlement) => (
                            <li
                                key={settlement.id}
                                className="flex min-h-11 items-center justify-between gap-3 text-sm text-muted-foreground"
                            >
                                <span>
                                    {nameFor(settlement.from)} paid {nameFor(settlement.to)}{" "}
                                    <span className="font-mono text-foreground">
                                        {formatRupees(settlement.amount)}
                                    </span>
                                </span>
                                {canUndo(settlement) && (
                                    <button
                                        type="button"
                                        onClick={() => setPendingUndo(settlement)}
                                        disabled={deleting === settlement.id}
                                        className="h-11 px-1 font-mono text-[13px] text-subtle transition-colors hover:text-foreground disabled:opacity-50"
                                    >
                                        {deleting === settlement.id ? "…" : "undo"}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <ConfirmModal
                isOpen={pendingUndo !== null}
                title="undo this payment?"
                message={
                    pendingUndo
                        ? `this removes the record that ${nameFor(pendingUndo.from)} paid ${nameFor(
                              pendingUndo.to
                          )} ${formatRupees(pendingUndo.amount)}, so it shows as unpaid again.`
                        : ""
                }
                confirmText="undo payment"
                onConfirm={() => pendingUndo && handleDelete(pendingUndo)}
                onCancel={() => setPendingUndo(null)}
                danger
            />
        </>
    );
}
