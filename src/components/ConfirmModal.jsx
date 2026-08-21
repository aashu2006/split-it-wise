"use client";

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
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
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
            </div>
        </div>
    );
}
