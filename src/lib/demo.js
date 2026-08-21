import { Timestamp } from "firebase/firestore";
import { splitEqually, splitByPercentage } from "./calculations";
import { isFirebaseConfigured } from "./firebase";

/**
 * An in-memory stand-in for Firestore, used when there is no Firebase config.
 *
 * The point is that someone can clone the repo and work on the UI without
 * creating a Firebase project first — `npm run dev`, sign in, and every screen
 * is there with plausible data. It is only reachable when `.env.local` is
 * absent, so it can never shadow real data.
 *
 * This works because no component talks to Firestore directly; every read and
 * write goes through src/lib. That gives exactly one seam to swap, and the
 * functions below mirror those modules' signatures and ordering guarantees
 * (newest first, and so on) so the UI cannot tell the difference.
 *
 * State lives for the life of the page. A reload starts from the seed again,
 * which is what you want when you are trying a layout change over and over.
 */
export const isDemoMode = !isFirebaseConfigured;

/** Stands in for the Firebase Auth user object. */
export const DEMO_AUTH_USER = {
    uid: "demo-aarav",
    displayName: "Aarav Shah",
    email: "aarav@example.com",
    photoURL: null,
};

const YOU = "demo-aarav";
const PRIYA = "demo-priya";
const RAHUL = "demo-rahul";
/** Left the Goa group while still owed money, so the ledger keeps them. */
const SANA = "demo-sana";

const minutesAgo = (minutes) => Timestamp.fromMillis(Date.now() - minutes * 60_000);

const seed = () => {
    const users = [
        {
            uid: YOU,
            name: "Aarav Shah",
            email: "aarav@example.com",
            photoURL: "",
            upiId: "aarav@okhdfcbank",
            createdAt: minutesAgo(60_000),
        },
        {
            uid: PRIYA,
            name: "Priya Nair",
            email: "priya@example.com",
            photoURL: "",
            upiId: "priya@ybl",
            createdAt: minutesAgo(50_000),
        },
        {
            // Deliberately no upiId, so the "hasn't added a UPI ID yet" branch
            // in SettleUpModal is reachable without editing anything.
            uid: RAHUL,
            name: "Rahul Verma",
            email: "rahul@example.com",
            photoURL: "",
            createdAt: minutesAgo(40_000),
        },
        {
            uid: SANA,
            name: "Sana Khan",
            email: "sana@example.com",
            photoURL: "",
            upiId: "sana@okaxis",
            createdAt: minutesAgo(30_000),
        },
    ];

    const groups = [
        {
            // You are admin here: rename, remove members and delete are live.
            id: "demo-group-hostel",
            name: "Hostel Room 101",
            adminId: YOU,
            members: [YOU, PRIYA, RAHUL],
            joinOpen: true,
            createdAt: minutesAgo(20_000),
            updatedAt: minutesAgo(120),
        },
        {
            // You are NOT admin here, so the admin-only controls are hidden —
            // worth having both states available while working on the UI.
            id: "demo-group-goa",
            name: "Goa Trip",
            adminId: PRIYA,
            members: [YOU, PRIYA, RAHUL],
            joinOpen: false,
            createdAt: minutesAgo(15_000),
            updatedAt: minutesAgo(300),
        },
    ];

    const expense = (id, groupId, paidBy, amount, description, splitType, splits, age) => ({
        id,
        groupId,
        paidBy,
        createdBy: paidBy,
        amount,
        description,
        splitType,
        splits,
        createdAt: minutesAgo(age),
    });

    const hostel = [YOU, PRIYA, RAHUL];
    const goa = [YOU, PRIYA, RAHUL, SANA];

    const expenses = [
        expense("demo-exp-1", "demo-group-hostel", YOU, 1200, "Groceries", "equal",
            splitEqually(1200, hostel), 2880),
        expense("demo-exp-2", "demo-group-hostel", PRIYA, 900, "Wifi bill", "equal",
            splitEqually(900, hostel), 1440),
        expense("demo-exp-3", "demo-group-hostel", RAHUL, 640, "Pizza night", "exact",
            { [YOU]: 200, [PRIYA]: 200, [RAHUL]: 240 }, 180),

        expense("demo-exp-4", "demo-group-goa", PRIYA, 8400, "Hotel, 2 nights", "equal",
            splitEqually(8400, goa), 10_080),
        expense("demo-exp-5", "demo-group-goa", YOU, 2200, "Cab to the airport", "equal",
            splitEqually(2200, goa), 8640),
        expense("demo-exp-6", "demo-group-goa", SANA, 1500, "Scooter rental", "percentage",
            splitByPercentage(1500, { [YOU]: 30, [PRIYA]: 30, [RAHUL]: 20, [SANA]: 20 }), 7200),
    ];

    const settlements = [
        {
            id: "demo-settle-1",
            groupId: "demo-group-goa",
            from: YOU,
            to: PRIYA,
            amount: 500,
            createdBy: YOU,
            createdAt: minutesAgo(600),
        },
    ];

    return { users, groups, expenses, settlements };
};

let store = seed();

/** Restore the seed. Exposed for tests. */
export const resetDemoStore = () => {
    store = seed();
};

const newId = (prefix) =>
    `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/** Newest first, matching the orderBy("createdAt", "desc") on the real reads. */
const newestFirst = (rows) =>
    [...rows].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Documents are handed out as copies, the way Firestore does. Returning the
 * stored object directly would let a component mutate the store by accident and
 * produce behaviour that could never happen against the real backend.
 * Timestamps are restored afterwards, since they do not survive the clone.
 */
const detach = (row) => {
    const copy = clone({ ...row, createdAt: null, updatedAt: null });
    if (row.createdAt) copy.createdAt = row.createdAt;
    if (row.updatedAt) copy.updatedAt = row.updatedAt;
    return copy;
};

// ---------------------------------------------------------------- users

export const demoGetUserById = async (userId) => {
    const user = store.users.find((u) => u.uid === userId);
    return user ? detach(user) : null;
};

export const demoGetUsersByIds = async (userIds) =>
    store.users.filter((u) => userIds.includes(u.uid)).map(detach);

export const demoSaveUpiId = async (userId, upiId) => {
    const user = store.users.find((u) => u.uid === userId);
    if (user) user.upiId = upiId;
};

// --------------------------------------------------------------- groups

export const demoGetUserGroups = async (userId) =>
    store.groups.filter((g) => g.members.includes(userId)).map(detach);

export const demoGetGroup = async (groupId) => {
    const group = store.groups.find((g) => g.id === groupId);
    return group ? detach(group) : null;
};

export const demoCreateGroup = async (name, adminId) => {
    const id = newId("demo-group");
    store.groups.push({
        id,
        name,
        adminId,
        members: [adminId],
        joinOpen: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    return id;
};

const mutateGroup = (groupId, change) => {
    const group = store.groups.find((g) => g.id === groupId);
    if (!group) return;
    change(group);
    group.updatedAt = Timestamp.now();
};

export const demoAddMemberToGroup = async (groupId, userId) =>
    mutateGroup(groupId, (group) => {
        if (!group.members.includes(userId)) group.members.push(userId);
    });

export const demoRemoveMember = async (groupId, userId) =>
    mutateGroup(groupId, (group) => {
        group.members = group.members.filter((uid) => uid !== userId);
    });

export const demoSetGroupJoinOpen = async (groupId, joinOpen) =>
    mutateGroup(groupId, (group) => {
        group.joinOpen = joinOpen;
    });

export const demoUpdateGroupName = async (groupId, name) =>
    mutateGroup(groupId, (group) => {
        group.name = name;
    });

export const demoDeleteGroup = async (groupId) => {
    store.groups = store.groups.filter((g) => g.id !== groupId);
    store.expenses = store.expenses.filter((e) => e.groupId !== groupId);
    store.settlements = store.settlements.filter((s) => s.groupId !== groupId);
};

// ------------------------------------------------------------- expenses

export const demoGetGroupExpenses = async (groupId) =>
    newestFirst(store.expenses.filter((e) => e.groupId === groupId)).map(detach);

export const demoAddExpense = async (expense) => {
    const id = newId("demo-exp");
    store.expenses.push({ ...expense, id, createdAt: Timestamp.now() });
    return id;
};

export const demoGetExpense = async (expenseId) => {
    const expense = store.expenses.find((e) => e.id === expenseId);
    return expense ? detach(expense) : null;
};

export const demoDeleteExpense = async (expenseId) => {
    store.expenses = store.expenses.filter((e) => e.id !== expenseId);
};

// ---------------------------------------------------------- settlements

export const demoGetGroupSettlements = async (groupId) =>
    newestFirst(store.settlements.filter((s) => s.groupId === groupId)).map(detach);

export const demoAddSettlement = async (settlement) => {
    const id = newId("demo-settle");
    store.settlements.push({ ...settlement, id, createdAt: Timestamp.now() });
    return id;
};

export const demoGetSettlement = async (settlementId) => {
    const settlement = store.settlements.find((s) => s.id === settlementId);
    return settlement ? detach(settlement) : null;
};

export const demoDeleteSettlement = async (settlementId) => {
    store.settlements = store.settlements.filter((s) => s.id !== settlementId);
};
