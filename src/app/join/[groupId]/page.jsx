"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getGroup, addMemberToGroup, isUserMember } from "@/lib/groups";
import { AppHeader, Wordmark, buttonClass } from "@/components/ui/kit";

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
                    setError("this group doesn't exist. the link may be wrong.");
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
                        "this invite link has been turned off. ask the group admin to turn it back on."
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
                setError("couldn't join the group. try again.");
                setLoading(false);
            }
        };

        handleJoin();
    }, [user, authLoading, groupId, router]);

    if (authLoading || loading) {
        return (
            <Screen>
                <p className="font-mono text-[13px] text-subtle">joining…</p>
            </Screen>
        );
    }

    if (error) {
        return (
            <Screen>
                <p className="text-[15px] text-foreground">{error}</p>
                <Link href="/" className={buttonClass()}>
                    <span>go to your groups</span>
                    <span className="text-muted-foreground" aria-hidden="true">
                        →
                    </span>
                </Link>
            </Screen>
        );
    }

    if (!user) {
        return (
            <Screen>
                <div className="flex flex-col gap-3">
                    <h1 className="text-2xl font-medium tracking-tight text-foreground">
                        you&apos;ve been invited to a group.
                    </h1>
                    <p className="text-[15px] leading-relaxed text-muted-foreground">
                        sign in to join it and see who pays whom.
                    </p>
                </div>
                <button type="button" onClick={signInWithGoogle} className={buttonClass()}>
                    <span>continue with google</span>
                    <span className="text-muted-foreground" aria-hidden="true">
                        →
                    </span>
                </button>
            </Screen>
        );
    }

    return null;
}

/** The one-column, centred screen every state of this page uses. */
function Screen({ children }) {
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6">
                <AppHeader left={<Wordmark />} right={null} />
                <main className="flex flex-1 flex-col justify-center gap-6 pb-24">{children}</main>
            </div>
        </div>
    );
}
