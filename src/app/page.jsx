"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { getUserGroups } from "@/lib/groups";
import GroupCard from "@/components/GroupCard";
import CreateGroupModal from "@/components/CreateGroupModal";
import ThemeToggle from "@/components/ThemeToggle";
import Landing from "@/components/Landing";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadGroups = async () => {
    if (!user) return;
    setLoadingGroups(true);
    setGroupsError("");
    try {
      const userGroups = await getUserGroups(user.uid);
      setGroups(userGroups);
    } catch (error) {
      console.error("Error loading groups:", error);
      // Said out loud rather than only in the console: an empty page with no
      // explanation reads as "you have no groups", which is a different thing.
      setGroupsError("Couldn't load your groups. Check your connection and try again.");
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Landing onSignIn={signInWithGoogle} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Split-It-Wise</h1>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={logout}
              className="text-sm text-muted-foreground hover:text-foreground px-2"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Your Groups</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create Group
          </button>
        </div>

        {loadingGroups ? (
          <div className="text-center py-12 text-muted-foreground">Loading groups...</div>
        ) : groupsError ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">{groupsError}</p>
            <button
              onClick={loadGroups}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">You haven&apos;t joined any groups yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-card border-t border-border py-3">
        <div className="text-center text-sm text-muted-foreground">
          Made by <span className="font-medium">Akshat Patil</span>
        </div>
      </footer>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={loadGroups}
      />
    </div>
  );
}
