"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToGroupExpenses } from "@/lib/expenses";
import { subscribeToGroupSettlements } from "@/lib/settlements";
import { calculateBalancesByUid } from "@/lib/calculations";

/**
 * @typedef {Object} GroupSummary
 * @property {number | null} balance - Your balance in the group; null until loaded
 * @property {import("@/types").Expense | null} latest - The newest expense, if any
 */

/**
 * Your balance in each of your groups, kept live, for the groups list.
 *
 * Opens one expenses and one settlements listener per group. That's a handful
 * for anyone's real list of groups, and it's what lets the list say "+300.00"
 * next to each one instead of making you open them to find out.
 *
 * @param {import("@/types").Group[] | null} groups
 * @param {string | undefined} uid - The signed-in user
 * @returns {{ summaries: Object<string, GroupSummary>, total: number | null }}
 *   total is null until every group has loaded
 */
export function useGroupSummaries(groups, uid) {
    // groupId -> { expenses, settlements }, filled in as listeners report.
    const [ledgers, setLedgers] = useState({});

    // Resubscribe only when the set of groups changes, not on every rename.
    const groupKey = (groups ?? []).map((group) => group.id).sort().join(",");

    useEffect(() => {
        if (!groupKey) return;
        const unsubscribers = groupKey.split(",").flatMap((groupId) => {
            const update = (field) => (rows) =>
                setLedgers((current) => ({
                    ...current,
                    [groupId]: { ...current[groupId], [field]: rows },
                }));
            // A group you were just removed from errors here; its row simply
            // keeps showing no balance until the groups list drops it.
            const ignore = () => {};
            return [
                subscribeToGroupExpenses(groupId, update("expenses"), ignore),
                subscribeToGroupSettlements(groupId, update("settlements"), ignore),
            ];
        });
        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, [groupKey]);

    return useMemo(() => {
        const summaries = {};
        let total = 0;
        let allLoaded = true;

        for (const group of groups ?? []) {
            const ledger = ledgers[group.id];
            if (!ledger?.expenses || !ledger?.settlements) {
                summaries[group.id] = { balance: null, latest: null };
                allLoaded = false;
                continue;
            }
            const balance =
                calculateBalancesByUid(ledger.expenses, group.members, ledger.settlements)[uid] ?? 0;
            summaries[group.id] = { balance, latest: ledger.expenses[0] ?? null };
            total += Math.round(balance * 100);
        }

        return { summaries, total: allLoaded ? total / 100 : null };
    }, [groups, ledgers, uid]);
}
