/**
 * Money is held as integer paise for every intermediate calculation. Rounding
 * each person's share independently loses money — ₹100 split three ways gives
 * 33.33 each, which is a paisa short of what the payer actually put in — and
 * the error compounds over a group's history until the balances stop summing
 * to zero. Working in paise and handing out the remainder keeps them exact.
 *
 * Non-finite input is floored to 0 rather than allowed through. Security rules
 * can't type-check the values of a splits map, so a member can write a share
 * the UI would never produce; letting that become NaN here would spread
 * through every balance in the group.
 *
 * @param {number} rupees
 * @returns {number}
 */
const toPaise = (rupees) => {
    const paise = Math.round(Number(rupees) * 100);
    return Number.isFinite(paise) ? paise : 0;
};

/**
 * @param {number} paise
 * @returns {number}
 */
const toRupees = (paise) => paise / 100;

/**
 * Split an amount equally between the given members.
 * Leftover paise are handed out one at a time, so shares differ by at most
 * ₹0.01 and always add back up to `amount`.
 *
 * @param {number} amount - Total amount in INR
 * @param {string[]} uids - Members sharing the expense
 * @returns {Object<string, number>} Map of uid to amount owed
 */
export const splitEqually = (amount, uids) => {
    if (uids.length === 0) return {};

    const totalPaise = toPaise(amount);
    const base = Math.floor(totalPaise / uids.length);
    let leftover = totalPaise - base * uids.length;

    const splits = {};
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
 * @param {number} amount - Total amount in INR
 * @param {Object<string, number>} percentages - Map of uid to percentage (entries of 0 are ignored)
 * @returns {Object<string, number>} Map of uid to amount owed
 */
export const splitByPercentage = (amount, percentages) => {
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
 * @param {import("@/types").Expense[]} expenses - All expenses in the group
 * @param {string[]} memberUids - UIDs of the group's current members
 * @param {import("@/types").Settlement[]} [settlements] - Repayments already made between members
 * @returns {Object<string, number>} Map of uid to balance in INR
 */
export const calculateBalancesByUid = (expenses, memberUids, settlements = []) => {
    const balances = {};
    for (const uid of participantUids(expenses, memberUids, settlements)) {
        balances[uid] = 0;
    }

    const applyShares = (splits) => {
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

    // Paying someone back cancels the debt in both directions: the payer is out
    // of pocket by that much less, the payee is owed that much less.
    settlements.forEach((settlement) => {
        if (balances[settlement.from] !== undefined) {
            balances[settlement.from] += toPaise(settlement.amount);
        }
        if (balances[settlement.to] !== undefined) {
            balances[settlement.to] -= toPaise(settlement.amount);
        }
    });

    return Object.fromEntries(
        Object.entries(balances).map(([uid, paise]) => [uid, toRupees(paise)])
    );
};

/**
 * Everyone who takes part in the group's ledger: its current members plus
 * anyone who paid for, was included in an expense, or settled up.
 *
 * @param {import("@/types").Expense[]} expenses
 * @param {string[]} memberUids
 * @param {import("@/types").Settlement[]} [settlements]
 * @returns {string[]}
 */
const participantUids = (expenses, memberUids, settlements = []) => {
    const uids = new Set(memberUids);
    for (const expense of expenses) {
        uids.add(expense.paidBy);
        for (const uid of Object.keys(expense.splits ?? {})) {
            uids.add(uid);
        }
    }
    for (const settlement of settlements) {
        uids.add(settlement.from);
        uids.add(settlement.to);
    }
    return [...uids];
};

/**
 * Work out who should pay whom to clear the group's debts.
 *
 * Balances alone only say what each person is up or down; they don't say who
 * hands money to whom. Repeatedly matching the largest debtor against the
 * largest creditor clears at least one person per transfer, so a group of n
 * people never needs more than n-1 payments.
 *
 * @param {Object<string, number>} balances - Map of uid to balance in INR, as returned by calculateBalancesByUid
 * @returns {import("@/types").Transfer[]} Transfers to make, largest first
 */
export const simplifyDebts = (balances) => {
    const debtors = [];
    const creditors = [];

    for (const [uid, balance] of Object.entries(balances)) {
        const paise = toPaise(balance);
        if (paise < 0) debtors.push({ uid, paise: -paise });
        else if (paise > 0) creditors.push({ uid, paise });
    }

    // Largest first, so the biggest debts are cleared in the fewest payments.
    debtors.sort((a, b) => b.paise - a.paise || a.uid.localeCompare(b.uid));
    creditors.sort((a, b) => b.paise - a.paise || a.uid.localeCompare(b.uid));

    const transfers = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const paise = Math.min(debtors[i].paise, creditors[j].paise);
        transfers.push({
            from: debtors[i].uid,
            to: creditors[j].uid,
            amount: toRupees(paise),
        });

        debtors[i].paise -= paise;
        creditors[j].paise -= paise;
        if (debtors[i].paise === 0) i++;
        if (creditors[j].paise === 0) j++;
    }

    return transfers;
};

/**
 * Calculate balance for each member in a group, with display names attached.
 * Members come first, then anyone who has left the group but is still part of
 * its history (flagged with isFormerMember).
 *
 * @param {import("@/types").Expense[]} expenses - All expenses in the group
 * @param {import("@/types").User[]} members - Current members, plus profiles for any former participants
 * @param {string[]} [memberUids] - UIDs of the current members; defaults to every uid in `members`
 * @param {import("@/types").Settlement[]} [settlements] - Repayments already made between members
 * @returns {import("@/types").MemberBalance[]} Array of member balances
 */
export const calculateMemberBalances = (
    expenses,
    members,
    memberUids = members.map((m) => m.uid),
    settlements = []
) => {
    const balances = calculateBalancesByUid(expenses, memberUids, settlements);
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
 * @param {number} balance - Balance amount
 * @returns {{ text: string, color: "green" | "red" | "gray" }} Formatted string with color indicator
 */
export const formatBalance = (balance) => {
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
