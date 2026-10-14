"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { buttonClass } from "@/components/ui/kit";

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} [props.confirmText]
 * @param {string} [props.cancelText]
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 * @param {boolean} [props.danger]
 */
export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = "confirm",
    cancelText = "cancel",
    onConfirm,
    onCancel,
    danger = false,
}) {
    return (
        // Escape, a click on the backdrop and the close button all report the
        // same thing — the user backed out — so they all run onCancel. Never
        // onConfirm: dismissing a "delete this?" prompt must not delete.
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="text-[15px] leading-relaxed text-muted-foreground">
                        {message}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`${buttonClass(true)} ${danger ? "text-negative" : ""}`}
                    >
                        <span>{confirmText}</span>
                    </button>
                    <button type="button" onClick={onCancel} className={buttonClass()}>
                        <span>{cancelText}</span>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
