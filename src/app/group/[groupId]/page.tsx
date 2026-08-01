"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getGroup, updateGroupName, deleteGroup } from "@/lib/groups";
import { getUsersByIds } from "@/lib/user";
import { getGroupExpenses } from "@/lib/expenses";
import { calculateMemberBalances } from "@/lib/calculations";
import { Group, User, Expense, MemberBalance } from "@/types";
import MembersList from "@/components/MembersList";
import ConfirmModal from "@/components/ConfirmModal";
import AddExpenseModal from "@/components/AddExpenseModal";
import ExpenseList from "@/components/ExpenseList";
import BalanceSummary from "@/components/BalanceSummary";

export default function GroupDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const groupId = params.groupId as string;

    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<MemberBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Rename group state
    const [isRenaming, setIsRenaming] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    // Delete group state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Add expense modal state
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

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

            // Load expenses
            const groupExpenses = await getGroupExpenses(groupId);
            setExpenses(groupExpenses);

            // Load profiles for everyone in the ledger, not just current
            // members — anyone removed while unsettled still has a balance.
            const participants = new Set(groupData.members);
            groupExpenses.forEach((expense) => {
                participants.add(expense.paidBy);
                Object.keys(expense.splits ?? {}).forEach((uid) => participants.add(uid));
            });
            const profiles = await getUsersByIds([...participants]);
            const currentMembers = new Set(groupData.members);
            setMembers(profiles.filter((profile) => currentMembers.has(profile.uid)));

            // Calculate balances
            const memberBalances = calculateMemberBalances(
                groupExpenses,
                profiles,
                groupData.members
            );
            setBalances(memberBalances);

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

    const copyInviteLink = () => {
        const inviteLink = `${window.location.origin}/join/${groupId}`;
        navigator.clipboard.writeText(inviteLink);
        alert("Invite link copied! Share it via WhatsApp to invite friends.");
    };

    const handleRenameGroup = async () => {
        if (!user || !group) return;
        if (!newGroupName.trim()) {
            alert("Group name cannot be empty");
            return;
        }

        try {
            await updateGroupName(groupId, newGroupName.trim(), user.uid);
            setGroup({ ...group, name: newGroupName.trim() });
            setIsRenaming(false);
        } catch (error: any) {
            alert(error.message || "Failed to rename group");
        }
    };

    const handleDeleteGroup = async () => {
        if (!user) return;
        setDeleting(true);

        try {
            await deleteGroup(groupId, user.uid);
            router.push("/");
        } catch (error: any) {
            alert(error.message || "Failed to delete group");
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-600 mb-4 text-lg font-medium">
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <button
                        onClick={() => router.push("/")}
                        className="text-blue-600 hover:text-blue-700 mb-3 flex items-center gap-1 text-sm"
                    >
                        <span>←</span> Back to Groups
                    </button>

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            {isRenaming ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 focus:outline-none"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleRenameGroup}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsRenaming(false);
                                            setNewGroupName(group.name);
                                        }}
                                        className="text-sm text-gray-600 hover:text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setIsRenaming(true)}
                                            className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            Rename
                                        </button>
                                    )}
                                </div>
                            )}
                            {isAdmin && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mt-2 inline-block">
                                    You are Admin
                                </span>
                            )}
                        </div>

                        <button
                            onClick={copyInviteLink}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
                        >
                            📋 Copy Invite Link
                        </button>
                    </div>

                    {isAdmin && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
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
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Balance Summary</h2>
                    <BalanceSummary balances={balances} currentUserId={user?.uid || ""} />
                </div>

                {/* Expenses Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
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
                        onExpenseDeleted={loadGroupData}
                    />
                </div>

                {/* Members Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Members ({members.length})
                    </h2>
                    <MembersList
                        members={members}
                        balances={balances}
                        adminId={group.adminId}
                        currentUserId={user?.uid || ""}
                        groupId={groupId}
                        onMemberRemoved={loadGroupData}
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
                onExpenseAdded={loadGroupData}
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
