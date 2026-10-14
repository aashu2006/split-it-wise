# Contributing to Split-It-Wise

Thanks for helping out. Bug reports, ideas and code are all welcome. This guide covers
how changes flow from a branch to production, how to run the app while you work on it,
and what a pull request needs before it can merge.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

- [Before you start](#before-you-start)
- [How changes reach production](#how-changes-reach-production)
- [Running the app for development](#running-the-app-for-development)
- [Checks](#checks)
- [Writing code that fits](#writing-code-that-fits)
- [Opening a pull request](#opening-a-pull-request)
- [Project layout](#project-layout)
- [Where help is wanted](#where-help-is-wanted)

## Before you start

- **Found a bug?** [Open a bug report](https://github.com/aashu2006/split-it-wise/issues/new?template=bug_report.yml).
- **Have an idea?** [Open a feature request](https://github.com/aashu2006/split-it-wise/issues/new?template=feature_request.yml)
  before writing code, so we can agree on the approach first.
- **Picking up an issue?** Comment on it first so two people don't build the same thing.
- **Found a security problem?** Don't open an issue. Follow [SECURITY.md](SECURITY.md).

## How changes reach production

| Branch | What it is | Deployed to |
|---|---|---|
| `main` | Production. Only updated by releases from `develop`. | [split-it-wise.vercel.app](https://split-it-wise.vercel.app) |
| `develop` | Staging. Every merged pull request lands here first. | Vercel's staging URL for `develop` |
| `feat/…`, `fix/…`, … | Your work, branched from `develop`. | A Vercel preview URL on your pull request |

1. Fork the repo (or branch, if you have write access) and branch **from `develop`**:
   ```bash
   git checkout develop && git pull
   git checkout -b fix/expense-rounding
   ```
   Prefixes: `feat/`, `fix/`, `docs/`, `test/`, `refactor/`, `chore/`.
2. Open your pull request **against `develop`**. CI runs, and Vercel posts a preview link
   where you and reviewers can try the change.
3. Once it's approved and CI is green, it's merged into `develop`.
4. The maintainer releases `develop` to `main` after checking it on staging.

Neither `main` nor `develop` accepts direct pushes; everything goes through a pull request.

## Running the app for development

You'll need **Node.js 20.19+** (`node -v` to check).

### Demo mode: no setup needed

Most changes, anything in the UI, never need a Firebase project:

```bash
npm install
npm run dev
```

With no `.env.local`, the app starts in **demo mode**. Click *Continue with Google* and
you're signed in as a sample account with two groups, expenses in all three split types,
a recorded repayment, and a former member who still owes money. That's enough to reach
every screen. You're admin of one group and not the other, so admin-only controls are
reachable both ways. Data lives in memory and resets on reload; nothing leaves your
machine. The fixtures live in [`src/lib/demo.js`](src/lib/demo.js).

### Your own Firebase project: only for auth and data changes

If your change touches sign-in, Firestore queries or the security rules, test it
against a Firebase project **of your own**. Never point a development build at the
production project.

1. In the [Firebase console](https://console.firebase.google.com), create a project
   (e.g. `split-it-wise-dev`). Analytics is optional.
2. **Authentication → Get started → Google → Enable**, pick a support email, save.
3. **Firestore Database → Create database**, in production mode.
4. **Project settings → Your apps → Web (`</>`)**, register an app, and copy its config
   into `.env.local` (see [`.env.example`](.env.example) for the variable names).
   These values aren't secrets, since they ship to every browser, but `.env.local` is
   gitignored all the same.
5. Deploy this repo's rules and indexes to your project:
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
   ```
6. `npm run dev` and sign in. To try invites, open the invite link in a private window
   and sign in with a second Google account.

`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` turns on [App Check](https://firebase.google.com/docs/app-check);
leave it out for development.

## Checks

Every pull request runs these in CI, and they all have to pass:

```bash
npm run lint        # ESLint; keep it at zero errors
npm test            # unit tests: splitting, balances, demo mode
npm run build       # production build
npm run test:rules  # security rules, against the Firestore emulator
```

`test:rules` needs Java 21+ (`java -version`), and starts and stops the emulator itself.
There's no type checker in this project, so these four are the whole safety net. Run
them before you push.

## Writing code that fits

- **Match the surrounding style.** Plain JavaScript, no state library. Comments explain
  *why*, not *what*. Data shapes are JSDoc typedefs in [`src/types/index.js`](src/types/index.js);
  reference them rather than leaving arguments undocumented.
- **Firestore access lives in `src/lib/`,** never in components. Components take props.
- **Reads are live listeners** (`subscribeTo…`). After a write there's nothing to
  refresh: the listener reports it, including your own changes.
- **Money is integer paise.** Use the helpers in `calculations.js` and never add up
  floats: `0.1 + 0.2 !== 0.3`, and small errors become wrong balances.
  **If you touch `calculations.js`, add a test.**
- **Permissions live in `firestore.rules`.** Checks in `src/lib/` run in the browser and
  can be bypassed, so they're for UX only. If you change who can do what, change the
  rules, and **add a rules test that fails without your change.**
- **Demo mode mirrors Firestore.** If you add a read or write in `src/lib/`, give it a
  demo counterpart in `demo.js` so the app keeps working without Firebase.
- **Never commit** `.env.local`, service-account keys, or anything from a real user's data.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org), as the history does:

```
fix: keep a removed member's balance in the ledger
feat: export a group's expenses to CSV
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `chore`. Keep the subject
under ~70 characters and use the body to explain why.

## Opening a pull request

- Target **`develop`**, and fill in the template.
- Keep it focused: one change per pull request is easier to review and to revert.
- For UI changes, add before/after screenshots (light and dark mode if it matters).
- Say how you tested it: demo mode, your own Firebase project, or both.
- A maintainer reviews every pull request; CI must be green before merge.

By contributing, you agree that your work is licensed under the project's
[MIT License](LICENSE).

## Project layout

```
src/
├── app/                    Pages (App Router), metadata, icons
│   ├── page.jsx            Landing page / your groups
│   ├── group/[groupId]/    Group dashboard
│   └── join/[groupId]/     Invite link handler
├── components/             UI components (presentational)
├── context/                Auth and toast providers
├── lib/                    All Firestore access and business logic
│   ├── firebase.js         SDK setup
│   ├── groups.js           Create, join, rename, remove members, delete
│   ├── expenses.js         Add, edit, delete and listen to expenses
│   ├── settlements.js      Record and undo repayments
│   ├── user.js             Profiles and UPI IDs
│   ├── calculations.js     Splitting, balances, debt simplification
│   ├── upi.js              upi:// payment links
│   └── demo.js             In-memory stand-in for Firestore (demo mode)
└── types/                  Data shapes, as JSDoc typedefs

tests/rules/                Security rules tests (Firestore emulator)
scripts/                    One-off admin scripts, maintainer only
firestore.rules             Server-side permissions: the real security boundary
firestore.indexes.json      Composite indexes
```

## Where help is wanted

- **Component tests.** Only the maths, demo mode and security rules are tested today.
- **`next/image` for avatars** in `MembersList`. Needs a `remotePatterns` entry for
  `googleusercontent.com`, and clears the last lint warning.
- **Expense categories and filtering.**
- **Export a group's history to CSV.**
- **Multiple currencies.** INR is hardcoded today.

Check the [issues](https://github.com/aashu2006/split-it-wise/issues) for anything
already in progress.
