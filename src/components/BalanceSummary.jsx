"use client";

import { formatRupees } from "@/components/ui/kit";

/**
 * Everyone's balance as a ledger: name, a dotted leader, the amount.
 *
 * @param {Object} props
 * @param {import("@/types").MemberBalance[]} props.balances
 * @param {string} props.currentUserId
 */
export default function BalanceSummary({ balances, currentUserId }) {
    // Former members only matter while they still have money to get back or
    // pay. Once settled they are just clutter in a list of current members.
    const visible = balances.filter(
        (memberBalance) => !memberBalance.isFormerMember || memberBalance.balance !== 0
    );

    if (visible.length === 0) {
        return <p className="text-sm text-muted-foreground">add an expense to see balances.</p>;
    }

    return (
        <ul className="font-mono text-sm" aria-label="balances">
            {visible.map((memberBalance) => {
                const isYou = memberBalance.uid === currentUserId;
                const { balance } = memberBalance;

                return (
                    <li key={memberBalance.uid} className="flex items-baseline py-1.5">
                        <span className="text-foreground">
                            {isYou ? "you" : memberBalance.name}
                            {memberBalance.isFormerMember && (
                                <span className="ml-2 text-xs text-subtle">left group</span>
                            )}
                        </span>
                        <span className="mx-2.5 flex-1 border-b border-dotted border-border" aria-hidden="true" />
                        {balance === 0 ? (
                            <span className="text-subtle">settled</span>
                        ) : (
                            <span className={balance > 0 ? "text-positive" : "text-negative"}>
                                {/* Spelled out for screen readers, which read a
                                    bare minus sign as nothing at all. */}
                                <span className="sr-only">{balance > 0 ? "gets back " : "needs to pay "}</span>
                                <span aria-hidden="true">{balance > 0 ? "+" : "−"}</span>
                                {formatRupees(balance).slice(1)}
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
