"use client";

import { formatBalance } from "@/lib/calculations";

/**
 * @param {Object} props
 * @param {import("@/types").MemberBalance[]} props.balances
 * @param {string} props.currentUserId
 */
export default function BalanceSummary({ balances, currentUserId }) {
    // Former members only matter while they still owe or are owed something.
    // Once settled they are just clutter in a list of current members.
    const visible = balances.filter(
        (memberBalance) => !memberBalance.isFormerMember || memberBalance.balance !== 0
    );

    if (visible.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Add expenses to see who owes whom
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {visible.map((memberBalance) => {
                const { text, color } = formatBalance(memberBalance.balance);
                const isCurrentUser = memberBalance.uid === currentUserId;

                const colorClasses = {
                    green: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900 text-green-800 dark:text-green-200",
                    red: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200",
                    gray: "bg-muted border-border text-muted-foreground",
                };

                return (
                    <div
                        key={memberBalance.uid}
                        className={`rounded-lg p-4 border ${colorClasses[color]}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold flex items-center gap-2">
                                    <span>
                                        {memberBalance.name}
                                        {isCurrentUser && " (You)"}
                                    </span>
                                    {memberBalance.isFormerMember && (
                                        <span className="text-xs font-normal bg-muted text-foreground px-2 py-0.5 rounded">
                                            left group
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm mt-1">{text}</div>
                            </div>
                            <div className="text-2xl font-bold">
                                {memberBalance.balance > 0 ? "+" : ""}
                                {memberBalance.balance === 0 ? "" : "₹"}
                                {memberBalance.balance === 0
                                    ? "✓"
                                    : Math.abs(memberBalance.balance).toFixed(2)}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
