"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { getUserGroups } from "@/lib/groups";
import GroupCard from "@/components/GroupCard";
import CreateGroupModal from "@/components/CreateGroupModal";
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
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Split-It-Wise</h1>
          <p className="text-gray-600">Simple expense splitting for students</p>
        </div>
        <button
          onClick={signInWithGoogle}
          className="px-6 py-3 bg-white text-gray-900 rounded-lg shadow-md hover:shadow-lg transition-shadow font-medium flex items-center gap-2"
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Split-It-Wise</h1>
          <button
            onClick={logout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Groups</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create Group
          </button>
        </div>

        {loadingGroups ? (
          <div className="text-center py-12 text-gray-600">Loading groups...</div>
        ) : groupsError ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{groupsError}</p>
            <button
              onClick={loadGroups}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven't joined any groups yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
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
      <footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-3">
        <div className="text-center text-sm text-gray-600">
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
