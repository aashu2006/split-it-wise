# Split-It-Wise

A simple, real-world **expense splitting web app** for students and friends.
Inspired by Splitwise, built with a focus on **clarity, speed, and actual usability**.

**Live demo:** https://split-it-wise.vercel.app

Contributions are welcome, see [Contributing](#contributing) below. If you're new to
open source, this is a friendly place to start.

---

## Features

### Authentication
- Google Sign-In via Firebase Authentication

### Groups
- Create a group instantly
- Invite friends with a shareable link (works well over WhatsApp)
- Join with one click
- Admin controls: rename the group, remove members, delete the group
- Turn the invite link off once everyone's in, since a forwarded link otherwise
  works forever

### Expenses
- Amounts in INR (₹)
- Pick who paid
- Three ways to split:
  - **Equal**: pick who's included, the app divides it up
  - **Exact**: type what each person owes
  - **Percentage**: type each person's share as a %
- Edit or delete an expense (creator or admin). An expense that involves someone who
  has since left can't be edited, only deleted, so their share is never silently dropped
- Changes show up live on everyone's screen, no reload needed

### Balances
- Per-person balance: **"Is owed ₹X"** or **"Owes ₹X"**, colour-coded green and red
- All money maths runs in integer paise, so balances always sum to exactly zero, with
  no drift from rounding ₹100 three ways
- Anyone removed from a group while still owing money stays visible in the ledger,
  tagged *"left group"*, so their debt is never silently lost

### Settling up
- Balances are simplified into actual payments — **"Rahul pays Akshat ₹300"** — rather
  than leaving everyone to work out the transfers themselves. A group of *n* people
  never needs more than *n-1* payments
- Record a repayment in full or in part, and undo one recorded by mistake
- Add your UPI ID and others get a one-tap **upi://** link that opens GPay, PhonePe or
  Paytm with the amount prefilled (phone-first: desktop has nothing to handle the link)
- Repayments are stored separately from expenses, so paying a friend back never inflates
  the group's spending totals

### Security
- Firestore security rules enforce every permission server-side: group membership,
  admin-only actions, and expense ownership
- Profiles hold only what other members need to see (name, photo, UPI ID). Your email
  stays with Google sign-in and is never stored where others can read it

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | JavaScript (ES modules) |
| UI | React 19, Tailwind CSS v4 |
| Auth | Firebase Authentication (Google) |
| Database | Cloud Firestore |
| Tests | Vitest |
| Hosting | Vercel |

Everything runs client-side and talks to Firestore directly. There's no backend server
or API layer, so security lives in `firestore.rules` rather than in the app code.

---

## Running it locally

### Just changing the UI? Skip Firebase entirely

```bash
git clone https://github.com/aashu2006/split-it-wise.git
cd split-it-wise
npm install
npm run dev
```

With no `.env.local`, the app starts in **demo mode**. Click *Continue with Google* and
you're signed in as a sample account with two groups, six expenses across all three
split types, a recorded settlement and a former member who still owes money — enough to
reach every screen and almost every UI branch. Data lives in memory, so a reload puts it
back to the seed and nothing leaves your machine.

You're admin of one group and not the other, so the admin-only controls are reachable
both ways. The fixtures live in [`src/lib/demo.js`](src/lib/demo.js).

Demo mode is only ever active when the Firebase config is absent, so it can't shadow
real data. For anything touching auth, Firestore or the security rules, do the full
setup below.

### Full setup

You'll need your **own Firebase project** to develop against. It's free and takes about
five minutes.

### 1. Prerequisites

- **Node.js 20.19+** (check with `node -v`)
- A Google account

### 2. Get the code

```bash
git clone https://github.com/aashu2006/split-it-wise.git
cd split-it-wise
npm install
```

### 3. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and click
   **Add project**. Name it anything you like, `split-it-wise-dev` works.
2. Google Analytics is optional; you can turn it off.

### 4. Turn on Google sign-in

1. In the sidebar, go to **Build → Authentication → Get started**
2. Select **Google** under Sign-in method, toggle it **Enable**
3. Pick a support email, then **Save**

`localhost` is authorised by default, so nothing else to configure for local dev.

### 5. Create the database

1. Go to **Build → Firestore Database → Create database**
2. Choose a location near you
3. Start in **production mode**. This repo ships its own rules and you'll deploy them
   in step 7.

### 6. Get your config keys

1. In **Project settings** (gear icon), scroll to **Your apps**
2. Click the web icon (`</>`), give it a nickname, and register the app
3. You'll see a `firebaseConfig` block. Keep it open.

Create a file called `.env.local` in the project root and copy the values across:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

`.env.local` is gitignored, so never commit it.

There's one optional extra:

```bash
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6L...
```

Set it to turn on [App Check](https://firebase.google.com/docs/app-check), which
stops anyone who lifts the config above from pointing the SDK at your project and
running up its quota. Leave it out and the app works exactly as before, so you
don't need one to develop locally. In production it's worth having: register the
site under **App Check** in the Firebase console with reCAPTCHA v3, then switch
on enforcement for Cloud Firestore — the key alone doesn't turn anything away.

> These keys are **not secrets**. Anything prefixed `NEXT_PUBLIC_` is compiled into the
> browser bundle and is visible to anyone using the site. That's normal for Firebase web
> apps, since a web API key just identifies the project. The security comes entirely from
> the Firestore rules, which is why step 7 matters.

### 7. Deploy the security rules

Without this, the app can't read or write anything.

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

This pushes `firestore.rules` (permissions) and `firestore.indexes.json` (the composite
index the expense list query needs).

### 8. Run it

```bash
npm run dev
```

Open http://localhost:3000 and sign in with Google.

To try the invite flow, open the invite link in a private window and sign in with a
second Google account.

---

## Project layout

```
src/
├── app/                    Pages (App Router)
│   ├── page.jsx            Home, your groups
│   ├── group/[groupId]/    Group dashboard
│   └── join/[groupId]/     Invite link handler
├── components/             UI components
├── context/                AuthContext: Google sign-in, current user
├── lib/                    All Firestore access + business logic
│   ├── firebase.js         SDK setup
│   ├── groups.js           Create, join, rename, remove members, delete
│   ├── expenses.js         Add, edit, delete, and listen to expenses
│   ├── settlements.js      Record and undo repayments
│   ├── user.js             Profiles and UPI IDs
│   ├── calculations.js     Splitting, balances, debt simplification
│   ├── upi.js              upi:// payment links
│   └── demo.js             In-memory stand-in for Firestore (demo mode)
└── types/                  Shared data shapes, as JSDoc typedefs

scripts/                    One-off admin scripts, run by hand with a service-account key

firestore.rules             Server-side permissions, the real security
firestore.indexes.json      Composite indexes
```

Rules of thumb:
- Firestore calls belong in `src/lib/`, not in components
- Reads are live listeners (`subscribeTo...` in `src/lib/`), so after a write there's
  nothing to refresh: the listener reports it, including your own changes
- Components stay presentational and take props
- Any change to permissions needs a matching change in `firestore.rules`

---

## Tests

```bash
npm test
```

Covers the splitting and balance maths in `src/lib/calculations.test.js`, the part where
a bug costs people real money, plus demo mode and its live listeners in
`src/lib/demo.test.js`. **If you touch `calculations.js`, add a test.**

There's no compiler to catch mistakes here, so the linter, the tests and a build are the
whole safety net. Worth running before you open a PR:

```bash
npm run lint        # ESLint: unused vars, hook deps, Next.js rules
npm run build       # production build
```

The linter currently reports one warning, the `<img>` avatar tracked in the roadmap
below. Keep it at zero *errors*.

---

## Roadmap

Open for anyone to pick up. Comment on an issue (or open one) before starting so we don't
duplicate work.

**Most wanted**

- [ ] **Security rules tests.** `firestore.rules` is the real security boundary, but it's
      only been tested by hand against the emulator. A suite using
      `@firebase/rules-unit-testing` that runs in CI would catch a loosened rule.
- [ ] **Component tests.** Only the maths and demo mode are covered today.

**Nice to have**

- [ ] Expense categories and filtering
- [ ] Export a group's history to CSV
- [ ] Multiple currencies (INR is hardcoded)

**Housekeeping**

- [ ] Swap the `<img>` avatar in `MembersList` for `next/image` (needs a
      `remotePatterns` entry for `googleusercontent.com`)
- [ ] One-time cleanup of expenses orphaned by groups deleted before cascade delete existed

---

## Contributing

1. **Fork** the repo and create a branch off `main`:
   ```bash
   git checkout -b feat/settle-up
   ```
2. **Make your change.** Match the surrounding style. The codebase is plain JavaScript
   with no state library, and comments explain *why* rather than *what*. Data shapes
   live as JSDoc typedefs in `src/types/index.js` — reference them from JSDoc rather
   than leaving a function's arguments undocumented.
3. **Check it works:**
   ```bash
   npm test
   npm run lint
   npm run build
   ```
4. **Open a pull request** describing what changed and how you tested it. Screenshots help
   for UI changes.

**Good to know**

- If your change touches permissions, update `firestore.rules` too. The checks in
  `src/lib/` run in the browser and can be bypassed, so they're UX, not security.
- Money is handled in integer paise (see `toPaise`/`toRupees` in `calculations.js`).
  Never sum floats, because `0.1 + 0.2 !== 0.3` and small errors compound into wrong
  balances.
- Don't commit `.env.local` or any service account key

Bug reports and feature ideas are just as welcome as code, so open an issue.

---

## License

[MIT](LICENSE), so it's free to use, modify and distribute, including commercially. Just
keep the copyright notice. By contributing, you agree your work is licensed the same way.

---

Author: Akshat Patil & Community ❤️
