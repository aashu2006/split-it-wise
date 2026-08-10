import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { isValidUpiId } from "./upi";
import { db } from "./firebase";
import { User } from "@/types";
import { User as FirebaseUser } from "firebase/auth";

/**
 * Save user to Firestore if they don't exist
 * @param user - Firebase Auth User
 */
export const saveUserIfNotExists = async (user: FirebaseUser) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || "",
            email: user.email || "",
            photoURL: user.photoURL || "",
            createdAt: serverTimestamp(),
        });
    }
};


/**
 * Get user by ID
 * @param userId - User ID
 * @returns User or null if not found
 */
export const getUserById = async (userId: string): Promise<User | null> => {
    const userRef = doc(db, "users", userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data() as User;
};

/**
 * Save the signed-in user's UPI ID so others can pay them from a settle-up link
 * @param userId - User ID (must be the signed-in user; rules enforce this)
 * @param upiId - UPI ID, or an empty string to remove it
 */
export const saveUpiId = async (userId: string, upiId: string): Promise<void> => {
    const trimmed = upiId.trim();
    if (trimmed && !isValidUpiId(trimmed)) {
        throw new Error("That doesn't look like a UPI ID. Example: name@okhdfcbank");
    }

    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { upiId: trimmed });
};

/**
 * Get multiple users by their IDs
 * @param userIds - Array of user IDs
 * @returns Array of users
 */
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
    if (userIds.length === 0) return [];

    const users: User[] = [];

    // Firestore 'in' queries are limited to 10 items, so we batch them
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "in", batch));
        const snapshot = await getDocs(q);

        snapshot.docs.forEach((doc) => {
            users.push(doc.data() as User);
        });
    }

    return users;
};
