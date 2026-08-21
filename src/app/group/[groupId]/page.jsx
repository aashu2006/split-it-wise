"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getGroup, updateGroupName, deleteGroup, setGroupJoinOpen } from "@/lib/groups";
import { getUsersByIds } from "@/lib/user";
import { getGroupExpenses } from "@/lib/expenses";
import { getGroupSettlements } from "@/lib/settlements";
import { useToast } from "@/context/ToastContext";
import { calculateMemberBalances, calculateBalancesByUid, simplifyDebts } from "@/lib/calculations";
import MembersList from "@/components/MembersList";
import ConfirmModal from "@/components/ConfirmModal";
import AddExpenseModal from "@/components/AddExpenseModal";
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

    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [settlingTransfer, setSettlingTransfer] = useState(null);
    const [ledgerProfiles, setLedgerProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
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

    // Add expense modal state
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

    // Invite link state
    const [inviteCopied, setInviteCopied] = useState(false);
    const [togglingInvites, setTogglingInvites] = useState(false);
    // Set only when copying failed, so the link can be selected by hand.
    const [inviteFallback, setInviteFallback] = useState(null);

    const loadGroupData = async () => {
        if (authLoading) return;

        if (!user) {
            router.push("/");
            return;
        }

        try {
            const groupData = await getGroup(groupId);
            if (!groupData) {
                setError("Group not found");
                setLoading(false);
                return;
            }

            // Check if user is a member
            if (!groupData.members.includes(user.uid)) {
                setError("You are not a member of this group");
                setLoading(false);
                return;
            }

            setGroup(groupData);
            setNewGroupName(groupData.name);

            // Load expenses and the repayments made against them
            const [groupExpenses, groupSettlements] = await Promise.all([
                getGroupExpenses(groupId),
                getGroupSettlements(groupId),
            ]);
            setExpenses(groupExpenses);
            setSettlements(groupSettlements);

            // Load profiles for everyone in the ledger, not just current
            // members — anyone removed while unsettled still has a balance.
            const participants = new Set(groupData.members);
            groupExpenses.forEach((expense) => {
                participants.add(expense.paidBy);
                Object.keys(expense.splits ?? {}).forEach((uid) => participants.add(uid));
            });
            groupSettlements.forEach((settlement) => {
                participants.add(settlement.from);
                participants.add(settlement.to);
            });
            setLedgerProfiles(await getUsersByIds([...participants]));

            setLoading(false);
        } catch (err) {
            console.error("Error loading group:", err);
            setError("Failed to load group");
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGroupData();
    }, [user, authLoading, groupId, router]);

    // Derived rather than stored, so a mutation only has to update the list it
    // touched: balances, transfers and the member list follow on their own.
    // Storing them meant every delete had to refetch the whole group to stay
    // consistent, which is why the ledger used to lag a second behind the tap.
    const members = useMemo(() => {
        if (!group) return [];
        const current = new Set(group.members);
        return ledgerProfiles.filter((profile) => current.has(profile.uid));
    }, [group, ledgerProfiles]);

    const balances = useMemo(
        () =>
            group
                ? calculateMemberBalances(expenses, ledgerProfiles, group.members, settlements)
                : [],
        [expenses, ledgerProfiles, group, settlements]
    );

    const transfers = useMemo(
        () =>
            group
                ? simplifyDebts(calculateBalancesByUid(expenses, group.members, settlements))
                : [],
        [expenses, group, settlements]
    );

    // Applied locally instead of refetching. The write has already been
    // acknowledged by Firestore at this point, so the local list and the server
    // agree; a reload would only cost a round trip to learn the same thing.
    const handleExpenseAdded = (expense) =>
        setExpenses((current) => [expense, ...current]);

    const handleExpenseDeleted = (expenseId) =>
        setExpenses((current) => current.filter((expense) => expense.id !== expenseId));

    const handleSettled = (settlement) =>
        setSettlements((current) => [settlement, ...current]);

    const handleSettlementDeleted = (settlementId) =>
        setSettlements((current) =>
            current.filter((settlement) => settlement.id !== settlementId)
        );

    const handleMemberRemoved = (userId) =>
        setGroup((current) =>
            current
                ? { ...current, members: current.members.filter((uid) => uid !== userId) }
                : current
        );

    const handleProfileUpdated = (upiId) =>
        setLedgerProfiles((current) =>
            current.map((profile) =>
                profile.uid === user?.uid ? { ...profile, upiId } : profile
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
            setGroup({ ...group, name: newGroupName.trim() });
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
            setGroup({ ...group, joinOpen: next });
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

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-600 dark:text-red-400 mb-4 text-lg font-medium">
                        {error || "Group not found"}
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
                                            onClick={() => setIsRenaming(true)}
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
                        onSettlementDeleted={handleSettlementDeleted}
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
                        currentUserId={user?.uid || ""}
                        groupId={groupId}
                        isAdmin={isAdmin}
                        onExpenseDeleted={handleExpenseDeleted}
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
                        groupId={groupId}
                        onMemberRemoved={handleMemberRemoved}
                        onProfileUpdated={handleProfileUpdated}
                    />
                </div>
            </main>

            {/* Add Expense Modal */}
            <AddExpenseModal
                isOpen={showAddExpenseModal}
                onClose={() => setShowAddExpenseModal(false)}
                groupId={groupId}
                members={members}
                currentUserId={user?.uid || ""}
                onExpenseAdded={handleExpenseAdded}
            />

            {/* Settle Up Modal */}
            <SettleUpModal
                transfer={settlingTransfer}
                members={ledgerProfiles}
                currentUserId={user?.uid || ""}
                groupId={groupId}
                groupName={group.name}
                onClose={() => setSettlingTransfer(null)}
                onSettled={handleSettled}
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
