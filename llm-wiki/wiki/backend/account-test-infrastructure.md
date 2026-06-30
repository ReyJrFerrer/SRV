---
tags: [backend, account, testing, quality-assurance]
date: 2026-06-28
related:
  - [[Authentication Flow]]
  - [[Unit Test Creation Checklist]]
  - [[Booking Test Infrastructure]]
  - [[Functions Lint Report]]
sources:
  - functions/test/account.test.js
  - functions/test/mocha.js
  - functions/test/helpers/seed.js
  - functions/src/account.js
---

# Account Test Infrastructure

The fourth integration test suite for the SRV backend, following the [[Unit Test Creation Checklist]]. Exercises all 11 actions of the consolidated `accountAction` Cloud Function against a real Firestore + Auth + Storage emulator, covering user profile creation, authentication tokens, phone validation, role switching, media uploads, and account status management.

## Test Stack

Same stack as [[Booking Test Infrastructure]]:

| Layer | Tool | Purpose |
|---|---|---|
| Runner | Mocha 11 | `describe` / `it` BDD |
| Firebase SDK | `firebase-functions-test` 3.4 | `test.wrap()` to invoke `onCall` handlers |
| Emulator | Firestore + Auth + Storage (Firebase Emulator Suite) | Real persistence; profile picture upload tests also exercise Storage emulator |
| Assertion | `node:assert/strict` | `assert.equal`, `assert.rejects(promise, /regex/i)` |
| Env loader | `dotenv` | Reads `functions/.env.test` |

Run with: `npm test` (after `firebase emulators:start`).

## Test Layout

```
functions/test/
├── mocha.js                    # Shared bootstrap: env, admin init, clearCollections, log routing
├── helpers/
│   └── seed.js                 # Seeders shared across all test suites
└── account.test.js             # 11 actions × ~4-7 cases per action (49 total)
```

### Infrastructure Changes

- `mocha.js`: Added `pending_users` to `COLLECTIONS_TO_CLEAR` so tests that write to this collection don't leak state
- `mocha.js`: Added `FIREBASE_AUTH_EMULATOR_HOST` env var so `admin.auth().createCustomToken()` works against the Auth emulator (required by `exchangeForFirebaseToken` tests)

### Seeders Used

| Seeder | Usage |
|---|---|
| `seedUser(opts)` | Creates user docs for auth context and profile testing |
| `uniqueId()` | Generates unique principal IDs |

## Inconsistency Fixed: `data` → `payload` in `authCanisterService.ts`

During login testing, a `data`/`payload` inconsistency was discovered. The handler at `functions/src/account.js:589` destructures `payload` from `request.data`:

```javascript
const {action, payload} = request.data || {};
```

The primary frontend caller (`identityBridge.ts`) correctly sends `payload` as the key for all action data. However, `authCanisterService.ts:updateUserActiveStatus` was sending `data` instead, causing `payload` to be `undefined` in the handler. The `updateUserActiveStatus` action would fail silently with `"isActive must be a boolean value"` because the destructured payload was `undefined`.

**Fix**: Changed `data: { isActive }` to `payload: { isActive }` in `src/frontend/src/services/authCanisterService.ts:267` to match the `identityBridge.ts` convention.

Test payloads were also updated from `data:` to `payload:` to match the handler destructuring.

## Coverage Matrix

### Group A — Authentication (5 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 1 | `exchangeForFirebaseToken` | 5: happy new user (custom token + `hasProfile=false`), stores email in `pending_users` for new zkLogin users, existing user → `hasProfile=true`, rejects missing principal, rejects locked account | 🟢 strong |

### Group B — Profile CRUD (15 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 2 | `validatePhoneNumber` | 4: happy (valid unused), unauth, invalid format, already taken | 🟢 strong |
| 3 | `createProfile` | 7: happy (+ reputation init), unauth, invalid name (too short), invalid phone, phone taken, already exists, picks up email from `pending_users` | 🟢 strong |
| 4 | `getProfile` | 4: own profile (defaults to auth uid), other user (by `userId`), unauth, not found | 🟢 strong |
| 5 | `updateProfile` | 4: update name, unauth, invalid name, not found | 🟢 strong |

### Group C — Role & Status (12 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 6 | `switchUserRole` | 5: Client→ServiceProvider, ServiceProvider→Client, unauth, not found, admin rejected | 🟢 strong |
| 7 | `getAllServiceProviders` | 3: returns active providers, unauth, empty results | 🟢 strong |
| 8 | `getAllUsers` | 3: returns all users, unauth, empty results | 🟢 strong |
| 9 | `updateUserActiveStatus` | 5: set active true, set active false, unauth, not boolean, not found | 🟢 strong |

### Group D — Media (9 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 10 | `uploadProfilePicture` | 5: happy (creates media doc, updates profile), replaces existing picture, unauth, missing required fields, not found | 🟢 strong |
| 11 | `removeProfilePicture` | 4: happy (deletes media doc, clears profile), unauth, not found, no picture to remove | 🟢 strong |

## Coverage Statistics

| Metric | Value |
|---|---|
| **Total cases** | **49** |
| Actions covered | 11 / 11 |
| Auth paths (unauth / wrong-role / stranger) | ~11 |
| Validation errors | ~10 |
| Doc-not-found paths | ~6 |
| Side effect assertions | reputation init (`createProfile`), email cleanup from `pending_users` (`createProfile`), media doc creation/deletion (`uploadProfilePicture`, `removeProfilePicture`), `lastActivity`/`updatedAt` timestamp updates |
| Boundary values | name length (2–50), phone length (10–15), `isActive` type check |
| Lint clean | yes |
| **Tests passing** | **49 / 49** |

## Key Test Scenarios

### `exchangeForFirebaseToken` — Custom token + email storage
The happy path verifies that `admin.auth().createCustomToken()` returns a valid token string, and that for new users with an email, the email is persisted to a `pending_users` doc for `createProfile` to pick up later.

### `createProfile` — Full user creation pipeline
Verifies all side effects: profile doc written to `users/{uid}` with correct fields, reputation initialized via `reputations/{uid}` doc, and `pending_users` doc cleaned up after successful profile creation when email was pre-stored.

### `uploadProfilePicture` / `removeProfilePicture` — Media lifecycle
Tests the full media lifecycle: creating a media doc via `uploadMediaInternal` (which also exercises the Storage emulator), linking it to the user's profile picture, and then removing it via `deleteMediaInternal`. The `removeProfilePicture` test creates the media doc in Firestore directly (since `deleteMediaInternal` checks for media doc existence) and verifies the profile picture field is cleared.

## Test Conventions

Same as [[Booking Test Infrastructure]] with these additions:

- **Auth emulator integration**: Tests for `exchangeForFirebaseToken` require the Auth emulator; `mocha.js` now sets `FIREBASE_AUTH_EMULATOR_HOST` automatically
- **Media doc seeding**: `removeProfilePicture` tests create a `media/{mediaId}` doc inline since `deleteMediaInternal` requires it to exist (Storage errors are swallowed, but the existence check is not)
- **No-auth actions**: `exchangeForFirebaseToken` is the only action that doesn't require authentication — tests call it without an `auth` context
- **Side-effect chaining**: `createProfile` happy path verifies that reputation is initialized as a side effect of profile creation
