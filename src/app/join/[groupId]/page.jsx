"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getGroup, addMemberToGroup, isUserMember } from "@/lib/groups";

export default function JoinGroupPage() {
    const { user, loading: authLoading, signInWithGoogle } = useAuth();
    const router = useRouter();
    const params = useParams();
    const groupId = params.groupId;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [groupName, setGroupName] = useState("");

    useEffect(() => {
        const handleJoin = async () => {
            if (authLoading) return;

            // If not logged in, prompt to login
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // Check if group exists
                const group = await getGroup(groupId);
                if (!group) {
                    setError("Group not found");
                    setLoading(false);
                    return;
                }

                setGroupName(group.name);

                // Check if already a member
                const isMember = await isUserMember(groupId, user.uid);
                if (isMember) {
                    // Already a member, redirect to group
                    router.push(`/group/${groupId}`);
                    return;
                }

                // Checked before writing so a closed link explains itself,
                // rather than surfacing as the rules rejecting the update.
                // Existing members are let through above either way.
                if (group.joinOpen === false) {
                    setError(
                        "This invite link has been turned off. Ask the group admin to turn it back on."
                    );
                    setLoading(false);
                    return;
                }

                // Add user to group
                await addMemberToGroup(groupId, user.uid);

                // Redirect to group dashboard
                router.push(`/group/${groupId}`);
            } catch (err) {
                console.error("Error joining group:", err);
                setError("Failed to join group. Please try again.");
                setLoading(false);
            }
        };

        handleJoin();
    }, [user, authLoading, groupId, router]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-gray-600 mb-2">Loading...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-600 mb-4 text-lg font-medium">{error}</div>
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

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="text-center mb-8 max-w-md">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Group</h1>
                    {groupName && (
                        <p className="text-gray-600 mb-4">
                            You've been invited to join <span className="font-semibold">{groupName}</span>
                        </p>
                    )}
                    <p className="text-gray-600 mb-6">Sign in with Google to continue</p>
                    <button
                        onClick={signInWithGoogle}
                        className="px-6 py-3 bg-white text-gray-900 rounded-lg shadow-md hover:shadow-lg transition-shadow font-medium flex items-center gap-2 mx-auto"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Continue with Google
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
