"use client";

import { MemberBalance, User } from "@/types";
import { removeMemberFromGroup } from "@/lib/groups";
import { saveUpiId } from "@/lib/user";
import { useState } from "react";

interface MembersListProps {
    members: User[];
    balances: MemberBalance[];
    adminId: string;
    currentUserId: string;
    groupId: string;
    onMemberRemoved: () => void;
    onProfileUpdated: () => void;
}

/**
 * Inline editor for your own UPI ID. Lives here rather than on a settings page
 * because this is where you see everyone else's, which is what prompts you to
 * add your own.
 */
function UpiIdField({
    currentUserId,
    upiId,
    onSaved,
}: {
    currentUserId: string;
    upiId?: string;
    onSaved: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(upiId || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        setError("");
        setSaving(true);
        try {
            await saveUpiId(currentUserId, value);
            setEditing(false);
            onSaved();
        } catch (err: any) {
            setError(err.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-700 mt-0.5"
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
                    className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={saving}
                    autoFocus
                />
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                    {saving ? "..." : "Save"}
                </button>
                <button
                    onClick={() => {
                        setEditing(false);
                        setValue(upiId || "");
                        setError("");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                >
                    Cancel
                </button>
            </div>
            {error && <div className="text-xs text-red-600 mt-0.5">{error}</div>}
        </div>
    );
}

export default function MembersList({
    members,
    balances,
    adminId,
    currentUserId,
    groupId,
    onMemberRemoved,
    onProfileUpdated,
}: MembersListProps) {
    const [removing, setRemoving] = useState<string | null>(null);
    const isAdmin = currentUserId === adminId;

    const balanceByUid = new Map(balances.map((b) => [b.uid, b.balance]));

    // A member mid-debt can't be removed: expenses can only reference current
    // members, so once they're out there is no way to settle with them.
    const settleFirst = (uid: string): string | null => {
        const balance = balanceByUid.get(uid) ?? 0;
        if (balance === 0) return null;
        return balance > 0
            ? `Owed ₹${balance.toFixed(2)} — settle up before removing`
            : `Owes ₹${Math.abs(balance).toFixed(2)} — settle up before removing`;
    };

    const handleRemoveMember = async (userId: string, userName: string) => {
        if (!confirm(`Remove ${userName} from the group?`)) return;

        setRemoving(userId);
        try {
            await removeMemberFromGroup(groupId, userId, currentUserId);
            onMemberRemoved();
        } catch (error: any) {
            alert(error.message || "Failed to remove member");
        } finally {
            setRemoving(null);
        }
    };

    return (
        <div className="space-y-3">
            {members.map((member) => (
                <div
                    key={member.uid}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
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
                            <div className="font-medium text-gray-900">
                                {member.name}
                                {member.uid === adminId && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        Admin
                                    </span>
                                )}
                            </div>
                            {member.uid === currentUserId && (
                                <div className="text-sm text-gray-600">{member.email}</div>
                            )}
                            {member.uid === currentUserId ? (
                                <UpiIdField
                                    currentUserId={currentUserId}
                                    upiId={member.upiId}
                                    onSaved={onProfileUpdated}
                                />
                            ) : (
                                member.upiId && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        UPI: {member.upiId}
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {isAdmin && member.uid !== adminId && (
                        <div className="text-right">
                            <button
                                onClick={() => handleRemoveMember(member.uid, member.name)}
                                disabled={removing === member.uid || settleFirst(member.uid) !== null}
                                title={settleFirst(member.uid) ?? undefined}
                                className="text-red-600 hover:text-red-700 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {removing === member.uid ? "Removing..." : "Remove"}
                            </button>
                            {settleFirst(member.uid) && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                    Settle up first
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
