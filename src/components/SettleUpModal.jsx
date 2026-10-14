"use client";

import { useState } from "react";
import { addSettlement } from "@/lib/settlements";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { buttonClass, fieldClass, formatRupees, labelClass } from "@/components/ui/kit";

/**
 * @param {Object} props
 * @param {import("@/types").Transfer | null} props.transfer
 * @param {import("@/types").User[]} props.members
 * @param {string} props.currentUserId
 * @param {string} props.groupId
 * @param {() => void} props.onClose
 */
export default function SettleUpModal({
    transfer,
    members,
    currentUserId,
    groupId,
    onClose,
}) {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // The parent passes null to mean "closed", so this component is only ever
    // mounted when there is a transfer to settle — which is why the Dialog
    // below is unconditionally open.
    if (!transfer) return null;

    const nameFor = (uid) =>
        uid === currentUserId ? "you" : members.find((m) => m.uid === uid)?.name || "someone";
    const payeeName = nameFor(transfer.to);
    const isPayer = currentUserId === transfer.from;

    // Default to clearing the whole debt, but allow a part payment.
    const amountNum = amount === "" ? transfer.amount : parseFloat(amount) || 0;

    const handleRecord = async () => {
        setError("");

        if (amountNum <= 0) {
            setError("enter an amount above ₹0");
            return;
        }
        if (amountNum > transfer.amount) {
            setError(`that's more than the ${formatRupees(transfer.amount)} to pay`);
            return;
        }

        setLoading(true);
        try {
            await addSettlement(
                groupId,
                transfer.from,
                transfer.to,
                amountNum,
                currentUserId
            );
            setAmount("");
            onClose();
        } catch (err) {
            setError(err.message || "couldn't record the payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>mark as paid</DialogTitle>
                    <DialogDescription className="text-[15px] text-foreground">
                        {nameFor(transfer.from)} <span className="text-subtle" aria-label="pays">→</span>{" "}
                        {payeeName}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                    <label htmlFor="settle-amount" className={labelClass}>
                        amount (₹)
                    </label>
                    <input
                        type="number"
                        id="settle-amount"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={transfer.amount.toFixed(2)}
                        step="0.01"
                        min="0"
                        max={transfer.amount}
                        className={`${fieldClass} font-mono`}
                        disabled={loading}
                    />
                    <p className="text-[13px] text-subtle">
                        leave it blank to clear the full {formatRupees(transfer.amount)}, or enter less
                        for a part payment.
                    </p>
                </div>

                {/* The money moves outside the app, however the two of them
                    usually pay each other; this only records that it happened. */}
                {isPayer && (
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                        pay {payeeName} however you usually do (cash, upi, bank transfer), then
                        record it here.
                    </p>
                )}

                {error && <p className="text-sm text-negative">{error}</p>}

                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={handleRecord}
                        disabled={loading}
                        className={buttonClass(true)}
                    >
                        <span>{loading ? "recording…" : "mark as paid"}</span>
                        <span className="text-muted-foreground" aria-hidden="true">
                            →
                        </span>
                    </button>
                    <p className="text-center font-mono text-xs text-subtle">
                        only once the money has actually moved.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
