import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// App Check attests that a request came from this app, rather than from a
// script replaying the config above — which is public, since anything prefixed
// NEXT_PUBLIC_ is compiled into the bundle. Without it, anyone can point the
// SDK at the project and burn its quota.
//
// Inert until NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set, so contributors don't need
// a key of their own to run the app locally. Setting the key is only half of
// it: enforcement has to be switched on for Firestore in the Firebase console
// before it actually turns anything away.
const appCheckSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
if (typeof window !== "undefined" && appCheckSiteKey) {
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
    });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
