"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { subscribeToUserGroups } from "@/lib/groups";
import { describeYourBalance } from "@/lib/calculations";
import { useGroupSummaries } from "@/hooks/useGroupSummaries";
import CreateGroupModal from "@/components/CreateGroupModal";
import Landing from "@/components/Landing";
import {
  AccountMenu,
  AppHeader,
  buttonClass,
  formatRupees,
  rowClass,
  timeAgo,
  Wordmark,
} from "@/components/ui/kit";

/** Your balance in a group, signed and coloured: +300.00, −400.00, or "settled". */
function BalanceFigure({ balance }) {
  if (balance === null) return <span className="font-mono text-[15px] text-subtle">…</span>;
  if (balance === 0) return <span className="font-mono text-[13px] text-subtle">settled</span>;
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className={`font-mono text-[15px] ${balance > 0 ? "text-positive" : "text-negative"}`}>
        {balance > 0 ? "+" : "−"}
        {formatRupees(balance).slice(1)}
      </span>
      <span className="text-xs text-subtle">{balance > 0 ? "you get back" : "you pay"}</span>
    </span>
  );
}

export default function Home() {
  const { user, loading, signInWithGoogle, logout, isFirebaseConfigured } = useAuth();
  const uid = user?.uid;
  // Tagged with the uid it was loaded for, so signing out and in as someone
  // else never shows the previous account's groups while the new list loads.
  const [loaded, setLoaded] = useState(null);
  const [groupsError, setGroupsError] = useState("");
  // Bumped by "Try again" to tear down a failed listener and open a new one.
  const [attempt, setAttempt] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return subscribeToUserGroups(
      uid,
      (groups) => {
        setGroupsError("");
        setLoaded({ uid, groups });
      },
      (error) => {
        console.error("Error loading groups:", error);
        // Said out loud rather than only in the console: an empty page with no
        // explanation reads as "you have no groups", which is a different thing.
        setGroupsError("couldn't load your groups. check your connection and try again.");
      }
    );
  }, [uid, attempt]);

  // Most recently active first.
  const groups = useMemo(() => {
    const list = uid && loaded?.uid === uid ? loaded.groups : null;
    return list
      ? [...list].sort(
          (a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0)
        )
      : null;
  }, [uid, loaded]);
  const { summaries, total } = useGroupSummaries(groups, uid);

  const retry = () => {
    setGroupsError("");
    setAttempt((current) => current + 1);
  };

  if (loading) {
    return <div className="min-h-dvh bg-background" aria-busy="true" />;
  }

  if (!user) {
    return <Landing onSignIn={signInWithGoogle} isFirebaseConfigured={isFirebaseConfigured} />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-xl px-6 pb-32">
        <AppHeader
          left={
            <span className="flex items-center gap-2">
              <Wordmark />
              {/* Easy to forget you're on fixtures once you're inside the app. */}
              {!isFirebaseConfigured && (
                <span className="rounded-sm border border-border px-1.5 font-mono text-[11px] text-subtle">
                  demo
                </span>
              )}
            </span>
          }
          right={
            <AccountMenu
              name={user.displayName || "you"}
              email={user.email || ""}
              onLogout={logout}
            />
          }
        />

        <section className="pt-6 pb-7">
          <h1 className="text-[22px] font-medium tracking-tight text-foreground">your groups</h1>
          {groups && groups.length > 0 && total !== null && (
            <p className="mt-2 font-mono text-[13px] text-muted-foreground">
              {total === 0 ? (
                "overall you're all settled"
              ) : (
                <>
                  overall {describeYourBalance(total)}{" "}
                  <span className={total > 0 ? "text-positive" : "text-negative"}>
                    {formatRupees(total)}
                  </span>
                </>
              )}
            </p>
          )}
        </section>

        {groupsError ? (
          <div className="flex flex-col items-start gap-4 border-t border-hairline pt-6">
            <p className="text-[15px] text-negative">{groupsError}</p>
            <button type="button" onClick={retry} className={buttonClass()}>
              <span>try again</span>
              <span className="text-muted-foreground">↻</span>
            </button>
          </div>
        ) : !groups ? (
          <p className="border-t border-hairline pt-6 font-mono text-[13px] text-subtle">loading…</p>
        ) : groups.length === 0 ? (
          <div className="border-t border-hairline pt-6">
            <p className="text-[15px] text-muted-foreground">
              no groups yet. make one, then share the invite link with your friends.
            </p>
          </div>
        ) : (
          <ul className="border-b border-hairline" aria-label="your groups">
            {groups.map((group) => {
              const summary = summaries[group.id] ?? { balance: null, latest: null };
              const people = group.members.length;
              return (
                <li key={group.id} className="border-t border-hairline">
                  <Link
                    href={`/group/${group.id}`}
                    className={`flex items-center justify-between gap-4 py-[18px] ${rowClass}`}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-base font-medium text-foreground">
                        {group.name}
                      </span>
                      <span className="truncate text-[13px] text-subtle">
                        {people} {people === 1 ? "person" : "people"}
                        {summary.latest &&
                          ` · ${summary.latest.description.toLowerCase()}, ${timeAgo(summary.latest.createdAt)}`}
                      </span>
                    </span>
                    <BalanceFigure balance={summary.balance} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Kept within thumb reach on a phone, and within the column on desktop. */}
      <div className="fixed inset-x-0 bottom-0 bg-background pt-3 pb-7">
        <div className="mx-auto w-full max-w-xl px-6">
          <button type="button" onClick={() => setShowCreateModal(true)} className={buttonClass(true)}>
            <span>new group</span>
            <span className="text-muted-foreground" aria-hidden="true">
              +
            </span>
          </button>
        </div>
      </div>

      <CreateGroupModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
