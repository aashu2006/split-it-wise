import { Timestamp } from "firebase/firestore";

export interface User {
    uid: string;
    name: string;
    email: string;
    photoURL?: string;
    upiId?: string; // e.g. "akshat@okhdfcbank", used to build UPI payment links
    createdAt: Timestamp;
}

export interface Group {
    id: string;
    name: string;
    adminId: string;
    members: string[]; // Array of user UIDs
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type SplitType = "equal" | "exact" | "percentage";

export interface Expense {
    id: string;
    groupId: string;
    amount: number; // In INR
    description: string;
    paidBy: string; // User UID
    createdBy: string; // User UID
    splitType: SplitType;
    splits: { [uid: string]: number }; // uid -> amount owed
    createdAt: Timestamp;
}

/**
 * A repayment between two members. Kept separate from Expense so that group
 * spending totals don't count money moving back and forth to clear debts.
 */
export interface Settlement {
    id: string;
    groupId: string;
    from: string; // User UID who paid
    to: string; // User UID who was paid
    amount: number; // In INR
    createdBy: string; // User UID who recorded it
    createdAt: Timestamp;
}

/** One payment needed to clear the group's debts. */
export interface Transfer {
    from: string; // User UID who should pay
    to: string; // User UID who should be paid
    amount: number; // In INR
}

export interface MemberBalance {
    uid: string;
    name: string;
    balance: number; // Positive = to receive, Negative = to pay
    isFormerMember?: boolean; // Left the group but still part of its expense history
}
