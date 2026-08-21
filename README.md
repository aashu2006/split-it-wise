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
- Delete an expense (creator or admin)

### Balances
- Per-person balance: **"₹X lena hai"** (you're owed) or **"₹X dena hai"** (you owe)
- All money maths runs in integer paise, so balances always sum to exactly zero, with
  no drift from rounding ₹100 three ways
- Anyone removed from a group while still owing money stays visible in the ledger,
  tagged *"left group"*, so their debt is never silently lost

### Security
- Firestore security rules enforce every permission server-side: group membership,
  admin-only actions, and expense ownership

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
│   ├── expenses.js         Add, fetch, delete expenses
│   ├── user.js             Profile lookups
│   └── calculations.js     Splitting + balance maths
└── types/                  Shared data shapes, as JSDoc typedefs

firestore.rules             Server-side permissions, the real security
firestore.indexes.json      Composite indexes
```

Rules of thumb:
- Firestore calls belong in `src/lib/`, not in components
- Components stay presentational and take props
- Any change to permissions needs a matching change in `firestore.rules`

---

## Tests

```bash
npm test
```

Covers the splitting and balance maths in `src/lib/calculations.test.js`, the part where
a bug costs people real money. **If you touch `calculations.js`, add a test.**

There's no compiler to catch mistakes here, so the tests and a build are the whole
safety net. Worth running before you open a PR:

```bash
npm run build       # production build
```

---

## Roadmap

Open for anyone to pick up. Comment on an issue (or open one) before starting so we don't
duplicate work.

**Most wanted**

- [ ] **Settle up**: record that someone paid you back. Right now balances only ever
      grow, and there's no way to clear a debt except adding a balancing expense by hand.
      This is the biggest gap between this and real Splitwise.
- [ ] **Who owes whom**: balances show each person's net position, so users still have to
      work out the actual transfers. Simplify it into "Rahul pays Akshat ₹300".
- [ ] **Edit an expense**, since currently you can only add and delete.

**Nice to have**

- [ ] Real-time updates. The app refetches after every change instead of using Firestore
      listeners.
- [ ] Expense categories and filtering
- [ ] Export a group's history to CSV
- [ ] Multiple currencies (INR is hardcoded)
- [ ] Dark mode

**Housekeeping**

- [ ] Add ESLint, there's no linter configured
- [ ] Component tests, only the maths is covered today
- [ ] Member emails are fetched to every group member's browser (needed by the current
      user lookup). Splitting public profile fields from private ones would fix it.
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
