"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { saveUserIfNotExists } from "@/lib/user";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";


/**
 * @typedef {Object} AuthContextValue
 * @property {import("firebase/auth").User | null} user
 * @property {boolean} loading
 * @property {() => Promise<void>} signInWithGoogle
 * @property {() => Promise<void>} logout
 * @property {boolean} isFirebaseConfigured
 *   False when .env.local is missing. The UI still renders, signed out, so a
 *   contributor can work on components without a Firebase project.
 */

/** @type {import("react").Context<AuthContextValue | null>} */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // Without Firebase config there is no auth state to wait for, so don't
    // start in a loading state at all — otherwise the app would sit on the
    // spinner forever with nothing coming to clear it.
    const [loading, setLoading] = useState(isFirebaseConfigured);

    useEffect(() => {
        // lib/firebase has already explained what's missing; just stay signed
        // out so the UI still renders.
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                await saveUserIfNotExists(currentUser);
            }

            setLoading(false);
        });
        return () => unsubscribe();
    }, []);


    // Backing out of the Google popup is something users do on purpose —
    // closing it, or tapping the button twice and superseding the first one.
    // Firebase reports both as rejections, and since this runs straight off an
    // onClick there is nothing downstream to catch them, so they surface as
    // unhandled rejections in the console. Swallow those two; anything else is
    // a real failure and still gets reported.
    const BENIGN_POPUP_ERRORS = [
        "auth/popup-closed-by-user",
        "auth/cancelled-popup-request",
    ];

    const signInWithGoogle = async () => {
        if (!auth) {
            console.warn(
                "Sign-in is disabled because Firebase isn't configured. See README step 6."
            );
            return;
        }

        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            if (!BENIGN_POPUP_ERRORS.includes(error?.code)) {
                console.error("Google sign-in failed:", error);
            }
        }
    };

    const logout = async () => {
        if (!auth) return;
        await signOut(auth);
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, signInWithGoogle, logout, isFirebaseConfigured }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
