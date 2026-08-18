import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * Everything talks to Firebase straight from the browser, so the allowances
 * below are what sign-in and Firestore actually need — narrow them and Google
 * sign-in breaks:
 *   - script-src apis.google.com / gstatic.com: the auth helper scripts
 *   - connect-src googleapis.com: identity toolkit, token refresh, Firestore
 *   - frame-src firebaseapp.com / accounts.google.com: the sign-in popup and
 *     the auth iframe it hands back to
 *   - img-src googleusercontent.com: member avatars from Google profiles
 *   - www.google.com: reCAPTCHA, once App Check has a site key
 *
 * 'unsafe-inline' in script-src is Next's hydration payload, which ships as
 * inline <script> tags; removing it needs a nonce and a custom document. The
 * policy is still worth having without it — it pins which origins may serve
 * script at all, and frame-ancestors 'none' blocks clickjacking of the
 * delete-group and settle-up buttons.
 */
const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://www.gstatic.com https://www.google.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.googleusercontent.com https://www.gstatic.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com",
    "frame-src https://*.firebaseapp.com https://accounts.google.com https://www.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
    { key: "Content-Security-Policy", value: csp },
    // frame-ancestors already covers this for current browsers; kept for old ones.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
    async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
    },
};

export default nextConfig;
