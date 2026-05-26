import { Expense, MemberBalance, User } from "@/types";

/**
 * Calculate balance for each member in a group
 * Formula: balance = totalPaid - totalShare
 * Uses stored splits from each expense for accurate per-person shares.
 * Falls back to equal split for legacy expenses without splits data.
 *
 * @param expenses - All expenses in the group
 * @param members - All members in the group
 * @returns Array of member balances
 */
export const calculateMemberBalances = (
    expenses: Expense[],
    members: User[]
): MemberBalance[] => {
    const balances: { [uid: string]: number } = {};
    members.forEach((member) => {
        balances[member.uid] = 0;
    });

    expenses.forEach((expense) => {
        // Add to payer's balance (they paid this amount)
        if (balances[expense.paidBy] !== undefined) {
            balances[expense.paidBy] += expense.amount;
        }

        if (expense.splits && Object.keys(expense.splits).length > 0) {
            // Use stored splits
            for (const [uid, share] of Object.entries(expense.splits)) {
                if (balances[uid] !== undefined) {
                    balances[uid] -= share;
                }
            }
        } else {
            // Legacy fallback: equal split among all members
            const sharePerPerson = Math.round((expense.amount / members.length) * 100) / 100;
            members.forEach((member) => {
                if (balances[member.uid] !== undefined) {
                    balances[member.uid] -= sharePerPerson;
                }
            });
        }
    });

    return members.map((member) => ({
        uid: member.uid,
        name: member.name,
        balance: Math.round(balances[member.uid] * 100) / 100,
    }));
};

/**
 * Format balance for display
 * @param balance - Balance amount
 * @returns Formatted string with color indicator
 */
export const formatBalance = (balance: number): {
    text: string;
    color: "green" | "red" | "gray";
} => {
    if (balance > 0) {
        return {
            text: `₹${balance.toFixed(2)} lena hai`,
            color: "green",
        };
    } else if (balance < 0) {
        return {
            text: `₹${Math.abs(balance).toFixed(2)} dena hai`,
            color: "red",
        };
    } else {
        return {
            text: "Settled",
            color: "gray",
        };
    }
};
