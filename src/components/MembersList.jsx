"use client";

import { removeMemberFromGroup } from "@/lib/groups";
import { saveUpiId } from "@/lib/user";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "./ConfirmModal";
import { useState } from "react";

/**
 * Inline editor for your own UPI ID. Lives here rather than on a settings page
 * because this is where you see everyone else's, which is what prompts you to
 * add your own.
 *
 * @param {Object} props
 * @param {string} props.currentUserId
 * @param {string} [props.upiId]
 * @param {(upiId: string) => void} props.onSaved
 */
function UpiIdField({ currentUserId, upiId, onSaved }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(upiId || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        setError("");
        setSaving(true);
        try {
            const saved = value.trim();
            await saveUpiId(currentUserId, saved);
            setEditing(false);
            onSaved(saved);
        } catch (err) {
            setError(err.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-0.5"
            >
                {upiId ? `UPI: ${upiId} (edit)` : "+ Add your UPI ID"}
            </button>
        );
    }

    return (
        <div className="mt-1">
            <div className="flex items-center gap-1">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="name@okhdfcbank"
                    className="px-2 py-1 border border-input rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={saving}
                    autoFocus
                />
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50"
                >
                    {saving ? "..." : "Save"}
                </button>
                <button
                    onClick={() => {
                        setEditing(false);
                        setValue(upiId || "");
                        setError("");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Cancel
                </button>
            </div>
            {error && <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</div>}
        </div>
    );
}

/**
 * @param {Object} props
 * @param {import("@/types").User[]} props.members
 * @param {import("@/types").MemberBalance[]} props.balances
 * @param {string} props.adminId
 * @param {string} props.currentUserId
 * @param {string} props.groupId
 * @param {(userId: string) => void} props.onMemberRemoved
 *   Passed the uid so the caller can drop them locally without refetching.
 * @param {(upiId: string) => void} props.onProfileUpdated
 *   Passed the saved value so the caller can patch its own profile copy.
 */
export default function MembersList({
    members,
    balances,
    adminId,
    currentUserId,
    groupId,
    onMemberRemoved,
    onProfileUpdated,
}) {
    const [removing, setRemoving] = useState(null);
    const [pendingRemoval, setPendingRemoval] = useState(null);
    const { showToast } = useToast();
    const isAdmin = currentUserId === adminId;

    const balanceByUid = new Map(balances.map((b) => [b.uid, b.balance]));

    // A member mid-debt can't be removed: expenses can only reference current
    // members, so once they're out there is no way to settle with them.
    const settleFirst = (uid) => {
        const balance = balanceByUid.get(uid) ?? 0;
        if (balance === 0) return null;
        return balance > 0
            ? `Owed ₹${balance.toFixed(2)} — settle up before removing`
            : `Owes ₹${Math.abs(balance).toFixed(2)} — settle up before removing`;
    };

    const handleRemoveMember = async (member) => {
        setPendingRemoval(null);
        setRemoving(member.uid);

        try {
            await removeMemberFromGroup(groupId, member.uid, currentUserId);
            onMemberRemoved(member.uid);
        } catch (error) {
            showToast(error.message || "Failed to remove member");
        } finally {
            setRemoving(null);
        }
    };

    return (
        <>
            <div className="space-y-3">
                {members.map((member) => (
                    <div
                        key={member.uid}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            {member.photoURL ? (
                                <img
                                    src={member.photoURL}
                                    alt={member.name}
                                    className="w-10 h-10 rounded-full"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <div className="font-medium text-foreground">
                                    {member.name}
                                    {member.uid === adminId && (
                                        <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                            Admin
                                        </span>
                                    )}
                                </div>
                                {member.uid === currentUserId && (
                                    <div className="text-sm text-muted-foreground">{member.email}</div>
                                )}
                                {member.uid === currentUserId ? (
                                    <UpiIdField
                                        currentUserId={currentUserId}
                                        upiId={member.upiId}
                                        onSaved={onProfileUpdated}
                                    />
                                ) : (
                                    member.upiId && (
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            UPI: {member.upiId}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {isAdmin && member.uid !== adminId && (
                            <div className="text-right">
                                <button
                                    onClick={() => setPendingRemoval(member)}
                                    disabled={removing === member.uid || settleFirst(member.uid) !== null}
                                    title={settleFirst(member.uid) ?? undefined}
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium disabled:text-muted-foreground disabled:cursor-not-allowed"
                                >
                                    {removing === member.uid ? "Removing..." : "Remove"}
                                </button>
                                {settleFirst(member.uid) && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        Settle up first
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <ConfirmModal
                isOpen={pendingRemoval !== null}
                title="Remove member"
                message={
                    pendingRemoval
                        ? `Remove ${pendingRemoval.name} from the group? They keep their place in the expense history, so past splits stay as they are.`
                        : ""
                }
                confirmText="Remove"
                onConfirm={() => pendingRemoval && handleRemoveMember(pendingRemoval)}
                onCancel={() => setPendingRemoval(null)}
                danger
            />
        </>
    );
}
