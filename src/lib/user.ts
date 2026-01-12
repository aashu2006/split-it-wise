import { doc, getDoc, getDocs, collection, query, where, setDoc, serverTimestamp } from "firebase/firestore";
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
