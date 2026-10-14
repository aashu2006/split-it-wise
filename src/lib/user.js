import { doc, getDoc, setDoc, updateDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import {
    isDemoMode,
    demoGetUserById,
    demoGetUsersByIds,
} from "./demo";

/** Fields older profiles may carry that are no longer stored. */
const RETIRED_PROFILE_FIELDS = ["email", "upiId"];

/**
 * Create the signed-in user's profile, or tidy up an existing one
 *
 * Profiles are readable by every signed-in user (that's how group members see
 * each other's names), so they hold only a name and a photo. Older profiles
 * may still carry an email, which only its owner was ever shown and Firebase
 * Auth already has, or a UPI ID from the payment links the app no longer has.
 * Both are removed here the next time the owner signs in.
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
    } else {
        const stale = RETIRED_PROFILE_FIELDS.filter((field) => field in snap.data());
        if (stale.length > 0) {
            await updateDoc(
                userRef,
                Object.fromEntries(stale.map((field) => [field, deleteField()]))
            );
        }
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
