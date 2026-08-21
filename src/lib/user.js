import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { isValidUpiId } from "./upi";
import { db } from "./firebase";

/**
 * Save user to Firestore if they don't exist
 * @param {import("firebase/auth").User} user - Firebase Auth User
 */
export const saveUserIfNotExists = async (user) => {
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
 * @param {string} userId - User ID
 * @returns {Promise<import("@/types").User | null>} User or null if not found
 */
export const getUserById = async (userId) => {
    const userRef = doc(db, "users", userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data();
};

/**
 * Save the signed-in user's UPI ID so others can pay them from a settle-up link
 * @param {string} userId - User ID (must be the signed-in user; rules enforce this)
 * @param {string} upiId - UPI ID, or an empty string to remove it
 * @returns {Promise<void>}
 */
export const saveUpiId = async (userId, upiId) => {
    const trimmed = upiId.trim();
    if (trimmed && !isValidUpiId(trimmed)) {
        throw new Error("That doesn't look like a UPI ID. Example: name@okhdfcbank");
    }

    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { upiId: trimmed });
};

/**
 * Get multiple users by their IDs
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<import("@/types").User[]>} Array of users
 */
export const getUsersByIds = async (userIds) => {
    if (userIds.length === 0) return [];

    // Fetched one document at a time rather than with a `where("uid", "in", ...)`
    // query: that query needs list permission on /users, and list is all or
    // nothing, so granting it would also allow reading the whole collection.
    // Groups are small, and the lookups run in parallel.
    const snapshots = await Promise.all(
        userIds.map((userId) => getDoc(doc(db, "users", userId)))
    );

    return snapshots
        .filter((snapshot) => snapshot.exists())
        .map((snapshot) => snapshot.data());
};
