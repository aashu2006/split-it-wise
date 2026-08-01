"use client";

import { MemberBalance, User } from "@/types";
import { removeMemberFromGroup } from "@/lib/groups";
import { useState } from "react";

interface MembersListProps {
    members: User[];
    balances: MemberBalance[];
    adminId: string;
    currentUserId: string;
    groupId: string;
    onMemberRemoved: () => void;
}

export default function MembersList({
    members,
    balances,
    adminId,
    currentUserId,
    groupId,
    onMemberRemoved,
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
