# AutoMitra: Test Users and Credentials

FOR LOCAL AND STAGING USE ONLY. These are dummy accounts with fake emails on the reserved `.test` domain. Never create them in a production project, and never reuse these passwords anywhere else.

## 1. Test accounts

| # | Role | Display name | Email | Password | Language | Sign-in route | Lands on |
|---|---|---|---|---|---|---|---|
| 1 | Family Proxy | Sneha Test | `proxy1@automitra.test` | `ProxyOne#2026-Test` | en | `/login?role=proxy` | `/console` |
| 2 | Family Proxy | Meera Test | `proxy2@automitra.test` | `ProxyTwo#2026-Test` | mr | `/login?role=proxy` | `/console` |
| 3 | Driver | Ramesh Test | `driver1@automitra.test` | `DriverOne#2026-Test` | hi | `/login?role=driver` | `/driver` |
| 4 | Driver | Suresh Test | `driver2@automitra.test` | `DriverTwo#2026-Test` | mr | `/login?role=driver` | `/driver` |

Commuter: no account and no credentials. Open `/` or `/q/anything` in a private window with no sign-in. That is the correct behavior.

Google OAuth: there is no fixed test credential. Test it with your own Google account, then delete that user from Supabase afterwards (Authentication, Users).

All four passwords satisfy the 10-character minimum in the auth spec.

## 2. Seed the users

Save as `scripts/seed-test-users.ts`. It creates the users with email already confirmed (so you skip the confirmation email), writes each user's role into `profiles`, and is safe to run more than once.

```bash
ALLOW_TEST_SEED=true npx tsx scripts/seed-test-users.ts
```

Add to `package.json` scripts for convenience:

```json
{ "scripts": { "seed:test": "ALLOW_TEST_SEED=true tsx scripts/seed-test-users.ts" } }
```

## 3. Remove the users

Save as `scripts/cleanup-test-users.ts`. Profiles are removed automatically because `profiles.id` cascades from `auth.users`.

```bash
ALLOW_TEST_SEED=true npx tsx scripts/cleanup-test-users.ts
```

## 4. Environment variables for Playwright

Add these to `.env.test` (kept out of git):

```bash
TEST_PROXY1_EMAIL=proxy1@automitra.test
TEST_PROXY1_PASSWORD=ProxyOne#2026-Test
TEST_PROXY2_EMAIL=proxy2@automitra.test
TEST_PROXY2_PASSWORD=ProxyTwo#2026-Test
TEST_DRIVER1_EMAIL=driver1@automitra.test
TEST_DRIVER1_PASSWORD=DriverOne#2026-Test
TEST_DRIVER2_EMAIL=driver2@automitra.test
TEST_DRIVER2_PASSWORD=DriverTwo#2026-Test
```

Add `.env.test` to `.gitignore`.

## 5. Test matrix

| ID | Account | Action | Expected result |
|---|---|---|---|
| T1 | None (commuter) | Open `/` in a private window | Blank first-visit view, no login prompt |
| T2 | None (commuter) | Open `/q/anything` | Placeholder page, no login prompt |
| T3 | None | Open `/driver` | Redirected to `/login?role=driver` |
| T4 | None | Open `/console` | Redirected to `/login?role=proxy` |
| T5 | proxy1 | Sign in at `/login?role=proxy` | Lands on `/console`, empty state "Nothing here yet" |
| T6 | driver1 | Sign in at `/login?role=driver` | Lands on `/driver`, empty state "Nothing here yet" |
| T7 | proxy1 | Open `/driver` | 403 page, no redirect loop |
| T8 | driver1 | Open `/console` | 403 page, no redirect loop |
| T9 | proxy1 | Sign in with a wrong password | Generic error, same text as for an unknown email |
| T10 | Unknown email | Sign in | Same generic error as T9 |
| T11 | proxy1 | Sign out | Session cleared; `/console` redirects to login |
| T12 | proxy1 | Attempt to change own role via a direct API call | Rejected by the RLS policy; role unchanged |
| T13 | proxy1 and proxy2 | Each reads `profiles` | Each sees only their own row |
| T14 | driver1 | Try 6 wrong passwords quickly | Rate limit message after the 5th attempt |
| T15 | proxy2 (language mr) | Sign in | Interface shows Marathi |
| T16 | driver1 (language hi) | Sign in | Interface shows Hindi |
| T17 | Own Google account | Sign up as a driver with Google OAuth | Prompted for role once, then lands on `/driver` |

## 6. Notes

- If sign-in fails with "email not confirmed", the user was created without `email_confirm: true`. Re-run the seed script; it repairs existing users.
- If a seeded user lands on the wrong page, check that its `profiles.role` value matches the table in section 1.
- If sign-in succeeds but `/console` shows 403 for a proxy, the `profiles` row is missing. Re-run the seed script.
- Rotate or delete these accounts before any demo that exposes the staging URL publicly.
