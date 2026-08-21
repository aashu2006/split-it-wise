import { describe, expect, it } from "vitest";
import {
    calculateBalancesByUid,
    calculateMemberBalances,
    simplifyDebts,
    splitByPercentage,
    splitEqually,
} from "./calculations";
import { buildUpiLink, isValidUpiId } from "./upi";

const sum = (values) => Math.round(values.reduce((a, b) => a + b, 0) * 100);
const paise = (rupees) => Math.round(rupees * 100);

const user = (uid) => ({ uid, name: uid.toUpperCase() });
const MEMBERS = [user("a"), user("b"), user("c")];
const MEMBER_UIDS = ["a", "b", "c"];

const expense = (partial) => ({
    groupId: "g",
    description: "d",
    splitType: "equal",
    ...partial,
});

const settlement = (from, to, amount) => ({
    id: `${from}-${to}-${amount}`,
    groupId: "g",
    from,
    to,
    amount,
});

describe("splitEqually", () => {
    it("sums to the original amount for every amount and group size", () => {
        for (let total = 1; total <= 5000; total++) {
            for (let n = 1; n <= 8; n++) {
                const uids = Array.from({ length: n }, (_, i) => `u${i}`);
                const shares = Object.values(splitEqually(total / 100, uids));
                expect(sum(shares)).toBe(total);
            }
        }
    });

    it("never spreads shares by more than a paisa", () => {
        for (let total = 1; total <= 5000; total++) {
            for (let n = 1; n <= 8; n++) {
                const uids = Array.from({ length: n }, (_, i) => `u${i}`);
                const shares = Object.values(splitEqually(total / 100, uids));
                expect(paise(Math.max(...shares) - Math.min(...shares))).toBeLessThanOrEqual(1);
            }
        }
    });

    it("splits 100 three ways without losing a paisa", () => {
        const shares = splitEqually(100, MEMBER_UIDS);
        expect(sum(Object.values(shares))).toBe(10000);
    });

    it("returns nothing when nobody is included", () => {
        expect(splitEqually(100, [])).toEqual({});
    });
});

describe("splitByPercentage", () => {
    it("sums to the original amount for uneven percentages", () => {
        const shares = splitByPercentage(100, { a: 33.33, b: 33.33, c: 33.34 });
        expect(sum(Object.values(shares))).toBe(10000);
    });

    it("sums exactly for amounts too small to divide", () => {
        const shares = splitByPercentage(0.03, { a: 33.33, b: 33.33, c: 33.34 });
        expect(sum(Object.values(shares))).toBe(3);
    });

    it("leaves out anyone on zero percent", () => {
        expect(splitByPercentage(100, { a: 100, b: 0 })).toEqual({ a: 100 });
    });
});

describe("calculateBalancesByUid", () => {
    it("nets to zero across mixed split types", () => {
        const expenses = [
            expense({ paidBy: "a", amount: 100, splits: splitEqually(100, MEMBER_UIDS) }),
            expense({ paidBy: "b", amount: 55.55, splits: splitEqually(55.55, MEMBER_UIDS) }),
            expense({
                paidBy: "c",
                amount: 10,
                splits: splitByPercentage(10, { a: 33.33, b: 33.33, c: 33.34 }),
            }),
            expense({ paidBy: "a", amount: 7.77, splits: { b: 7.77 } }),
        ];
        const balances = calculateBalancesByUid(expenses, MEMBER_UIDS);
        expect(sum(Object.values(balances))).toBe(0);
    });

    it("nets to zero for legacy expenses with no stored splits", () => {
        const balances = calculateBalancesByUid(
            [expense({ paidBy: "a", amount: 100 })],
            MEMBER_UIDS
        );
        expect(sum(Object.values(balances))).toBe(0);
    });

    it("does not drift over a long history", () => {
        const expenses = Array.from({ length: 500 }, () =>
            expense({ paidBy: "a", amount: 100, splits: splitEqually(100, MEMBER_UIDS) })
        );
        expect(sum(Object.values(calculateBalancesByUid(expenses, MEMBER_UIDS)))).toBe(0);
    });

    // The bug this file exists for: dropping a removed member deleted their
    // share of the ledger and left the rest no longer summing to zero.
    it("keeps a removed member's debt in the ledger", () => {
        const expenses = [
            expense({ paidBy: "a", amount: 90, splits: splitEqually(90, MEMBER_UIDS) }),
        ];
        const balances = calculateBalancesByUid(expenses, ["a", "b"]);

        expect(balances.c).toBe(-30);
        expect(sum(Object.values(balances))).toBe(0);
    });

    it("keeps a removed member's credit in the ledger", () => {
        const expenses = [
            expense({ paidBy: "c", amount: 90, splits: splitEqually(90, MEMBER_UIDS) }),
        ];
        const balances = calculateBalancesByUid(expenses, ["a", "b"]);

        expect(balances.c).toBe(60);
        expect(sum(Object.values(balances))).toBe(0);
    });

    // Security rules can't type-check the values of a splits map, so a member
    // writing straight to Firestore can store a share that isn't a number. It
    // must not turn every other balance in the group into NaN.
    it("ignores a split value that isn't a real number", () => {
        const expenses = [
            expense({
                paidBy: "a",
                amount: 90,
                splits: { a: 30, b: "oops", c: 30 },
            }),
        ];
        const balances = calculateBalancesByUid(expenses, MEMBER_UIDS);

        expect(balances.a).toBe(60);
        expect(balances.b).toBe(0);
        expect(balances.c).toBe(-30);
        expect(Object.values(balances).every(Number.isFinite)).toBe(true);
    });
});

describe("settlements", () => {
    const oneExpense = [expense({ paidBy: "a", amount: 90, splits: splitEqually(90, MEMBER_UIDS) })];

    it("clears a debt when it is paid in full", () => {
        const balances = calculateBalancesByUid(oneExpense, MEMBER_UIDS, [
            settlement("b", "a", 30),
            settlement("c", "a", 30),
        ]);
        expect(balances).toEqual({ a: 0, b: 0, c: 0 });
    });

    it("reduces the debt when paid in part", () => {
        const balances = calculateBalancesByUid(oneExpense, MEMBER_UIDS, [
            settlement("b", "a", 10),
        ]);
        expect(balances.b).toBe(-20);
        expect(balances.a).toBe(50);
        expect(sum(Object.values(balances))).toBe(0);
    });

    it("still nets to zero when someone overpays", () => {
        const balances = calculateBalancesByUid(oneExpense, MEMBER_UIDS, [
            settlement("b", "a", 50),
        ]);
        expect(balances.b).toBe(20);
        expect(sum(Object.values(balances))).toBe(0);
    });

    it("does not count repayments as group spending", () => {
        // A settlement moves money already spent, so it must not change what
        // anyone's share of the expenses was.
        const withSettlement = calculateBalancesByUid(oneExpense, MEMBER_UIDS, [
            settlement("b", "a", 30),
        ]);
        const without = calculateBalancesByUid(oneExpense, MEMBER_UIDS);
        expect(withSettlement.b - without.b).toBe(30);
    });
});

describe("simplifyDebts", () => {
    it("returns nothing when everyone is settled", () => {
        expect(simplifyDebts({ a: 0, b: 0, c: 0 })).toEqual([]);
    });

    it("pairs a single debtor with a single creditor", () => {
        expect(simplifyDebts({ a: 60, b: -60 })).toEqual([{ from: "b", to: "a", amount: 60 }]);
    });

    it("never needs more than n-1 transfers", () => {
        const balances = { a: 100, b: 50, c: -30, d: -45, e: -75 };
        const transfers = simplifyDebts(balances);
        expect(transfers.length).toBeLessThanOrEqual(Object.keys(balances).length - 1);
    });

    it("produces transfers that exactly clear every balance", () => {
        const balances = {
            a: 123.45,
            b: -60.2,
            c: -63.25,
            d: 0,
        };
        const settled = { ...balances };
        for (const transfer of simplifyDebts(balances)) {
            settled[transfer.from] += transfer.amount;
            settled[transfer.to] -= transfer.amount;
        }
        for (const uid of Object.keys(settled)) {
            expect(paise(settled[uid])).toBe(0);
        }
    });

    it("only ever moves money from debtors to creditors", () => {
        const balances = { a: 40, b: 20, c: -25, d: -35 };
        for (const transfer of simplifyDebts(balances)) {
            expect(balances[transfer.from]).toBeLessThan(0);
            expect(balances[transfer.to]).toBeGreaterThan(0);
            expect(transfer.amount).toBeGreaterThan(0);
        }
    });

    it("handles debts that do not divide evenly", () => {
        const transfers = simplifyDebts({ a: 33.34, b: -33.34 });
        expect(transfers).toEqual([{ from: "b", to: "a", amount: 33.34 }]);
    });
});

describe("upi", () => {
    it("accepts real-looking UPI IDs", () => {
        expect(isValidUpiId("akshat@okhdfcbank")).toBe(true);
        expect(isValidUpiId("akshat.patil-1@ybl")).toBe(true);
        expect(isValidUpiId("  akshat@paytm  ")).toBe(true);
    });

    it("rejects malformed ones", () => {
        expect(isValidUpiId("akshat")).toBe(false);
        expect(isValidUpiId("@ybl")).toBe(false);
        expect(isValidUpiId("akshat@")).toBe(false);
        expect(isValidUpiId("akshat@ybl@ybl")).toBe(false);
        expect(isValidUpiId("")).toBe(false);
    });

    it("builds a link the payment apps can read", () => {
        const link = buildUpiLink("akshat@ybl", "Akshat Patil", 300.5, "Goa trip settle up");
        expect(link).toBe(
            "upi://pay?pa=akshat%40ybl&pn=Akshat+Patil&am=300.50&cu=INR&tn=Goa+trip+settle+up"
        );
    });

    it("always sends two decimal places", () => {
        expect(buildUpiLink("a@ybl", "A", 300, "x")).toContain("am=300.00");
    });
});

describe("calculateMemberBalances", () => {
    it("flags participants who are no longer members", () => {
        const expenses = [
            expense({ paidBy: "a", amount: 90, splits: splitEqually(90, MEMBER_UIDS) }),
        ];
        const balances = calculateMemberBalances(expenses, MEMBERS, ["a", "b"]);

        const former = balances.filter((b) => b.isFormerMember);
        expect(former.map((b) => b.uid)).toEqual(["c"]);
        expect(balances.filter((b) => !b.isFormerMember).map((b) => b.uid)).toEqual(["a", "b"]);
    });

    it("treats everyone as a member when no member list is given", () => {
        const expenses = [
            expense({ paidBy: "a", amount: 90, splits: splitEqually(90, MEMBER_UIDS) }),
        ];
        const balances = calculateMemberBalances(expenses, MEMBERS);
        expect(balances.some((b) => b.isFormerMember)).toBe(false);
    });

    it("falls back to a placeholder when a profile is missing", () => {
        const expenses = [expense({ paidBy: "ghost", amount: 10, splits: { a: 10 } })];
        const balances = calculateMemberBalances(expenses, MEMBERS, MEMBER_UIDS);
        expect(balances.find((b) => b.uid === "ghost")?.name).toBe("Unknown");
    });
});
