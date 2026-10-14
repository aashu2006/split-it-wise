"use client";

import { useState } from "react";
import { updateGroupName, setGroupJoinOpen } from "@/lib/groups";
import { useToast } from "@/context/ToastContext";
import MembersList from "./MembersList";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { buttonClass, fieldClass, labelClass, smallButtonClass } from "@/components/ui/kit";

/**
 * Everything about a group that isn't money: its name, the invite link, who's
 * in it, and deleting it. Kept off the group screen so that screen stays about
 * balances, and so the destructive controls take a deliberate tap to reach.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {import("@/types").Group} props.group
 * @param {string} props.inviteLink
 * @param {() => void} props.onCopyInvite
 * @param {import("@/types").User[]} props.members
 * @param {import("@/types").MemberBalance[]} props.balances
 * @param {string} props.currentUserId
 * @param {string} [props.currentUserEmail]
 * @param {() => void} props.onDeleteGroup - Asks for confirmation; the page owns it
 */
export default function GroupSettingsModal({
    isOpen,
    onClose,
    group,
    inviteLink,
    onCopyInvite,
    members,
    balances,
    currentUserId,
    currentUserEmail,
    onDeleteGroup,
}) {
    const isAdmin = currentUserId === group.adminId;
    const invitesOpen = group.joinOpen ?? true;
    const { showToast } = useToast();

    const [name, setName] = useState(group.name);
    const [renaming, setRenaming] = useState(false);
    const [renameError, setRenameError] = useState("");
    const [togglingInvites, setTogglingInvites] = useState(false);

    // Picks up a rename made on another phone, unless you're mid-edit.
    const [nameFrom, setNameFrom] = useState(group.name);
    if (nameFrom !== group.name) {
        setNameFrom(group.name);
        if (name === nameFrom) setName(group.name);
    }

    const handleRename = async (event) => {
        event.preventDefault();
        setRenameError("");
        if (!name.trim()) {
            setRenameError("the group needs a name");
            return;
        }
        if (name.trim() === group.name) return;

        setRenaming(true);
        try {
            await updateGroupName(group.id, name.trim(), currentUserId);
            showToast("renamed", "success");
        } catch (error) {
            setRenameError(error.message || "couldn't rename the group");
        } finally {
            setRenaming(false);
        }
    };

    const handleToggleInvites = async () => {
        setTogglingInvites(true);
        try {
            await setGroupJoinOpen(group.id, !invitesOpen, currentUserId);
        } catch (error) {
            showToast(error.message || "couldn't change the invite link");
        } finally {
            setTogglingInvites(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {/* No autofocus: it would land on the name field and pop the
                keyboard up over a sheet you mostly opened to read. */}
            <DialogContent
                className="max-h-[90dvh] overflow-y-auto"
                onOpenAutoFocus={(event) => event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>group settings</DialogTitle>
                    <DialogDescription className="sr-only">
                        The group&apos;s name, invite link, people, and deleting it.
                    </DialogDescription>
                </DialogHeader>

                <section className="flex flex-col gap-2">
                    <label htmlFor="group-name" className={labelClass}>
                        name
                    </label>
                    {isAdmin ? (
                        <form onSubmit={handleRename} className="flex gap-2">
                            <input
                                id="group-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={60}
                                className={fieldClass}
                                disabled={renaming}
                            />
                            <button
                                type="submit"
                                disabled={renaming || name.trim() === group.name}
                                className={`${smallButtonClass} h-12`}
                            >
                                {renaming ? "saving…" : "save"}
                            </button>
                        </form>
                    ) : (
                        <p id="group-name" className="text-[15px] text-foreground">
                            {group.name}
                        </p>
                    )}
                    {renameError && <p className="text-sm text-negative">{renameError}</p>}
                </section>

                <section className="flex flex-col gap-2">
                    <label htmlFor="invite-link" className={labelClass}>
                        invite link
                    </label>
                    {invitesOpen ? (
                        <div className="flex gap-2">
                            <input
                                id="invite-link"
                                type="text"
                                value={inviteLink}
                                readOnly
                                onFocus={(e) => e.currentTarget.select()}
                                className={`${fieldClass} font-mono text-[13px] text-muted-foreground`}
                            />
                            <button type="button" onClick={onCopyInvite} className={`${smallButtonClass} h-12`}>
                                copy
                            </button>
                        </div>
                    ) : (
                        <p id="invite-link" className="text-[15px] text-muted-foreground">
                            the invite link is off, so nobody new can join with it.
                        </p>
                    )}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={handleToggleInvites}
                            disabled={togglingInvites}
                            className="h-11 self-start font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                        >
                            {invitesOpen ? "turn link off" : "turn link on"}
                        </button>
                    )}
                </section>

                <section className="flex flex-col gap-1">
                    <p className={labelClass}>people</p>
                    <MembersList
                        members={members}
                        balances={balances}
                        adminId={group.adminId}
                        currentUserId={currentUserId}
                        currentUserEmail={currentUserEmail}
                        groupId={group.id}
                    />
                </section>

                {isAdmin && (
                    <button
                        type="button"
                        onClick={onDeleteGroup}
                        className={`${buttonClass()} text-negative`}
                    >
                        <span>delete group</span>
                    </button>
                )}
            </DialogContent>
        </Dialog>
    );
}
