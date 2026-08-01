import { Expense, MemberBalance, User } from "@/types";

/**
 * Money is held as integer paise for every intermediate calculation. Rounding
 * each person's share independently loses money — ₹100 split three ways gives
 * 33.33 each, which is a paisa short of what the payer actually put in — and
 * the error compounds over a group's history until the balances stop summing
 * to zero. Working in paise and handing out the remainder keeps them exact.
 */
const toPaise = (rupees: number): number => Math.round(rupees * 100);
const toRupees = (paise: number): number => paise / 100;

/**
 * Split an amount equally between the given members.
 * Leftover paise are handed out one at a time, so shares differ by at most
 * ₹0.01 and always add back up to `amount`.
 *
 * @param amount - Total amount in INR
 * @param uids - Members sharing the expense
 * @returns Map of uid to amount owed
 */
export const splitEqually = (
    amount: number,
    uids: string[]
): { [uid: string]: number } => {
    if (uids.length === 0) return {};

    const totalPaise = toPaise(amount);
    const base = Math.floor(totalPaise / uids.length);
    let leftover = totalPaise - base * uids.length;

    const splits: { [uid: string]: number } = {};
    for (const uid of uids) {
        splits[uid] = toRupees(leftover > 0 ? base + 1 : base);
        if (leftover > 0) leftover--;
    }

    return splits;
};

/**
 * Split an amount by percentage using the largest-remainder method: everyone is
 * rounded down first, then the leftover paise go to whoever lost the most to
 * rounding. Percentages are expected to add up to 100.
 *
 * @param amount - Total amount in INR
 * @param percentages - Map of uid to percentage (entries of 0 are ignored)
 * @returns Map of uid to amount owed
 */
export const splitByPercentage = (
    amount: number,
    percentages: { [uid: string]: number }
): { [uid: string]: number } => {
    const uids = Object.keys(percentages).filter((uid) => percentages[uid] > 0);
    if (uids.length === 0) return {};

    const totalPaise = toPaise(amount);
    const exact = uids.map((uid) => (totalPaise * percentages[uid]) / 100);
    const shares = exact.map((value) => Math.floor(value));

    const byRemainder = exact
        .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
        .sort((a, b) => b.remainder - a.remainder);

    let leftover = totalPaise - shares.reduce((sum, paise) => sum + paise, 0);
    for (let i = 0; leftover > 0; i++, leftover--) {
        shares[byRemainder[i % byRemainder.length].index] += 1;
    }

    return Object.fromEntries(uids.map((uid, i) => [uid, toRupees(shares[i])]));
};

/**
 * Calculate balance for each member in a group
 * Formula: balance = totalPaid - totalShare
 * Uses stored splits from each expense for accurate per-person shares.
 * Falls back to equal split for legacy expenses without splits data.
 *
 * Balances are keyed by every uid that takes part in the group's history, not
 * just its current members. Someone who was removed while still owing money
 * keeps their balance here — dropping them would delete their share of the
 * ledger and leave the remaining balances no longer summing to zero.
 *
 * @param expenses - All expenses in the group
 * @param memberUids - UIDs of the group's current members
 * @returns Map of uid to balance in INR
 */
export const calculateBalancesByUid = (
    expenses: Expense[],
    memberUids: string[]
): { [uid: string]: number } => {
    const balances: { [uid: string]: number } = {};
    for (const uid of participantUids(expenses, memberUids)) {
        balances[uid] = 0;
    }

    const applyShares = (splits: { [uid: string]: number }) => {
        for (const [uid, share] of Object.entries(splits)) {
            if (balances[uid] !== undefined) {
                balances[uid] -= toPaise(share);
            }
        }
    };

    expenses.forEach((expense) => {
        // Add to payer's balance (they paid this amount)
        if (balances[expense.paidBy] !== undefined) {
            balances[expense.paidBy] += toPaise(expense.amount);
        }

        if (expense.splits && Object.keys(expense.splits).length > 0) {
            // Use stored splits
            applyShares(expense.splits);
        } else {
            // Legacy fallback: equal split among the current members. Who was
            // in the group back then isn't recoverable from an expense that
            // predates stored splits.
            applyShares(splitEqually(expense.amount, memberUids));
        }
    });

    return Object.fromEntries(
        Object.entries(balances).map(([uid, paise]) => [uid, toRupees(paise)])
    );
};

/**
 * Everyone who takes part in the group's ledger: its current members plus
 * anyone who paid for or was included in an expense.
 */
const participantUids = (expenses: Expense[], memberUids: string[]): string[] => {
    const uids = new Set(memberUids);
    for (const expense of expenses) {
        uids.add(expense.paidBy);
        for (const uid of Object.keys(expense.splits ?? {})) {
            uids.add(uid);
        }
    }
    return [...uids];
};

/**
 * Calculate balance for each member in a group, with display names attached.
 * Members come first, then anyone who has left the group but is still part of
 * its history (flagged with isFormerMember).
 *
 * @param expenses - All expenses in the group
 * @param members - Current members, plus profiles for any former participants
 * @param memberUids - UIDs of the current members; defaults to every uid in `members`
 * @returns Array of member balances
 */
export const calculateMemberBalances = (
    expenses: Expense[],
    members: User[],
    memberUids: string[] = members.map((m) => m.uid)
): MemberBalance[] => {
    const balances = calculateBalancesByUid(expenses, memberUids);
    const currentMembers = new Set(memberUids);
    const namesByUid = new Map(members.map((m) => [m.uid, m.name]));

    return Object.keys(balances)
        .sort((a, b) => Number(currentMembers.has(b)) - Number(currentMembers.has(a)))
        .map((uid) => ({
            uid,
            name: namesByUid.get(uid) || "Unknown",
            balance: balances[uid],
            isFormerMember: !currentMembers.has(uid),
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
