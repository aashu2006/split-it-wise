"use client";

import { useState } from "react";
import { createGroup } from "@/lib/groups";
import { useAuth } from "@/context/AuthContext";
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
 * @param {() => void} props.onClose
 * @param {() => void} props.onGroupCreated
 */
export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
    const { user } = useAuth();
    const [groupName, setGroupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        if (!groupName.trim()) {
            setError("Group name is required");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await createGroup(groupName.trim(), user.uid);
            setGroupName("");
            onGroupCreated();
            onClose();
        } catch (err) {
            setError("Failed to create group. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground">
                        Create New Group
                    </DialogTitle>
                    {/* Announced to screen readers only; the single labelled
                        field is self-explanatory on screen. Radix warns if a
                        dialog has no description at all. */}
                    <DialogDescription className="sr-only">
                        Name your group. You can invite people with a link afterwards.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="groupName" className="block text-sm font-medium text-foreground mb-2">
                            Group Name
                        </label>
                        <input
                            type="text"
                            id="groupName"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="e.g., Hostel Room 101"
                            className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="mb-4 text-red-600 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>
                    )}

                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-foreground hover:bg-muted rounded-md"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Group"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
