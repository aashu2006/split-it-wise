import { beforeEach, describe, expect, it } from "vitest";
import {
    isDemoMode,
    DEMO_AUTH_USER,
    resetDemoStore,
    demoAddExpense,
    demoAddSettlement,
    demoDeleteExpense,
    demoGetGroup,
    demoGetGroupExpenses,
    demoGetGroupSettlements,
    demoGetUserGroups,
    demoGetUsersByIds,
    demoRemoveMember,
    demoSaveUpiId,
    demoUpdateGroupName,
} from "./demo";
import { calculateBalancesByUid, calculateMemberBalances } from "./calculations";

/**
 * Vitest doesn't load .env.local, so the Firebase config is always absent here
 * and the demo store is the live implementation. That makes these tests both a
 * check on the fixtures and a guard that demo mode still switches on when there
 * is no config.
 */

const HOSTEL = "demo-group-hostel";
const GOA = "demo-group-goa";
const YOU = DEMO_AUTH_USER.uid;
const SANA = "demo-sana";

const paise = (rupees) => Math.round(rupees * 100);
const sum = (values) => Math.round(values.reduce((a, b) => a + b, 0) * 100);

beforeEach(() => resetDemoStore());

describe("demo mode", () => {
    it("is on when there is no Firebase config", () => {
        expect(isDemoMode).toBe(true);
    });
});

describe("seeded fixtures", () => {
    it("puts the demo user in both groups", async () => {
        const groups = await demoGetUserGroups(YOU);
        expect(groups.map((g) => g.id).sort()).toEqual([GOA, HOSTEL]);
    });

    // Both admin and non-admin states need to exist, or half the group
    // dashboard's controls are unreachable while working on it.
    it("makes the demo user admin of one group and not the other", async () => {
        expect((await demoGetGroup(HOSTEL)).adminId).toBe(YOU);
        expect((await demoGetGroup(GOA)).adminId).not.toBe(YOU);
    });

    it("returns expenses newest first, like the real query", async () => {
        const expenses = await demoGetGroupExpenses(HOSTEL);
        const times = expenses.map((e) => e.createdAt.toMillis());
        expect([...times].sort((a, b) => b - a)).toEqual(times);
    });

    it("covers all three split types", async () => {
        const all = [
            ...(await demoGetGroupExpenses(HOSTEL)),
            ...(await demoGetGroupExpenses(GOA)),
        ];
        expect(new Set(all.map((e) => e.splitType))).toEqual(
            new Set(["equal", "exact", "percentage"])
        );
    });

    it("leaves one member without a UPI ID", async () => {
        // Otherwise SettleUpModal's "hasn't added a UPI ID yet" branch can
        // never be seen.
        const users = await demoGetUsersByIds(["demo-aarav", "demo-priya", "demo-rahul"]);
        expect(users.some((u) => !u.upiId)).toBe(true);
    });
});

describe("seeded balances", () => {
    it("nets to zero in every group", async () => {
        for (const groupId of [HOSTEL, GOA]) {
            const group = await demoGetGroup(groupId);
            const balances = calculateBalancesByUid(
                await demoGetGroupExpenses(groupId),
                group.members,
                await demoGetGroupSettlements(groupId)
            );
            expect(sum(Object.values(balances))).toBe(0);
        }
    });

    // The "left group" badge and the former-member row only render when
    // somebody is in the ledger but not in the member list, still unsettled.
    it("keeps a former member with an outstanding balance", async () => {
        const group = await demoGetGroup(GOA);
        expect(group.members).not.toContain(SANA);

        const balances = calculateMemberBalances(
            await demoGetGroupExpenses(GOA),
            await demoGetUsersByIds([...group.members, SANA]),
            group.members,
            await demoGetGroupSettlements(GOA)
        );

        const sana = balances.find((b) => b.uid === SANA);
        expect(sana.isFormerMember).toBe(true);
        expect(sana.balance).not.toBe(0);
    });

    it("has at least one settlement, so 'Payments made' is populated", async () => {
        expect((await demoGetGroupSettlements(GOA)).length).toBeGreaterThan(0);
    });
});

describe("mutations", () => {
    it("adds an expense and returns it at the top", async () => {
        const id = await demoAddExpense({
            groupId: HOSTEL,
            paidBy: YOU,
            createdBy: YOU,
            amount: 250,
            description: "Chai",
            splitType: "equal",
            splits: { [YOU]: 250 },
        });

        const expenses = await demoGetGroupExpenses(HOSTEL);
        expect(expenses[0].id).toBe(id);
        expect(expenses[0].description).toBe("Chai");
    });

    it("deletes an expense", async () => {
        const before = await demoGetGroupExpenses(HOSTEL);
        await demoDeleteExpense(before[0].id);
        const after = await demoGetGroupExpenses(HOSTEL);
        expect(after.map((e) => e.id)).not.toContain(before[0].id);
    });

    it("records a settlement that moves the balance", async () => {
        const group = await demoGetGroup(HOSTEL);
        const balanceFor = async () =>
            calculateBalancesByUid(
                await demoGetGroupExpenses(HOSTEL),
                group.members,
                await demoGetGroupSettlements(HOSTEL)
            )[YOU];

        const before = await balanceFor();
        await demoAddSettlement({
            groupId: HOSTEL,
            from: YOU,
            to: "demo-priya",
            amount: 100,
            createdBy: YOU,
        });

        expect(paise(await balanceFor())).toBe(paise(before + 100));
    });

    it("renames a group and removes a member", async () => {
        await demoUpdateGroupName(HOSTEL, "Room 202");
        await demoRemoveMember(HOSTEL, "demo-rahul");

        const group = await demoGetGroup(HOSTEL);
        expect(group.name).toBe("Room 202");
        expect(group.members).not.toContain("demo-rahul");
    });

    it("saves a UPI ID", async () => {
        await demoSaveUpiId("demo-rahul", "rahul@okicici");
        const [rahul] = await demoGetUsersByIds(["demo-rahul"]);
        expect(rahul.upiId).toBe("rahul@okicici");
    });

    // Handing out the stored object would let a component mutate the store by
    // accident, in a way that could never happen against Firestore.
    it("hands out copies, not the stored documents", async () => {
        const group = await demoGetGroup(HOSTEL);
        group.name = "mutated locally";
        expect((await demoGetGroup(HOSTEL)).name).toBe("Hostel Room 101");
    });

    it("resets back to the seed", async () => {
        await demoUpdateGroupName(HOSTEL, "Changed");
        resetDemoStore();
        expect((await demoGetGroup(HOSTEL)).name).toBe("Hostel Room 101");
    });
});
