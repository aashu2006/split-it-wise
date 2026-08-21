"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { splitEqually } from "@/lib/calculations";

/**
 * The signed-out landing page.
 *
 * Built around the two things this app actually does differently: it speaks
 * the Hinglish the balances are written in, and it does the money maths in
 * integer paise so the shares always add back to the total. The ₹100 split
 * below is not a mockup — it calls the real splitEqually(), so if that ever
 * stopped adding up, this page would say so.
 */

const GoogleMark = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

const SignInButton = ({ onSignIn, className = "" }) => (
    <button
        onClick={onSignIn}
        className={`group inline-flex items-center gap-3 rounded-full bg-foreground px-7 py-3.5 font-medium text-background shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${className}`}
    >
        <span className="grid place-items-center rounded-full bg-background p-1">
            <GoogleMark />
        </span>
        Continue with Google
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
    </button>
);

/** The real split, so the numbers on screen come from the shipping code. */
const DEMO_SPLIT = splitEqually(100, ["a", "b", "c"]);
const DEMO_SHARES = [
    { name: "Akshat", amount: DEMO_SPLIT.a },
    { name: "Rahul", amount: DEMO_SPLIT.b },
    { name: "Priya", amount: DEMO_SPLIT.c },
];
const DEMO_TOTAL = DEMO_SHARES.reduce((sum, s) => sum + s.amount, 0);

const SPLIT_METHODS = [
    {
        key: "equal",
        label: "Equal",
        blurb: "Tick who was there. We divide it.",
        rows: ["₹33.34", "₹33.33", "₹33.33"],
    },
    {
        key: "exact",
        label: "Exact",
        blurb: "Someone had the biryani. Type real amounts.",
        rows: ["₹420.00", "₹180.00", "₹90.00"],
    },
    {
        key: "percent",
        label: "Percent",
        blurb: "Rent by room size. Split by share.",
        rows: ["50%", "30%", "20%"],
    },
];

/**
 * @param {Object} props
 * @param {() => void} props.onSignIn
 * @param {boolean} [props.isFirebaseConfigured]
 */
export default function Landing({ onSignIn, isFirebaseConfigured = true }) {
    return (
        <div className="min-h-screen bg-background">
            {/* Only ever seen by someone running the app without a .env.local.
                Sign-in silently does nothing in that state, which reads as a
                broken button unless the page says why. */}
            {!isFirebaseConfigured && (
                <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    <span className="font-medium">Preview mode.</span> Firebase isn&apos;t
                    configured, so sign-in is disabled — the UI is fully browsable. See{" "}
                    <span className="font-mono text-xs">README</span> step 6 to connect a
                    project.
                </div>
            )}
            {/* ---------- Hero ---------- */}
            <section className="relative overflow-hidden">
                <div className="ledger-grid absolute inset-0" aria-hidden="true" />

                <div className="relative mx-auto max-w-5xl px-5">
                    <header className="flex items-center justify-between py-6">
                        <span className="font-mono text-sm font-medium tracking-tight">
                            split-it-wise
                        </span>
                        <ThemeToggle />
                    </header>

                    <div className="py-16 sm:py-24">
                        <p className="animate-in fade-in slide-in-from-bottom-2 duration-700 mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs text-muted-foreground backdrop-blur">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                            for hostel rooms, road trips and chai runs
                        </p>

                        {/* The app's own words for a balance, used as the headline. */}
                        <h1 className="animate-in fade-in slide-in-from-bottom-3 duration-700 text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
                            <span className="text-green-600 dark:text-green-400">Lena hai</span>
                            <span className="text-muted-foreground"> ya </span>
                            <span className="text-red-600 dark:text-red-400">dena hai</span>
                            <span className="text-muted-foreground">?</span>
                        </h1>

                        <p className="animate-in fade-in slide-in-from-bottom-4 duration-700 mt-6 max-w-xl text-lg text-muted-foreground">
                            Split bills with friends, settle up over UPI, and stop doing
                            mental maths at the end of every trip.
                        </p>

                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-1000 mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                            <SignInButton onSignIn={onSignIn} />
                            <span className="font-mono text-xs text-muted-foreground">
                                free · no ads · open source
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------- The maths ---------- */}
            <section className="border-t border-border bg-card/40">
                <div className="mx-auto max-w-5xl px-5 py-20">
                    <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
                        <div>
                            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                                the boring part, done right
                            </p>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                                ₹100 between 3 people is not ₹33.33
                            </h2>
                            <p className="mt-5 text-muted-foreground">
                                Round each share on its own and you quietly lose a paisa
                                every time. Over a semester of chai, rent and Swiggy, those
                                paise pile up and the balances stop adding to zero.
                            </p>
                            <p className="mt-4 text-muted-foreground">
                                Everything here is counted in whole paise and the remainder
                                gets handed out, so the shares always add back to exactly
                                what was paid.
                            </p>
                        </div>

                        {/* Rendered from the real splitEqually(), not hardcoded. */}
                        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
                            <div className="flex items-baseline justify-between border-b border-border pb-4">
                                <span className="text-sm text-muted-foreground">Dinner</span>
                                <span className="tabular font-mono text-3xl font-semibold">
                                    ₹100.00
                                </span>
                            </div>

                            <div className="my-5 space-y-2.5">
                                {DEMO_SHARES.map((share) => (
                                    <div
                                        key={share.name}
                                        className="flex items-center justify-between rounded-lg bg-muted px-4 py-2.5"
                                    >
                                        <span className="text-sm">{share.name}</span>
                                        <span className="tabular font-mono text-sm font-medium">
                                            ₹{share.amount.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between border-t border-dashed border-border pt-4">
                                <span className="font-mono text-xs text-muted-foreground">
                                    adds back to
                                </span>
                                <span className="tabular font-mono text-sm font-semibold text-green-600 dark:text-green-400">
                                    ₹{DEMO_TOTAL.toFixed(2)} ✓
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------- Three ways to split ---------- */}
            <section className="border-t border-border">
                <div className="mx-auto max-w-5xl px-5 py-20">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Three ways to split it
                    </h2>
                    <p className="mt-4 max-w-lg text-muted-foreground">
                        Because &ldquo;everyone pays the same&rdquo; stops being true the
                        moment one person orders dessert.
                    </p>

                    <div className="mt-10 grid gap-5 sm:grid-cols-3">
                        {SPLIT_METHODS.map((method) => (
                            <div
                                key={method.key}
                                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-semibold">
                                        {method.label}
                                    </span>
                                </div>
                                <p className="mt-2 min-h-[3rem] text-sm text-muted-foreground">
                                    {method.blurb}
                                </p>
                                <div className="mt-4 space-y-1.5 border-t border-border pt-4">
                                    {method.rows.map((row, i) => (
                                        // Keyed by position, not value: an equal
                                        // split legitimately repeats the same
                                        // amount, so the value isn't unique.
                                        <div
                                            key={`${method.key}-${i}`}
                                            className="flex items-center justify-between"
                                        >
                                            <span className="h-1.5 w-full max-w-[3.5rem] rounded-full bg-muted" />
                                            <span
                                                className="tabular font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground"
                                                style={{ transitionDelay: `${i * 60}ms` }}
                                            >
                                                {row}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------- Settle up ---------- */}
            <section className="border-t border-border bg-card/40">
                <div className="mx-auto max-w-5xl px-5 py-20">
                    <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                        <div className="order-2 lg:order-1 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
                            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                                who pays whom
                            </p>

                            <div className="mt-5 space-y-2">
                                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
                                    <span className="text-sm font-medium">Rahul</span>
                                    <span className="tabular font-mono text-sm text-green-700 dark:text-green-300">
                                        ₹300.00 lena hai
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
                                    <span className="text-sm font-medium">Priya</span>
                                    <span className="tabular font-mono text-sm text-red-700 dark:text-red-300">
                                        ₹300.00 dena hai
                                    </span>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-muted p-3">
                                <span className="text-sm">
                                    Priya pays Rahul{" "}
                                    <span className="tabular font-mono font-semibold">
                                        ₹300.00
                                    </span>
                                </span>
                                <span className="whitespace-nowrap rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white">
                                    Pay via UPI
                                </span>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2">
                            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                                settling up
                            </p>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                                One tap to GPay
                            </h2>
                            <p className="mt-5 text-muted-foreground">
                                Balances alone just tell you who&apos;s up and who&apos;s
                                down. This works out the actual payments — and a group of
                                five never needs more than four of them.
                            </p>
                            <p className="mt-4 text-muted-foreground">
                                Add your UPI ID once and everyone gets a link that opens
                                GPay, PhonePe or Paytm with the amount already filled in.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------- Close ---------- */}
            <section className="relative overflow-hidden border-t border-border">
                <div className="mx-auto max-w-5xl px-5 py-24 text-center">
                    <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                        Settle up before
                        <br className="hidden sm:block" /> it gets awkward
                    </h2>
                    <p className="mx-auto mt-5 max-w-md text-muted-foreground">
                        Make a group, drop the link in the WhatsApp chat, and let everyone
                        add what they spent.
                    </p>
                    <div className="mt-9 flex justify-center">
                        <SignInButton onSignIn={onSignIn} />
                    </div>
                </div>
            </section>

            <footer className="border-t border-border">
                <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 font-mono text-xs text-muted-foreground sm:flex-row">
                    <span>split-it-wise · MIT</span>
                    <span>
                        Made by <span className="font-medium text-foreground">Akshat Patil</span>
                    </span>
                </div>
            </footer>
        </div>
    );
}
