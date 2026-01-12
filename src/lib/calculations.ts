import { Expense, MemberBalance, User } from "@/types";

/**
 * Calculate balance for each member in a group
 * Formula: balance = totalPaid - totalShare
 * 
 * @param expenses - All expenses in the group
 * @param members - All members in the group
 * @param memberCount - Current number of members (for equal split)
 * @returns Array of member balances
 */
export const calculateMemberBalances = (
    expenses: Expense[],
    members: User[],
    memberCount: number
): MemberBalance[] => {
    // Initialize balances for all members
    const balances: { [uid: string]: number } = {};
    members.forEach((member) => {
        balances[member.uid] = 0;
    });

    // Process each expense
    expenses.forEach((expense) => {
        const sharePerPerson = expense.amount / memberCount;
        const roundedShare = Math.round(sharePerPerson * 100) / 100;

        // Add to payer's balance (they paid this amount)
        if (balances[expense.paidBy] !== undefined) {
            balances[expense.paidBy] += expense.amount;
        }

        // Subtract share from everyone's balance
        members.forEach((member) => {
            if (balances[member.uid] !== undefined) {
                balances[member.uid] -= roundedShare;
            }
        });
    });

    // Convert to array and round final balances
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
