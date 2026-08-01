import { describe, expect, it } from "vitest";
import {
    calculateBalancesByUid,
    calculateMemberBalances,
    splitByPercentage,
    splitEqually,
} from "./calculations";
import { Expense, User } from "@/types";

const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100);
const paise = (rupees: number) => Math.round(rupees * 100);

const user = (uid: string): User => ({ uid, name: uid.toUpperCase() } as User);
const MEMBERS = [user("a"), user("b"), user("c")];
const MEMBER_UIDS = ["a", "b", "c"];

const expense = (partial: Partial<Expense>): Expense =>
    ({ groupId: "g", description: "d", splitType: "equal", ...partial } as Expense);

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
