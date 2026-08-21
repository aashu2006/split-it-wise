import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Every value here comes from .env.local, which is gitignored — so a fresh
 * clone has none of them. The env var name is kept alongside each one so a
 * missing config can say exactly which line to add rather than failing as
 * "auth/invalid-api-key" from inside the SDK.
 */
const CONFIG_SOURCES = [
    ["apiKey", "NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY],
    ["authDomain", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN],
    ["projectId", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
    ["storageBucket", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET],
    ["messagingSenderId", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID],
    ["appId", "NEXT_PUBLIC_FIREBASE_APP_ID", process.env.NEXT_PUBLIC_FIREBASE_APP_ID],
];

const missingEnvVars = CONFIG_SOURCES.filter(([, , value]) => !value).map(
    ([, envVar]) => envVar
);

/**
 * Whether there is enough config to talk to Firebase at all.
 *
 * Without it the app runs in a signed-out preview: pages render and the UI is
 * workable, but nothing reaches the network. This exists so that someone who
 * only wants to change a component doesn't have to create a Firebase project
 * first — and so the failure is a readable message rather than the whole app
 * returning a 500 from `getAuth()` at module scope, which is what it used to do.
 */
export const isFirebaseConfigured = missingEnvVars.length === 0;

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
    const firebaseConfig = Object.fromEntries(
        CONFIG_SOURCES.map(([key, , value]) => [key, value])
    );

    app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    // App Check attests that a request came from this app, rather than from a
    // script replaying the config above — which is public, since anything
    // prefixed NEXT_PUBLIC_ is compiled into the bundle. Without it, anyone can
    // point the SDK at the project and burn its quota.
    //
    // Inert until NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set, so contributors don't
    // need a key of their own to run the app locally. Setting the key is only
    // half of it: enforcement has to be switched on for Firestore in the
    // Firebase console before it actually turns anything away.
    const appCheckSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (typeof window !== "undefined" && appCheckSiteKey) {
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(appCheckSiteKey),
            isTokenAutoRefreshEnabled: true,
        });
    }

    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.warn(
        [
            "",
            "  Firebase is not configured — running in signed-out preview mode.",
            "  Pages render and the UI works, but sign-in and saving are disabled.",
            "",
            "  Missing from .env.local:",
            ...missingEnvVars.map((name) => `    ${name}`),
            "",
            "  Copy .env.example to .env.local and fill it in. See README step 6.",
            "",
        ].join("\n")
    );
}

export { auth, db };
