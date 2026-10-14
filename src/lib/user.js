import { doc, getDoc, setDoc, updateDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { isValidUpiId } from "./upi";
import { db } from "./firebase";
import {
    isDemoMode,
    demoGetUserById,
    demoGetUsersByIds,
    demoSaveUpiId,
} from "./demo";

/**
 * Create the signed-in user's profile, or tidy up an existing one
 *
 * Profiles are readable by every signed-in user (that's how group members see
 * each other's names), so they hold nothing private. The email address in
 * particular stays out: the only person shown it is its owner, who has it from
 * Firebase Auth already. Profiles written before this still carry one, and
 * lose it here the next time their owner signs in.
 *
 * @param {import("firebase/auth").User} user - Firebase Auth User
 */
export const syncUserProfile = async (user) => {
    // The demo user is already in the seeded store.
    if (isDemoMode) return;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || "",
            photoURL: user.photoURL || "",
            createdAt: serverTimestamp(),
        });
    } else if ("email" in snap.data()) {
        await updateDoc(userRef, { email: deleteField() });
    }
};


/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<import("@/types").User | null>} User or null if not found
 */
export const getUserById = async (userId) => {
    if (isDemoMode) return demoGetUserById(userId);

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

    if (isDemoMode) return demoSaveUpiId(userId, trimmed);

    const userRef = doc(db, "users", userId);
    // Also drops a leftover email, should syncUserProfile not have got to it:
    // the rules refuse any profile write that still carries one.
    await updateDoc(userRef, { upiId: trimmed, email: deleteField() });
};

/**
 * Get multiple users by their IDs
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<import("@/types").User[]>} Array of users
 */
export const getUsersByIds = async (userIds) => {
    if (userIds.length === 0) return [];
    if (isDemoMode) return demoGetUsersByIds(userIds);

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
