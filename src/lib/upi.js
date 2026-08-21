/**
 * UPI IDs look like "name@bank": some letters, digits, dots, hyphens or
 * underscores, an @, then the handle. Deliberately loose, since new payment
 * handles appear regularly and rejecting a valid one is worse than accepting a
 * typo the payment app will catch anyway.
 */
const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * @param {string} upiId
 * @returns {boolean}
 */
export const isValidUpiId = (upiId) => UPI_ID_PATTERN.test(upiId.trim());

/**
 * Payment apps parse the query as a URI, not as a form body.
 *
 * URLSearchParams — the obvious thing to reach for — serialises as
 * application/x-www-form-urlencoded, which turns a space into "+". That is
 * correct for an HTML form body and wrong here: a URI query wants %20, so the
 * "+" arrives as a literal plus in the payee name and the note. "@" is left
 * alone because it is a legal query character and every real UPI link carries
 * it unencoded; some apps fail to decode %40 in the payee address.
 *
 * When an app dislikes any part of this payload it tends to report "limit
 * exceeded" rather than a parse error, which is why a malformed link looks
 * like a banking problem.
 */
const encodeUpiValue = (value) => encodeURIComponent(value).replace(/%40/g, "@");

/**
 * Transaction notes are capped by the payment apps — well under a tweet — and
 * an over-long one is another way to get a generic rejection. Group names are
 * user-supplied and can be any length, so the note is trimmed to fit rather
 * than being sent whole and hoping.
 */
const NOTE_MAX_LENGTH = 50;

const truncateNote = (note) => note.trim().slice(0, NOTE_MAX_LENGTH).trim();

/**
 * Build a UPI deep link that opens GPay/PhonePe/Paytm with the payment
 * prefilled. Android follows these directly; on desktop nothing will handle the
 * scheme, so callers should treat the button as a phone-first convenience.
 *
 * @param {string} upiId - Payee's UPI ID
 * @param {string} payeeName - Payee's display name
 * @param {number} amount - Amount in INR
 * @param {string} note - Transaction note shown in the payment app
 * @returns {string} A upi://pay link
 */
export const buildUpiLink = (upiId, payeeName, amount, note) => {
    const params = [
        ["pa", upiId.trim()],
        ["pn", payeeName.trim()],
        // Always two decimal places. Payment apps reject a bare integer or a
        // three-decimal amount, and the rejection surfaces as "limit exceeded"
        // rather than anything that points at the amount.
        ["am", amount.toFixed(2)],
        ["cu", "INR"],
        ["tn", truncateNote(note)],
    ];

    return `upi://pay?${params
        .map(([key, value]) => `${key}=${encodeUpiValue(value)}`)
        .join("&")}`;
};
