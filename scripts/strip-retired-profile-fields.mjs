/**
 * One-off: remove fields profiles no longer store from every doc in /users.
 *
 * Profiles are readable by any signed-in user. Older ones carry the owner's
 * email, and a UPI ID from the payment links the app has since dropped (often
 * a phone number in disguise: 98xxxxxxxx@ybl). The app strips both when the
 * owner next signs in (syncUserProfile in src/lib/user.js), but someone who
 * never comes back would keep theirs forever, and rules can't hide one field
 * of a readable document. This clears the rest in one pass.
 *
 * It needs admin access, so it runs on your machine with a service-account key
 * and bypasses the security rules entirely. Get a key from the Firebase console:
 * Project settings → Service accounts → Generate new private key. Keep it
 * outside the repo, and delete it when you're done.
 *
 *   # Dry run: reports what it would change, writes nothing
 *   GOOGLE_APPLICATION_CREDENTIALS=~/keys/split-it-wise.json node scripts/strip-retired-profile-fields.mjs
 *
 *   # Actually remove the emails
 *   GOOGLE_APPLICATION_CREDENTIALS=~/keys/split-it-wise.json node scripts/strip-retired-profile-fields.mjs --apply
 *
 * Safe to run more than once: profiles with nothing to remove are left alone.
 */
import { readFileSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");

/** Keep in step with RETIRED_PROFILE_FIELDS in src/lib/user.js. */
const RETIRED_FIELDS = ["email", "upiId"];

// Against the emulator (FIRESTORE_EMULATOR_HOST set) no key is needed, which
// is how this script was tested.
const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!emulator && !keyPath) {
    console.error(
        "Set GOOGLE_APPLICATION_CREDENTIALS to the path of a service-account key.\n" +
            "See the comment at the top of this file for where to get one."
    );
    process.exit(1);
}

// Printed before anything happens, so a key for the wrong project is caught
// on the dry run rather than after the writes.
const projectId = emulator
    ? process.env.GCLOUD_PROJECT || "demo-split-it-wise"
    : JSON.parse(readFileSync(keyPath, "utf8")).project_id;

initializeApp(emulator ? { projectId } : { credential: applicationDefault(), projectId });
const db = getFirestore();

const users = await db.collection("users").get();
const stale = users.docs
    .map((profile) => ({
        ref: profile.ref,
        fields: RETIRED_FIELDS.filter((field) => field in profile.data()),
    }))
    .filter((profile) => profile.fields.length > 0);

console.log(`Project:    ${projectId}${emulator ? ` (emulator at ${emulator})` : ""}`);
console.log(`Profiles:   ${users.size}`);
for (const field of RETIRED_FIELDS) {
    const count = stale.filter((profile) => profile.fields.includes(field)).length;
    console.log(`With ${field}:`.padEnd(12) + count);
}

if (stale.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
}

if (!apply) {
    console.log("\nDry run, nothing written. Re-run with --apply to remove them.");
    process.exit(0);
}

// BulkWriter batches and retries on its own, so there's no 500-write batch
// limit to manage by hand.
const writer = db.bulkWriter();
let failed = 0;
writer.onWriteError((error) => {
    failed++;
    console.error(`Failed on ${error.documentRef.path}: ${error.message}`);
    return false;
});

for (const profile of stale) {
    writer.update(
        profile.ref,
        Object.fromEntries(profile.fields.map((field) => [field, FieldValue.delete()]))
    );
}
await writer.close();

console.log(`\nCleaned ${stale.length - failed} profile(s).`);
if (failed > 0) {
    console.log(`${failed} failed; re-running is safe and will retry just those.`);
    process.exit(1);
}
