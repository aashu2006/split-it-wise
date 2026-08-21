"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { saveUserIfNotExists } from "@/lib/user";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";


/**
 * @typedef {Object} AuthContextValue
 * @property {import("firebase/auth").User | null} user
 * @property {boolean} loading
 * @property {() => Promise<void>} signInWithGoogle
 * @property {() => Promise<void>} logout
 */

/** @type {import("react").Context<AuthContextValue | null>} */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
