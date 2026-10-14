"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Settings, UserPlus } from "lucide-react";
import { subscribeToGroup, deleteGroup } from "@/lib/groups";
import { getUsersByIds } from "@/lib/user";
import { subscribeToGroupExpenses } from "@/lib/expenses";
import { subscribeToGroupSettlements } from "@/lib/settlements";
import { useToast } from "@/context/ToastContext";
import {
    calculateMemberBalances,
    calculateBalancesByUid,
    describeYourBalance,
    simplifyDebts,
} from "@/lib/calculations";
import ConfirmModal from "@/components/ConfirmModal";
import ExpenseModal from "@/components/ExpenseModal";
import ExpenseList from "@/components/ExpenseList";
import BalanceSummary from "@/components/BalanceSummary";
import SettleUp from "@/components/SettleUp";
import SettleUpModal from "@/components/SettleUpModal";
import GroupSettingsModal from "@/components/GroupSettingsModal";
import {
    AppHeader,
    IconButton,
    buttonClass,
    formatRupees,
    labelClass,
    textButtonClass,
} from "@/components/ui/kit";

/** A full-screen message for loading and errors, in the same column. */
function Notice({ children }) {
    return (
        <div className="min-h-dvh bg-background">
            <div className="mx-auto w-full max-w-xl px-6">{children}</div>
        </div>
    );
}

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

    const [showSettings, setShowSettings] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Expense modal state: adding a new one, or the expense being edited
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

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
            setError("couldn't load this group");
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
            setError("couldn't load this group");
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
                if (!cancelled) setError("couldn't load this group");
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

    const inviteLink =
        typeof window === "undefined" ? "" : `${window.location.origin}/join/${groupId}`;

    const copyInviteLink = async () => {
        if (!(group?.joinOpen ?? true)) {
            showToast(
                user?.uid === group?.adminId
                    ? "the invite link is off. turn it on in group settings."
                    : "the invite link is off. ask the admin to turn it on."
            );
            return;
        }

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
            showToast("invite link copied. send it to your friends.", "success");
        } catch {
            // Nothing reached the clipboard, so open settings, which shows the
            // link in a field that can be selected and copied by hand.
            setShowSettings(true);
        }
    };

    const handleDeleteGroup = async () => {
        if (!user) return;
        setDeleting(true);

        try {
            await deleteGroup(groupId, user.uid);
            router.push("/");
        } catch (error) {
            showToast(error.message || "couldn't delete the group");
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
        // redirect lands; without this the page flashes "group not found".
        (deleting && !group);

    if (loading && !error) {
        return (
            <Notice>
                <p className="pt-24 font-mono text-[13px] text-subtle">loading…</p>
            </Notice>
        );
    }

    if (error || !group || notMember) {
        return (
            <Notice>
                <div className="flex flex-col gap-5 pt-24">
                    <p className="text-[15px] text-foreground">
                        {notMember ? "you're not in this group." : error || "this group doesn't exist."}
                    </p>
                    <Link href="/" className={buttonClass()}>
                        <span>back to your groups</span>
                        <span className="text-muted-foreground" aria-hidden="true">
                            →
                        </span>
                    </Link>
                </div>
            </Notice>
        );
    }

    const isAdmin = user?.uid === group.adminId;
    const yourBalance = balances.find((b) => b.uid === uid)?.balance ?? 0;
    const nameList = members.map((m) => (m.uid === uid ? "you" : m.name)).join(", ");

    return (
        <div className="min-h-dvh bg-background">
            <div className="mx-auto w-full max-w-xl px-6 pb-32">
                <AppHeader
                    left={
                        <Link
                            href="/"
                            className={`${textButtonClass()} -ml-1`}
                        >
                            ← groups
                        </Link>
                    }
                    right={
                        <>
                            <IconButton label="copy invite link" onClick={copyInviteLink}>
                                <UserPlus size={19} strokeWidth={1.6} />
                            </IconButton>
                            <IconButton label="group settings" onClick={() => setShowSettings(true)}>
                                <Settings size={19} strokeWidth={1.6} />
                            </IconButton>
                        </>
                    }
                />

                <section className="border-b border-hairline pt-5 pb-7">
                    <h1 className="text-[22px] font-medium tracking-tight text-foreground">{group.name}</h1>
                    <p className="mt-1.5 text-[13px] text-subtle">{nameList}</p>

                    <p className={`${labelClass} mt-7`}>{describeYourBalance(yourBalance)}</p>
                    <p
                        className={`mt-1.5 font-mono text-[34px] font-medium tracking-tight ${
                            yourBalance > 0
                                ? "text-positive"
                                : yourBalance < 0
                                  ? "text-negative"
                                  : "text-foreground"
                        }`}
                    >
                        {formatRupees(yourBalance)}
                    </p>
                </section>

                <section className="pt-6" aria-labelledby="settle-up-heading">
                    <h2 id="settle-up-heading" className={`${labelClass} mb-3`}>
                        settle up
                    </h2>
                    <SettleUp
                        transfers={transfers}
                        settlements={settlements}
                        members={ledgerProfiles}
                        currentUserId={uid}
                        groupId={groupId}
                        isAdmin={isAdmin}
                        onSettle={setSettlingTransfer}
                    />
                </section>

                <section className="pt-8" aria-labelledby="balances-heading">
                    <h2 id="balances-heading" className={`${labelClass} mb-2`}>
                        balances
                    </h2>
                    <BalanceSummary balances={balances} currentUserId={uid} />
                </section>

                <section className="pt-8" aria-labelledby="expenses-heading">
                    <h2 id="expenses-heading" className={`${labelClass} mb-3`}>
                        expenses ({expenses.length})
                    </h2>
                    <ExpenseList
                        expenses={expenses}
                        members={members}
                        profiles={ledgerProfiles}
                        currentUserId={uid}
                        groupId={groupId}
                        isAdmin={isAdmin}
                        onEdit={setEditingExpense}
                    />
                </section>
            </div>

            <div className="fixed inset-x-0 bottom-0 bg-background pt-3 pb-7">
                <div className="mx-auto w-full max-w-xl px-6">
                    <button
                        type="button"
                        onClick={() => setShowAddExpenseModal(true)}
                        className={buttonClass(true)}
                    >
                        <span>add expense</span>
                        <span className="text-muted-foreground" aria-hidden="true">
                            +
                        </span>
                    </button>
                </div>
            </div>

            <ExpenseModal
                isOpen={showAddExpenseModal || editingExpense !== null}
                onClose={() => {
                    setShowAddExpenseModal(false);
                    setEditingExpense(null);
                }}
                groupId={groupId}
                members={members}
                currentUserId={uid}
                expense={editingExpense}
            />

            <SettleUpModal
                transfer={settlingTransfer}
                members={ledgerProfiles}
                currentUserId={uid}
                groupId={groupId}
                onClose={() => setSettlingTransfer(null)}
            />

            <GroupSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                group={group}
                inviteLink={inviteLink}
                onCopyInvite={copyInviteLink}
                members={members}
                balances={balances}
                currentUserId={uid}
                currentUserEmail={user?.email || ""}
                onDeleteGroup={() => {
                    setShowSettings(false);
                    setShowDeleteModal(true);
                }}
            />

            <ConfirmModal
                isOpen={showDeleteModal}
                title="delete this group?"
                message="every expense and payment in it goes too. this can't be undone."
                confirmText={deleting ? "deleting…" : "delete group"}
                onConfirm={handleDeleteGroup}
                onCancel={() => setShowDeleteModal(false)}
                danger
            />
        </div>
    );
}
