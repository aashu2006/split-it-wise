# Security Policy

Split-It-Wise handles people's group expenses and who pays whom, so security reports
are taken seriously and are always welcome.

## Supported versions

Only the live app at [split-it-wise.vercel.app](https://split-it-wise.vercel.app),
built from the `main` branch, is supported. Fixes are made on `develop` and released
to `main`; older commits and self-hosted copies don't receive patches.

## Reporting a vulnerability

**Please don't open a public issue, discussion or pull request for a vulnerability.**

Report it privately through GitHub:
**[Report a vulnerability](https://github.com/aashu2006/split-it-wise/security/advisories/new)**
(the *Security* tab → *Report a vulnerability*). Only the maintainer can see it.

A useful report includes:

- what an attacker could do, and to whom (e.g. read another group's expenses)
- the steps to reproduce it, or a proof of concept
- the affected page, file or rule (for example a line in `firestore.rules`)

### What to expect

- An acknowledgement, usually within a week.
- An assessment and, if it's confirmed, a fix plan. You'll be kept updated as it
  progresses.
- Credit in the published advisory once it's fixed, unless you'd rather stay anonymous.

This is a volunteer-run project, so there's no bug bounty.

## Scope

**In scope**
- `firestore.rules`: any way to read or change data you shouldn't be able to, such
  as another group's expenses, someone else's profile, or joining through a disabled
  invite link
- Authentication and session handling
- Cross-site scripting, clickjacking or other client-side injection in the app
- Leaks of personal data (such as email addresses) beyond what the app is meant to show

**Out of scope**
- The Firebase web config (API key, project ID) being visible in the page source.
  It's public by design; access is controlled by the security rules, not the key.
- Demo mode, which runs entirely in the browser on sample data
- Copies of this code hosted by anyone else
- Denial of service, spam, or social engineering
- Reports produced only by automated scanners, without a demonstrated impact

## Safe harbour

Good-faith research is welcome. Please:

- test only against your own account and groups you created for testing
- never access, change or delete other people's data, and stop as soon as you
  realise you could
- give a reasonable chance to fix the issue before disclosing it publicly

If you follow these guidelines, no action will be taken against you for your research.
