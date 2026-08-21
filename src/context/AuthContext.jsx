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


    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
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
