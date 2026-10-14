"use client";

import { useState } from "react";
import { addExpense, updateExpense } from "@/lib/expenses";
import { splitEqually, splitByPercentage, percentagesFromSplits } from "@/lib/calculations";
import { buttonClass, fieldClass, formatRupees, labelClass, rowClass } from "@/components/ui/kit";

/**
 * The split inputs for each tab, either blank or filled in from an expense
 * being edited. Every tab is filled, not just the expense's own, so switching
 * tabs mid-edit starts from something sensible rather than from nothing.
 *
 * @param {import("@/types").Expense | null} expense
 * @param {import("@/types").User[]} members
 */
const initialSplitInputs = (expense, members) => {
    const uids = members.map((m) => m.uid);
    const blank = Object.fromEntries(uids.map((uid) => [uid, ""]));
    const asInputs = (values) =>
        Object.fromEntries(Object.entries(values).map(([uid, value]) => [uid, String(value)]));

    if (!expense) {
        return { selectedMembers: new Set(uids), exactAmounts: blank, percentages: blank };
    }

    // Expenses from before splits were stored have none, and were divided
    // equally between everyone; that's also what selecting all members means.
    const splits = expense.splits ?? {};
    const hasSplits = Object.keys(splits).length > 0;

    return {
        selectedMembers: new Set(
            hasSplits && expense.splitType === "equal" ? Object.keys(splits) : uids
        ),
        exactAmounts: { ...blank, ...asInputs(hasSplits ? splits : splitEqually(expense.amount, uids)) },
        percentages: {
            ...blank,
            ...asInputs(
                expense.percentages ??
                    percentagesFromSplits(expense.amount, hasSplits ? splits : splitEqually(expense.amount, uids))
            ),
        },
    };
};

/**
 * @param {Object} props
 * @param {string} props.groupId
 * @param {import("@/types").User[]} props.members
 * @param {string} props.currentUserId
 * @param {import("@/types").Expense | null} [props.expense]
 *   The expense to edit. Without one, the form adds a new expense.
 * @param {() => void} props.onSaved
 *   Called once the expense is saved. The group page's listener picks the
 *   expense itself up, so this only needs to close whatever holds the form.
 */
export default function ExpenseForm({
    groupId,
    members,
    currentUserId,
    expense = null,
    onSaved,
}) {
    const isEditing = expense !== null;
    const [amount, setAmount] = useState(isEditing ? String(expense.amount) : "");
    const [description, setDescription] = useState(expense?.description ?? "");
    const [paidBy, setPaidBy] = useState(expense?.paidBy ?? currentUserId);
    const [splitType, setSplitType] = useState(expense?.splitType ?? "equal");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [initialInputs] = useState(() => initialSplitInputs(expense, members));

    // Equal split: which members are included
    const [selectedMembers, setSelectedMembers] = useState(initialInputs.selectedMembers);

    // Exact split: amount per member
    const [exactAmounts, setExactAmounts] = useState(initialInputs.exactAmounts);

    // Percentage split: percentage per member
    const [percentages, setPercentages] = useState(initialInputs.percentages);

    // Reset split inputs when the member list changes. Compared by uid rather
    // than by array identity: the group page hands down a fresh array on every
    // live update, and a rename elsewhere shouldn't wipe a half-typed split.
    // Adjusted during render instead of in an effect, so the stale inputs are
    // never painted.
    const memberKey = members.map((m) => m.uid).join(",");
    const [splitsMemberKey, setSplitsMemberKey] = useState(memberKey);
    if (splitsMemberKey !== memberKey) {
        const reset = initialSplitInputs(expense, members);
        setSplitsMemberKey(memberKey);
        setSelectedMembers(reset.selectedMembers);
        setExactAmounts(reset.exactAmounts);
        setPercentages(reset.percentages);
    }

    const toggleMember = (uid) => {
        const next = new Set(selectedMembers);
        if (next.has(uid)) {
            if (next.size <= 1) return; // at least 1 member
            next.delete(uid);
        } else {
            next.add(uid);
        }
        setSelectedMembers(next);
    };

    // Totals are compared as integers — 0.1 + 0.2 !== 0.3 in floating point, so
    // a split that looks exact on screen can fail a naive equality check.
    const amountPaise = Math.round((parseFloat(amount) || 0) * 100);

    const getExactTotalPaise = () =>
        Object.values(exactAmounts).reduce(
            (total, value) => total + Math.round((parseFloat(value) || 0) * 100),
            0
        );

    // Percentages are tracked in hundredths of a percent for the same reason.
    const getPercentageTotalBasisPoints = () =>
        Object.values(percentages).reduce(
            (total, value) => total + Math.round((parseFloat(value) || 0) * 100),
            0
        );

    const getExactTotal = () => getExactTotalPaise() / 100;
    const getPercentageTotal = () => getPercentageTotalBasisPoints() / 100;

    const exactTotalMatches = amountPaise > 0 && getExactTotalPaise() === amountPaise;
    const percentageTotalMatches = getPercentageTotalBasisPoints() === 10000;

    /** @returns {{ splits: Object<string, number>, percentages?: Object<string, number> } | null} */
    const buildSplits = () => {
        const amountNum = parseFloat(amount);
        if (!amount || isNaN(amountNum) || amountNum <= 0) return null;

        if (splitType === "equal") {
            const selected = members.filter((m) => selectedMembers.has(m.uid));
            if (selected.length === 0) return null;
            return { splits: splitEqually(amountNum, selected.map((m) => m.uid)) };
        }

        if (splitType === "exact") {
            const splits = {};
            for (const m of members) {
                const val = parseFloat(exactAmounts[m.uid] || "0");
                if (isNaN(val) || val < 0) return null;
                if (val > 0) {
                    splits[m.uid] = Math.round(val * 100) / 100;
                }
            }
            if (Object.keys(splits).length === 0) return null;
            if (!exactTotalMatches) return null;
            return { splits };
        }

        if (splitType === "percentage") {
            const pcts = {};
            for (const m of members) {
                const pct = parseFloat(percentages[m.uid] || "0");
                if (isNaN(pct) || pct < 0) return null;
                if (pct > 0) pcts[m.uid] = pct;
            }
            if (Object.keys(pcts).length === 0) return null;
            if (!percentageTotalMatches) return null;
            return { splits: splitByPercentage(amountNum, pcts), percentages: pcts };
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const amountNum = parseFloat(amount);
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            setError("enter an amount above ₹0");
            return;
        }

        if (!description.trim()) {
            setError("say what it was for");
            return;
        }

        const built = buildSplits();
        if (!built) {
            if (splitType === "exact") {
                const diff = Math.round((amountNum - getExactTotal()) * 100) / 100;
                setError(`the amounts must add up to ₹${amountNum.toFixed(2)}. they're off by ₹${Math.abs(diff).toFixed(2)}`);
            } else if (splitType === "percentage") {
                setError(`the percentages must add up to 100%. right now they add up to ${getPercentageTotal()}%`);
            } else {
                setError("pick at least one person to split it with");
            }
            return;
        }

        setLoading(true);

        try {
            if (isEditing) {
                await updateExpense(expense.id, groupId, currentUserId, {
                    amount: amountNum,
                    description,
                    paidBy,
                    splitType,
                    splits: built.splits,
                    percentages: built.percentages,
                });
            } else {
                await addExpense(
                    groupId,
                    amountNum,
                    description.trim(),
                    paidBy,
                    currentUserId,
                    splitType,
                    built.splits,
                    built.percentages
                );
            }

            // The form unmounts when its dialog closes, so there's nothing to
            // reset: the next one starts from scratch.
            onSaved();
        } catch (err) {
            setError(err.message || "couldn't save the expense");
        } finally {
            setLoading(false);
        }
    };

    const amountNum = parseFloat(amount) || 0;

    // Preview the shares the way they will actually be stored, so the numbers
    // on screen are the numbers that reach the ledger — including the odd paisa.
    const equalPreview = splitEqually(
        amountNum,
        members.filter((m) => selectedMembers.has(m.uid)).map((m) => m.uid)
    );

    const nameOf = (member) => (member.uid === currentUserId ? "you" : member.name);

    // The running total under the exact and percent splits: quiet while it's
    // short, green once it adds up.
    const totalLine = (matches, text) => (
        <p className={`font-mono text-[13px] ${matches ? "text-positive" : "text-subtle"}`}>{text}</p>
    );

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <label htmlFor="amount" className={labelClass}>
                    amount (₹)
                </label>
                <input
                    type="number"
                    id="amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`${fieldClass} font-mono`}
                    disabled={loading}
                    required
                />
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="description" className={labelClass}>
                    for
                </label>
                <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="groceries, dinner, cab…"
                    // Security rules cap the stored description at 200
                    // characters; stop here so a long one is trimmed as it is
                    // typed rather than rejected as a permission error on save.
                    maxLength={200}
                    className={fieldClass}
                    disabled={loading}
                    required
                />
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="paidBy" className={labelClass}>
                    paid by
                </label>
                <select
                    id="paidBy"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className={fieldClass}
                    disabled={loading}
                >
                    {members.map((member) => (
                        <option key={member.uid} value={member.uid}>
                            {nameOf(member)}
                        </option>
                    ))}
                </select>
            </div>

            <fieldset className="flex flex-col gap-3">
                <legend className={`${labelClass} mb-2`}>split</legend>
                <div className="grid grid-cols-3 gap-1 rounded-md border border-border p-1">
                    {["equal", "exact", "percentage"].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setSplitType(type)}
                            aria-pressed={splitType === type}
                            className={`h-10 rounded-sm font-mono text-[13px] transition-colors ${
                                splitType === type
                                    ? "bg-muted text-foreground"
                                    : "text-muted-foreground hover:bg-hover hover:text-foreground active:bg-pressed"
                            }`}
                            disabled={loading}
                        >
                            {type === "percentage" ? "percent" : type}
                        </button>
                    ))}
                </div>

                {splitType === "equal" && (
                    <>
                        <ul className="flex flex-col">
                            {members.map((member) => (
                                <li key={member.uid}>
                                    <label className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 ${rowClass}`}>
                                        <span className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedMembers.has(member.uid)}
                                                onChange={() => toggleMember(member.uid)}
                                                className="h-4 w-4 accent-foreground"
                                                disabled={loading}
                                            />
                                            <span className="text-[15px] text-foreground">{nameOf(member)}</span>
                                        </span>
                                        {selectedMembers.has(member.uid) && amountNum > 0 && (
                                            <span className="font-mono text-[13px] text-muted-foreground">
                                                {formatRupees(equalPreview[member.uid])}
                                            </span>
                                        )}
                                    </label>
                                </li>
                            ))}
                        </ul>
                        {amountNum > 0 &&
                            totalLine(
                                false,
                                `${formatRupees(amountNum)} between ${selectedMembers.size} of ${members.length}`
                            )}
                    </>
                )}

                {splitType === "exact" && (
                    <>
                        <ul className="flex flex-col gap-2">
                            {members.map((member) => (
                                <li key={member.uid} className="flex items-center gap-3">
                                    <label
                                        htmlFor={`exact-${member.uid}`}
                                        className="min-w-24 truncate text-[15px] text-foreground"
                                    >
                                        {nameOf(member)}
                                    </label>
                                    <input
                                        id={`exact-${member.uid}`}
                                        type="number"
                                        inputMode="decimal"
                                        value={exactAmounts[member.uid] || ""}
                                        onChange={(e) =>
                                            setExactAmounts({ ...exactAmounts, [member.uid]: e.target.value })
                                        }
                                        placeholder="₹0.00"
                                        step="0.01"
                                        min="0"
                                        className={`${fieldClass} h-11 font-mono`}
                                        disabled={loading}
                                    />
                                </li>
                            ))}
                        </ul>
                        {totalLine(
                            exactTotalMatches,
                            `${formatRupees(getExactTotal())} of ${formatRupees(amountNum)}` +
                                (amountNum > 0 && !exactTotalMatches
                                    ? ` · ${formatRupees((amountPaise - getExactTotalPaise()) / 100)} left`
                                    : "")
                        )}
                    </>
                )}

                {splitType === "percentage" && (
                    <>
                        <ul className="flex flex-col gap-2">
                            {members.map((member) => {
                                const pct = parseFloat(percentages[member.uid] || "0");
                                return (
                                    <li key={member.uid} className="flex items-center gap-3">
                                        <label
                                            htmlFor={`percent-${member.uid}`}
                                            className="min-w-24 truncate text-[15px] text-foreground"
                                        >
                                            {nameOf(member)}
                                        </label>
                                        <input
                                            id={`percent-${member.uid}`}
                                            type="number"
                                            inputMode="decimal"
                                            value={percentages[member.uid] || ""}
                                            onChange={(e) =>
                                                setPercentages({ ...percentages, [member.uid]: e.target.value })
                                            }
                                            placeholder="0%"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            className={`${fieldClass} h-11 font-mono`}
                                            disabled={loading}
                                        />
                                        <span className="w-20 shrink-0 text-right font-mono text-xs text-subtle">
                                            {amountNum > 0 && pct > 0 ? formatRupees((amountNum * pct) / 100) : ""}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                        {totalLine(
                            percentageTotalMatches,
                            `${getPercentageTotal()}% of 100%` +
                                (!percentageTotalMatches
                                    ? ` · ${Math.abs(100 - getPercentageTotal()).toFixed(2)}% left`
                                    : "")
                        )}
                    </>
                )}
            </fieldset>

            {error && <p className="text-sm text-negative">{error}</p>}

            <button type="submit" disabled={loading} className={buttonClass(true)}>
                <span>
                    {loading
                        ? isEditing
                            ? "saving…"
                            : "adding…"
                        : isEditing
                          ? "save changes"
                          : "add expense"}
                </span>
                <span className="text-muted-foreground" aria-hidden="true">
                    →
                </span>
            </button>
        </form>
    );
}
