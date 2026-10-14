/**
 * One-off: remove the email field from every profile in /users.
 *
 * Profiles are readable by any signed-in user, and older ones were written
 * with the owner's email in them. The app now strips it when its owner next
 * signs in (syncUserProfile in src/lib/user.js), but someone who never comes
 * back would keep theirs forever, and rules can't hide one field of a readable
 * document. This clears the rest in one pass.
 *
 * It needs admin access, so it runs on your machine with a service-account key
 * and bypasses the security rules entirely. Get a key from the Firebase console:
 * Project settings → Service accounts → Generate new private key. Keep it
 * outside the repo, and delete it when you're done.
 *
 *   # Dry run: reports what it would change, writes nothing
 *   GOOGLE_APPLICATION_CREDENTIALS=~/keys/split-it-wise.json node scripts/strip-user-emails.mjs
 *
 *   # Actually remove the emails
 *   GOOGLE_APPLICATION_CREDENTIALS=~/keys/split-it-wise.json node scripts/strip-user-emails.mjs --apply
 *
 * Safe to run more than once: profiles without an email are left alone.
 */
import { readFileSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");

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
const withEmail = users.docs.filter((profile) => "email" in profile.data());

console.log(`Project:    ${projectId}${emulator ? ` (emulator at ${emulator})` : ""}`);
console.log(`Profiles:   ${users.size}`);
console.log(`With email: ${withEmail.length}`);

if (withEmail.length === 0) {
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

for (const profile of withEmail) {
    writer.update(profile.ref, { email: FieldValue.delete() });
}
await writer.close();

console.log(`\nRemoved the email from ${withEmail.length - failed} profile(s).`);
if (failed > 0) {
    console.log(`${failed} failed; re-running is safe and will retry just those.`);
    process.exit(1);
}
