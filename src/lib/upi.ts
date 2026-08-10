/**
 * UPI IDs look like "name@bank": some letters, digits, dots, hyphens or
 * underscores, an @, then the handle. Deliberately loose, since new payment
 * handles appear regularly and rejecting a valid one is worse than accepting a
 * typo the payment app will catch anyway.
 */
const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

export const isValidUpiId = (upiId: string): boolean =>
    UPI_ID_PATTERN.test(upiId.trim());

/**
 * Build a UPI deep link that opens GPay/PhonePe/Paytm with the payment
 * prefilled. Android follows these directly; on desktop nothing will handle the
 * scheme, so callers should treat the button as a phone-first convenience.
 *
 * @param upiId - Payee's UPI ID
 * @param payeeName - Payee's display name
 * @param amount - Amount in INR
 * @param note - Transaction note shown in the payment app
 * @returns A upi://pay link
 */
export const buildUpiLink = (
    upiId: string,
    payeeName: string,
    amount: number,
    note: string
): string => {
    const params = new URLSearchParams({
        pa: upiId.trim(),
        pn: payeeName,
        am: amount.toFixed(2),
        cu: "INR",
        tn: note,
    });

    return `upi://pay?${params.toString()}`;
};
