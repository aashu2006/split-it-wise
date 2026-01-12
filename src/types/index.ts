import { Timestamp } from "firebase/firestore";

export interface User {
    uid: string;
    name: string;
    email: string;
    photoURL?: string;
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

export interface Expense {
    id: string;
    groupId: string;
    amount: number; // In INR
    description: string;
    paidBy: string; // User UID
    createdBy: string; // User UID
    createdAt: Timestamp;
}

export interface MemberBalance {
    uid: string;
    name: string;
    balance: number; // Positive = to receive, Negative = to pay
}
