"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    danger = false,
}) {
    return (
        // Escape, a click on the backdrop and the close button all report the
        // same thing — the user backed out — so they all run onCancel. Never
        // onConfirm: dismissing a "delete this?" prompt must not delete.
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-md p-6" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {message}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-3 justify-end mt-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-foreground hover:bg-muted rounded-md"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white rounded-md ${danger
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-blue-600 hover:bg-blue-700"
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
