"use client";

import { MemberBalance } from "@/types";
import { formatBalance } from "@/lib/calculations";

interface BalanceSummaryProps {
    balances: MemberBalance[];
    currentUserId: string;
}

export default function BalanceSummary({
    balances,
    currentUserId,
}: BalanceSummaryProps) {
    if (balances.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                Add expenses to see who owes whom
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {balances.map((memberBalance) => {
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
                                <div className="font-semibold">
                                    {memberBalance.name}
                                    {isCurrentUser && " (You)"}
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
