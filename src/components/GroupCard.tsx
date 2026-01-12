"use client";

import { Group } from "@/types";
import { useRouter } from "next/navigation";

interface GroupCardProps {
    group: Group;
}

export default function GroupCard({ group }: GroupCardProps) {
    const router = useRouter();

    const formatDate = (timestamp: any) => {
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
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{group.name}</h3>
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{group.members.length} member{group.members.length !== 1 ? "s" : ""}</span>
                <span>{formatDate(group.updatedAt)}</span>
            </div>
        </div>
    );
}
