"use client";

import { User } from "@/types";
import { removeMemberFromGroup } from "@/lib/groups";
import { useState } from "react";

interface MembersListProps {
    members: User[];
    adminId: string;
    currentUserId: string;
    groupId: string;
    onMemberRemoved: () => void;
}

export default function MembersList({
    members,
    adminId,
    currentUserId,
    groupId,
    onMemberRemoved,
}: MembersListProps) {
    const [removing, setRemoving] = useState<string | null>(null);
    const isAdmin = currentUserId === adminId;

    const handleRemoveMember = async (userId: string, userName: string) => {
        if (!confirm(`Remove ${userName} from the group?`)) return;

        setRemoving(userId);
        try {
            await removeMemberFromGroup(groupId, userId, currentUserId);
            onMemberRemoved();
        } catch (error: any) {
            alert(error.message || "Failed to remove member");
        } finally {
            setRemoving(null);
        }
    };

    return (
        <div className="space-y-3">
            {members.map((member) => (
                <div
                    key={member.uid}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                    <div className="flex items-center gap-3">
                        {member.photoURL ? (
                            <img
                                src={member.photoURL}
                                alt={member.name}
                                className="w-10 h-10 rounded-full"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="font-medium text-gray-900">
                                {member.name}
                                {member.uid === adminId && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        Admin
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-gray-600">{member.email}</div>
                        </div>
                    </div>

                    {isAdmin && member.uid !== adminId && (
                        <button
                            onClick={() => handleRemoveMember(member.uid, member.name)}
                            disabled={removing === member.uid}
                            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                        >
                            {removing === member.uid ? "Removing..." : "Remove"}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
