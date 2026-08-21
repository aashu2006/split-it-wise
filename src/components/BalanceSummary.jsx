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
            <div className="text-center py-8 text-gray-500">
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
                    green: "bg-green-50 border-green-200 text-green-800",
                    red: "bg-red-50 border-red-200 text-red-800",
                    gray: "bg-gray-50 border-gray-200 text-gray-600",
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
                                        <span className="text-xs font-normal bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
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
