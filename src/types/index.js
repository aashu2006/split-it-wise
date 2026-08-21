/**
 * The shapes stored in Firestore, written as JSDoc typedefs.
 *
 * Nothing here exists at runtime — this file is documentation that editors
 * happen to understand. Reference a shape from another file with
 * `{import("@/types").Group}` in a JSDoc comment.
 */

/** @typedef {import("firebase/firestore").Timestamp} Timestamp */

/**
 * @typedef {Object} User
 * @property {string} uid
 * @property {string} name
 * @property {string} email
 * @property {string} [photoURL]
 * @property {string} [upiId] e.g. "akshat@okhdfcbank", used to build UPI payment links
 * @property {Timestamp} createdAt
 */

/**
 * @typedef {Object} Group
 * @property {string} id
 * @property {string} name
 * @property {string} adminId
 * @property {string[]} members Array of user UIDs
 * @property {boolean} [joinOpen]
 *   Whether the invite link still works. The group id is the invite secret
 *   and can't be rotated, so this is the admin's off switch for a link that
 *   has been forwarded further than they meant it to go. Groups created
 *   before this existed have no such field and count as open.
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 */

/** @typedef {"equal" | "exact" | "percentage"} SplitType */

/**
 * @typedef {Object} Expense
 * @property {string} id
 * @property {string} groupId
 * @property {number} amount In INR
 * @property {string} description
 * @property {string} paidBy User UID
 * @property {string} createdBy User UID
 * @property {SplitType} splitType
 * @property {Object<string, number>} splits uid -> amount owed
 * @property {Timestamp} createdAt
 */

/**
 * A repayment between two members. Kept separate from Expense so that group
 * spending totals don't count money moving back and forth to clear debts.
 *
 * @typedef {Object} Settlement
 * @property {string} id
 * @property {string} groupId
 * @property {string} from User UID who paid
 * @property {string} to User UID who was paid
 * @property {number} amount In INR
 * @property {string} createdBy User UID who recorded it
 * @property {Timestamp} createdAt
 */

/**
 * One payment needed to clear the group's debts.
 *
 * @typedef {Object} Transfer
 * @property {string} from User UID who should pay
 * @property {string} to User UID who should be paid
 * @property {number} amount In INR
 */

/**
 * @typedef {Object} MemberBalance
 * @property {string} uid
 * @property {string} name
 * @property {number} balance Positive = to receive, Negative = to pay
 * @property {boolean} [isFormerMember] Left the group but still part of its expense history
 */

export {};
