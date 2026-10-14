"use client";

import { createContext, useCallback, useContext, useState } from "react";

/** @typedef {"error" | "success"} ToastKind */

/**
 * @typedef {Object} Toast
 * @property {number} id
 * @property {string} message
 * @property {ToastKind} kind
 */

/**
 * @typedef {Object} ToastContextValue
 * @property {(message: string, kind?: ToastKind) => void} showToast
 *   Show a transient message. Use for outcomes with no obvious place on screen.
 */

/** @type {import("react").Context<ToastContextValue | null>} */
const ToastContext = createContext(null);

const DISMISS_AFTER_MS = 5000;

let nextToastId = 1;

/**
 * Transient messages, in place of alert().
 *
 * A native alert blocks the page and looks like a browser error rather than
 * part of the app, which on a phone reads as something having gone badly wrong.
 * This is for outcomes with nowhere else to live — a delete that failed, a
 * member who couldn't be removed. Anything tied to a form field belongs inline
 * next to that field instead, where the user is already looking.
 */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, kind = "error") => {
        // Date.now() would collide when two toasts land in the same millisecond,
        // and a repeated key makes React reuse the wrong node on dismissal.
        const id = nextToastId++;
        setToasts((current) => [...current, { id, message, kind }]);
        setTimeout(
            () => setToasts((current) => current.filter((toast) => toast.id !== id)),
            DISMISS_AFTER_MS
        );
    }, []);

    const dismiss = (id) =>
        setToasts((current) => current.filter((toast) => toast.id !== id));

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Low on the screen where thumbs are, but above the fixed action
                button at the bottom of the groups and group screens. */}
            <div
                className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-6"
                role="status"
                aria-live="polite"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-md border border-border bg-background py-1 pr-1 pl-4 shadow-lg"
                    >
                        <span
                            className={`flex-1 py-2 text-sm ${
                                toast.kind === "error" ? "text-negative" : "text-foreground"
                            }`}
                        >
                            {toast.message}
                        </span>
                        <button
                            type="button"
                            onClick={() => dismiss(toast.id)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center font-mono text-subtle transition-colors hover:text-foreground"
                            aria-label="Dismiss"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside ToastProvider");
    return ctx;
};
