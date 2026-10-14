"use client";

import { removeMemberFromGroup } from "@/lib/groups";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "./ConfirmModal";
import { useState } from "react";
import { formatRupees, textButtonClass } from "@/components/ui/kit";

/**
 * @param {Object} props
 * @param {import("@/types").User[]} props.members
 * @param {import("@/types").MemberBalance[]} props.balances
 * @param {string} props.adminId
 * @param {string} props.currentUserId
 * @param {string} [props.currentUserEmail]
 *   From Firebase Auth. Profiles don't store emails, and only your own is shown.
 * @param {string} props.groupId
 */
export default function MembersList({
    members,
    balances,
    adminId,
    currentUserId,
    currentUserEmail,
    groupId,
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
            ? `gets back ${formatRupees(balance)}, settle up first`
            : `needs to pay ${formatRupees(balance)}, settle up first`;
    };

    const handleRemoveMember = async (member) => {
        setPendingRemoval(null);
        setRemoving(member.uid);

        try {
            await removeMemberFromGroup(groupId, member.uid, currentUserId);
        } catch (error) {
            showToast(error.message || "couldn't remove them");
        } finally {
            setRemoving(null);
        }
    };

    return (
        <>
            <ul className="flex flex-col" aria-label="people">
                {members.map((member) => {
                    const isYou = member.uid === currentUserId;
                    const blocked = settleFirst(member.uid);
                    return (
                        <li
                            key={member.uid}
                            className="flex min-h-14 items-center justify-between gap-3 border-b border-hairline py-2"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                {member.photoURL ? (
                                    <img
                                        src={member.photoURL}
                                        alt=""
                                        className="h-8 w-8 rounded-full"
                                    />
                                ) : (
                                    <span
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs text-foreground"
                                        aria-hidden="true"
                                    >
                                        {member.name.charAt(0).toLowerCase()}
                                    </span>
                                )}
                                <div className="min-w-0">
                                    <p className="truncate text-[15px] text-foreground">
                                        {isYou ? `${member.name} (you)` : member.name}
                                        {member.uid === adminId && (
                                            <span className="ml-2 font-mono text-xs text-subtle">admin</span>
                                        )}
                                    </p>
                                    {isYou && currentUserEmail && (
                                        <p className="truncate text-[13px] text-subtle">{currentUserEmail}</p>
                                    )}
                                    {isAdmin && !isYou && blocked && (
                                        <p className="text-[13px] text-subtle">{blocked}</p>
                                    )}
                                </div>
                            </div>

                            {isAdmin && member.uid !== adminId && (
                                <button
                                    type="button"
                                    onClick={() => setPendingRemoval(member)}
                                    disabled={removing === member.uid || blocked !== null}
                                    className={`${textButtonClass("text-negative")} shrink-0 disabled:text-subtle`}
                                >
                                    {removing === member.uid ? "removing…" : "remove"}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>

            <ConfirmModal
                isOpen={pendingRemoval !== null}
                title="remove from group?"
                message={
                    pendingRemoval
                        ? `${pendingRemoval.name} will leave the group. they keep their place in the expense history, so past splits stay as they are.`
                        : ""
                }
                confirmText="remove"
                onConfirm={() => pendingRemoval && handleRemoveMember(pendingRemoval)}
                onCancel={() => setPendingRemoval(null)}
                danger
            />
        </>
    );
}
