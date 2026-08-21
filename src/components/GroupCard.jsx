"use client";

import { useRouter } from "next/navigation";

/**
 * @param {Object} props
 * @param {import("@/types").Group} props.group
 */
export default function GroupCard({ group }) {
    const router = useRouter();

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <div
            onClick={() => router.push(`/group/${group.id}`)}
            className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
            <h3 className="text-lg font-semibold text-foreground mb-1">{group.name}</h3>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{group.members.length} member{group.members.length !== 1 ? "s" : ""}</span>
                <span>{formatDate(group.updatedAt)}</span>
            </div>
        </div>
    );
}
