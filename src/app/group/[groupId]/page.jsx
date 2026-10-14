"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { subscribeToGroup, updateGroupName, deleteGroup, setGroupJoinOpen } from "@/lib/groups";
import { getUsersByIds } from "@/lib/user";
import { subscribeToGroupExpenses } from "@/lib/expenses";
import { subscribeToGroupSettlements } from "@/lib/settlements";
import { useToast } from "@/context/ToastContext";
import { calculateMemberBalances, calculateBalancesByUid, simplifyDebts } from "@/lib/calculations";
import MembersList from "@/components/MembersList";
import ConfirmModal from "@/components/ConfirmModal";
import ExpenseModal from "@/components/ExpenseModal";
import ExpenseList from "@/components/ExpenseList";
import BalanceSummary from "@/components/BalanceSummary";
import SettleUp from "@/components/SettleUp";
import SettleUpModal from "@/components/SettleUpModal";
import ThemeToggle from "@/components/ThemeToggle";

export default function GroupDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const groupId = params.groupId;

    // undefined until the first snapshot arrives; null means it doesn't exist.
    const [group, setGroup] = useState(undefined);
    // null until their listeners first report.
    const [expenses, setExpenses] = useState(null);
    const [settlements, setSettlements] = useState(null);
    const [ledgerProfiles, setLedgerProfiles] = useState(null);
    const [settlingTransfer, setSettlingTransfer] = useState(null);
    const [error, setError] = useState("");
    const { showToast } = useToast();

    // Rename group state
    const [isRenaming, setIsRenaming] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [renaming, setRenaming] = useState(false);
    const [renameError, setRenameError] = useState("");

    // Delete group state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Expense modal state: adding a new one, or the expense being edited
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    // Invite link state
    const [inviteCopied, setInviteCopied] = useState(false);
    const [togglingInvites, setTogglingInvites] = useState(false);
    // Set only when copying failed, so the link can be selected by hand.
    const [inviteFallback, setInviteFallback] = useState(null);

    const uid = user?.uid;

    useEffect(() => {
        if (!authLoading && !uid) router.push("/");
    }, [authLoading, uid, router]);

    // Everything below arrives through listeners rather than one-off reads, so
    // a change made on another phone shows up here without a reload, and a
    // change made here needs no bookkeeping: the listener reports our own
    // writes too, before the server has even confirmed them.
    useEffect(() => {
        if (!uid) return;
        return subscribeToGroup(groupId, setGroup, (err) => {
            console.error("Error loading group:", err);
            setError("Failed to load group");
        });
    }, [uid, groupId]);

    const isMember = Boolean(uid && group?.members.includes(uid));

    // Only opened once membership is confirmed. The rules refuse expense and
    // settlement reads to non-members, and removing someone mid-session flips
    // isMember, which closes these before Firestore cuts them off with an error.
    useEffect(() => {
        if (!isMember) return;
        const onListenError = (err) => {
            console.error("Error loading group:", err);
            setError("Failed to load group");
        };
        const unsubscribeExpenses = subscribeToGroupExpenses(groupId, setExpenses, onListenError);
        const unsubscribeSettlements = subscribeToGroupSettlements(
            groupId,
            setSettlements,
            onListenError
        );
        return () => {
            unsubscribeExpenses();
            unsubscribeSettlements();
        };
    }, [isMember, groupId]);

    // Everyone in the ledger, not just current members: anyone removed while
    // unsettled still has a balance. Joined into a string so the profile fetch
    // below reruns only when someone new appears, not on every expense.
    const participantKey = useMemo(() => {
        if (!group || !expenses || !settlements) return "";
        const participants = new Set(group.members);
        expenses.forEach((expense) => {
            participants.add(expense.paidBy);
            Object.keys(expense.splits ?? {}).forEach((uid) => participants.add(uid));
        });
        settlements.forEach((settlement) => {
            participants.add(settlement.from);
            participants.add(settlement.to);
        });
        return [...participants].sort().join(",");
    }, [group, expenses, settlements]);

    useEffect(() => {
        if (!participantKey) return;
        let cancelled = false;
        getUsersByIds(participantKey.split(","))
            .then((profiles) => {
                if (!cancelled) setLedgerProfiles(profiles);
            })
            .catch((err) => {
                console.error("Error loading members:", err);
                if (!cancelled) setError("Failed to load group");
            });
        return () => {
            cancelled = true;
        };
    }, [participantKey]);

    // Derived rather than stored, so a change only has to arrive in the list it
    // touched: balances, transfers and the member list follow on their own.
    const members = useMemo(() => {
        if (!group || !ledgerProfiles) return [];
        const current = new Set(group.members);
        return ledgerProfiles.filter((profile) => current.has(profile.uid));
    }, [group, ledgerProfiles]);

    const balances = useMemo(
        () =>
            group && expenses && settlements && ledgerProfiles
                ? calculateMemberBalances(expenses, ledgerProfiles, group.members, settlements)
                : [],
        [expenses, ledgerProfiles, group, settlements]
    );

    const transfers = useMemo(
        () =>
            group && expenses && settlements
                ? simplifyDebts(calculateBalancesByUid(expenses, group.members, settlements))
                : [],
        [expenses, group, settlements]
    );

    // Profiles are fetched rather than listened to, so a saved UPI ID is
    // patched in by hand.
    const handleProfileUpdated = (upiId) =>
        setLedgerProfiles((current) =>
            current?.map((profile) =>
                profile.uid === uid ? { ...profile, upiId } : profile
            )
        );

    const copyInviteLink = async () => {
        const inviteLink = `${window.location.origin}/join/${groupId}`;

        try {
            // navigator.clipboard only exists in secure contexts, so testing over
            // a plain-http LAN address falls through to the old execCommand path.
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(inviteLink);
            } else {
                const field = document.createElement("textarea");
                field.value = inviteLink;
                field.style.position = "fixed";
                field.style.opacity = "0";
                document.body.appendChild(field);
                field.select();
                const copied = document.execCommand("copy");
                document.body.removeChild(field);
                if (!copied) throw new Error("Copy command was rejected");
            }

            setInviteFallback(null);
            setInviteCopied(true);
            setTimeout(() => setInviteCopied(false), 2000);
        } catch {
            // Last resort: show the link in the page so it can be selected by
            // hand, rather than claiming success when nothing reached the
            // clipboard. A native prompt() here looked like a browser error.
            setInviteFallback(inviteLink);
        }
    };

    const handleRenameGroup = async () => {
        if (!user || !group) return;

        setRenameError("");
        if (!newGroupName.trim()) {
            setRenameError("Group name can't be empty");
            return;
        }

        setRenaming(true);
        try {
            await updateGroupName(groupId, newGroupName.trim(), user.uid);
            setIsRenaming(false);
        } catch (error) {
            setRenameError(error.message || "Failed to rename group");
        } finally {
            setRenaming(false);
        }
    };

    const handleToggleInvites = async () => {
        if (!user || !group) return;

        const next = !(group.joinOpen ?? true);
        setTogglingInvites(true);

        try {
            await setGroupJoinOpen(groupId, next, user.uid);
        } catch (error) {
            showToast(error.message || "Failed to update the invite link");
        } finally {
            setTogglingInvites(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!user) return;
        setDeleting(true);

        try {
            await deleteGroup(groupId, user.uid);
            router.push("/");
        } catch (error) {
            showToast(error.message || "Failed to delete group");
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const notMember = group && !isMember;
    const loading =
        authLoading ||
        !uid ||
        group === undefined ||
        (isMember && (!expenses || !settlements || !ledgerProfiles)) ||
        // Deleting removes the group out from under the listener before the
        // redirect lands; without this the page flashes "Group not found".
        (deleting && !group);

    if (loading && !error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (error || !group || notMember) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-600 dark:text-red-400 mb-4 text-lg font-medium">
                        {notMember
                            ? "You are not a member of this group"
                            : error || "Group not found"}
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    const isAdmin = user?.uid === group.adminId;
    const invitesOpen = group.joinOpen ?? true;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="bg-card border-b border-border">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => router.push("/")}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 text-sm"
                        >
                            <span>←</span> Back to Groups
                        </button>
                        <ThemeToggle />
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            {isRenaming ? (
                                <div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleRenameGroup();
                                                if (e.key === "Escape") {
                                                    setIsRenaming(false);
                                                    setNewGroupName(group.name);
                                                    setRenameError("");
                                                }
                                            }}
                                            className="text-2xl font-bold text-foreground border-b-2 border-blue-600 focus:outline-none disabled:opacity-50"
                                            disabled={renaming}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleRenameGroup}
                                            disabled={renaming}
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:text-muted-foreground"
                                        >
                                            {renaming ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsRenaming(false);
                                                setNewGroupName(group.name);
                                                setRenameError("");
                                            }}
                                            disabled={renaming}
                                            className="text-sm text-muted-foreground hover:text-foreground disabled:text-muted-foreground"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {renameError && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{renameError}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
                                    {isAdmin && (
                                        <button
                                            onClick={() => {
                                                setNewGroupName(group.name);
                                                setIsRenaming(true);
                                            }}
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                        >
                                            Rename
                                        </button>
                                    )}
                                </div>
                            )}
                            {isAdmin && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 rounded mt-2 inline-block">
                                    You are Admin
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                            <button
                                onClick={copyInviteLink}
                                disabled={!invitesOpen}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap disabled:bg-muted disabled:cursor-not-allowed"
                            >
                                {inviteCopied ? "✓ Copied!" : "📋 Copy Invite Link"}
                            </button>

                            {isAdmin ? (
                                <button
                                    onClick={handleToggleInvites}
                                    disabled={togglingInvites}
                                    className="text-xs text-muted-foreground hover:text-foreground disabled:text-muted-foreground"
                                >
                                    {invitesOpen ? "Turn link off" : "Turn link on"}
                                </button>
                            ) : (
                                !invitesOpen && (
                                    <span className="text-xs text-muted-foreground">Invite link is off</span>
                                )
                            )}
                        </div>
                    </div>

                    {inviteFallback && (
                        <div className="mt-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-md p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-xs text-amber-900 dark:text-amber-200">
                                    Couldn&apos;t reach the clipboard. Copy the link by hand:
                                </p>
                                <button
                                    onClick={() => setInviteFallback(null)}
                                    className="text-amber-900 dark:text-amber-200 text-lg leading-none opacity-60 hover:opacity-100"
                                    aria-label="Dismiss"
                                >
                                    ×
                                </button>
                            </div>
                            <input
                                type="text"
                                value={inviteFallback}
                                readOnly
                                onFocus={(e) => e.currentTarget.select()}
                                className="w-full px-2 py-1 text-xs bg-card border border-amber-300 dark:border-amber-800 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                                autoFocus
                            />
                        </div>
                    )}

                    {isAdmin && !invitesOpen && (
                        <p className="mt-3 text-xs text-muted-foreground bg-muted border border-border rounded-md p-2">
                            The invite link is off, so nobody new can join with it. Existing
                            members are unaffected.
                        </p>
                    )}

                    {isAdmin && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                            >
                                Delete Group
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Balance Summary Section */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Balance Summary</h2>
                    <BalanceSummary balances={balances} currentUserId={user?.uid || ""} />
                </div>

                {/* Settle Up Section */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Settle Up</h2>
                    <SettleUp
                        transfers={transfers}
                        settlements={settlements}
                        members={ledgerProfiles}
                        currentUserId={user?.uid || ""}
                        groupId={groupId}
                        isAdmin={isAdmin}
                        onSettle={setSettlingTransfer}
                    />
                </div>

                {/* Expenses Section */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">
                            Expenses ({expenses.length})
                        </h2>
                        <button
                            onClick={() => setShowAddExpenseModal(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                            + Add Expense
                        </button>
                    </div>
                    <ExpenseList
                        expenses={expenses}
                        members={members}
                        profiles={ledgerProfiles}
                        currentUserId={user?.uid || ""}
                        groupId={groupId}
                        isAdmin={isAdmin}
                        onEdit={setEditingExpense}
                    />
                </div>

                {/* Members Section */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Members ({members.length})
                    </h2>
                    <MembersList
                        members={members}
                        balances={balances}
                        adminId={group.adminId}
                        currentUserId={user?.uid || ""}
                        currentUserEmail={user?.email || ""}
                        groupId={groupId}
                        onProfileUpdated={handleProfileUpdated}
                    />
                </div>
            </main>

            {/* Add / Edit Expense Modal */}
            <ExpenseModal
                isOpen={showAddExpenseModal || editingExpense !== null}
                onClose={() => {
                    setShowAddExpenseModal(false);
                    setEditingExpense(null);
                }}
                groupId={groupId}
                members={members}
                currentUserId={user?.uid || ""}
                expense={editingExpense}
            />

            {/* Settle Up Modal */}
            <SettleUpModal
                transfer={settlingTransfer}
                members={ledgerProfiles}
                currentUserId={user?.uid || ""}
                groupId={groupId}
                groupName={group.name}
                onClose={() => setSettlingTransfer(null)}
            />

            {/* Delete Group Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Group"
                message="Are you sure you want to delete this group? This action cannot be undone and all expenses will be lost."
                confirmText={deleting ? "Deleting..." : "Delete Group"}
                onConfirm={handleDeleteGroup}
                onCancel={() => setShowDeleteModal(false)}
                danger={true}
            />
        </div>
    );
}
