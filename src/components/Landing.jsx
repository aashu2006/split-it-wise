"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { AppHeader, GitHubLink, Wordmark, buttonClass } from "@/components/ui/kit";

/**
 * The signed-out landing page: one screen, one action.
 *
 * Kept as plain as the app behind it, on purpose. The two lines of payments
 * are the whole pitch: add what you spent, and this is who pays whom.
 */

/** Google's G, drawn in the text colour to match the monochrome button. */
const GoogleMark = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
    </svg>
);

const EXAMPLE_PAYMENTS = [
    { from: "priya", to: "rahul", amount: "₹300.00" },
    { from: "you", to: "priya", amount: "₹120.00" },
];

/**
 * @param {Object} props
 * @param {() => void} props.onSignIn
 * @param {boolean} [props.isFirebaseConfigured]
 */
export default function Landing({ onSignIn, isFirebaseConfigured = true }) {
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            {/* Only ever seen by someone running the app without a .env.local.
                Says what the sign-in button will actually do, since it signs
                into sample data rather than a Google account. */}
            {!isFirebaseConfigured && (
                <p className="border-b border-hairline px-6 py-3 text-center font-mono text-xs text-muted-foreground">
                    demo mode: signing in opens a sample account. nothing is saved. see
                    CONTRIBUTING.md to connect firebase.
                </p>
            )}

            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6">
                <AppHeader
                    left={<Wordmark />}
                    right={
                        <>
                            <ThemeToggle />
                            <GitHubLink />
                        </>
                    }
                />

                <main className="flex flex-1 flex-col justify-center gap-7 pb-16">
                    <div className="flex flex-col gap-3">
                        <h1 className="text-2xl font-medium tracking-tight text-foreground">
                            split bills, not friendships.
                        </h1>
                        <p className="text-[15px] leading-relaxed text-muted-foreground">
                            add what you spent, see who pays whom, settle up. that&apos;s it.
                        </p>
                    </div>

                    <ul
                        className="flex flex-col gap-2 font-mono text-[13px] text-muted-foreground"
                        aria-label="example payments"
                    >
                        {EXAMPLE_PAYMENTS.map((payment) => (
                            <li key={payment.from} className="flex justify-between">
                                <span>
                                    {payment.from} <span aria-label="pays">→</span> {payment.to}
                                </span>
                                <span className="text-foreground">{payment.amount}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        type="button"
                        onClick={onSignIn}
                        className={buttonClass()}
                    >
                        <span className="flex items-center gap-2.5">
                            <GoogleMark />
                            continue with google
                        </span>
                        <span className="text-muted-foreground" aria-hidden="true">
                            →
                        </span>
                    </button>
                </main>

                <p className="flex h-16 items-center font-mono text-xs text-subtle">
                    free · open source · no ads
                </p>
            </div>
        </div>
    );
}
