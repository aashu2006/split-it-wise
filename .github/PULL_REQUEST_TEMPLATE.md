<!-- Pull requests target `develop`, not `main`. See CONTRIBUTING.md. -->

## What and why

<!-- What does this change, and why? Link the issue it closes: "Closes #12". -->

## How it was tested

<!-- Demo mode, your own Firebase project, the Vercel preview… and what you checked. -->

## Screenshots

<!-- For UI changes: before and after, light and dark mode if relevant. Delete if not a UI change. -->

## Checklist

- [ ] Targets `develop`
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] Changed the UI? `npm run test:e2e` passes, and specs are updated if behaviour changed
- [ ] Changed `firestore.rules`? Added a test in `tests/rules/` that fails without the change
- [ ] Changed `calculations.js`? Added a unit test
- [ ] Added a read or write in `src/lib/`? Gave it a demo-mode counterpart in `demo.js`
- [ ] No secrets, `.env.local` or real user data committed
