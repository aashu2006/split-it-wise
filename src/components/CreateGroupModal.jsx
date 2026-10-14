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
import { buttonClass, fieldClass, labelClass } from "@/components/ui/kit";

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 */
export default function CreateGroupModal({ isOpen, onClose }) {
    const { user } = useAuth();
    const [groupName, setGroupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        if (!groupName.trim()) {
            setError("give the group a name");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await createGroup(groupName.trim(), user.uid);
            // No refresh needed: the home page's listener picks the group up.
            setGroupName("");
            onClose();
        } catch (err) {
            setError("couldn't create the group. try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>new group</DialogTitle>
                    {/* Announced to screen readers only; the single labelled
                        field is self-explanatory on screen. Radix warns if a
                        dialog has no description at all. */}
                    <DialogDescription className="sr-only">
                        Name your group. You can invite people with a link afterwards.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="groupName" className={labelClass}>
                            name
                        </label>
                        <input
                            type="text"
                            id="groupName"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="hostel room 101"
                            maxLength={60}
                            className={fieldClass}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {error && <p className="text-sm text-negative">{error}</p>}

                    <button type="submit" className={buttonClass(true)} disabled={loading}>
                        <span>{loading ? "creating…" : "create group"}</span>
                        <span className="text-muted-foreground" aria-hidden="true">→</span>
                    </button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
