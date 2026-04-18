# SRV Workspace - Firebase Functions Migration Guide

## Project Overview

This workspace contains a Firebase Functions project for an SRV (Service) platform with approximately **150 callable HTTPS functions**, **5 scheduled functions**, and **1 Firestore trigger**. The project integrates with Xendit payments, ICP (Internet Computer) identity/reputation, OneSignal push notifications, and SMTP email.

**Current SDK:** `firebase-functions@6.0.1` (mixed v1/v2 usage)
**Target SDK:** Firebase Functions v2 for improved performance, stability, and robustness

---

## Critical Issues (Must Fix Before Deployment)

### 2. Double Firebase Admin Initialization

- `firebase-admin.js` has its own initialization check
- `index.js` also calls `admin.initializeApp()`
- This can cause undefined behavior

**Resolution:** Consolidate to a single admin initialization pattern.

---

## Project Structure

```
functions/
├── index.js                    # Main entry point (exports ~150 functions)
├── firebase-admin.js           # Firebase Admin initialization
├── sendContactEmail.js         # Contact form email handler
├── package.json                # Dependencies and scripts
├── .env                        # Environment variables (contains secrets - DO NOT COMMIT)
├── src/                        # Main source code (18 files, ~13,000 lines)
│   ├── account.js              # User account management
│   ├── admin.js                # Admin functions (complex, 1141 lines)
│   ├── adminAuth.js            # Admin authentication
│   ├── auth.js                 # ICP Identity Bridge
│   ├── booking.js              # Booking management (complex, 2553 lines)
│   ├── chat.js                 # Chat notifications (Firestore trigger)
│   ├── commission-utils.js     # Commission utilities
│   ├── commission.js           # Commission calculations
│   ├── feedback.js             # Feedback management
│   ├── media.js                # Media management
│   ├── notification.js         # Notifications
│   ├── reputation.js           # Reputation system
│   ├── review.js               # Review management
│   ├── service.js              # Service management
│   ├── wallet.js               # Wallet operations
│   └── utils/
│       └── reputationMath.js   # Reputation calculation math
└── utils/
    └── canisterConfig.js       # ICP canister configuration
```

---

## Function Inventory

### HTTPS Callable Functions (`.https.onCall`)

| File                  | Count | Functions                                                                                       |
| --------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `src/service.js`      | 25    | createService, getService, getServicesByProvider, updateService, searchServicesByLocation, etc. |
| `src/booking.js`      | 16    | createBooking, acceptBooking, completeBooking, cancelBooking, getBooking, etc.                  |
| `src/admin.js`        | 20+   | getUserRole, listUserRoles, getSystemStats, lockUserAccount, etc.                               |
| `src/review.js`       | 18    | submitReview, getReview, updateReview, calculateProviderRating, etc.                            |
| `src/notification.js` | 14    | createNotification, getUserNotifications, markNotificationAsRead, etc.                          |
| `src/media.js`        | 13    | uploadMedia, getMediaItem, deleteMedia, validateMediaItems, etc.                                |
| `src/account.js`      | 8+    | createProfile, getProfile, updateProfile, switchUserRole, etc.                                  |
| `src/wallet.js`       | 6     | getBalance, creditBalance, debitBalance, transferFunds, etc.                                    |
| `src/feedback.js`     | 9+    | submitFeedback, getAllFeedback, getMyReports, etc.                                              |
| `src/reputation.js`   | 5     | initializeReputation, updateUserReputation, processReviewForReputation, etc.                    |
| `src/commission.js`   | 3     | calculateCommission, getCategoryTier, getCommissionBreakdown                                    |
| `src/auth.js`         | 1     | signInWithInternetIdentity                                                                      |
| `sendContactEmail.js` | 1     | sendContactEmail                                                                                |

### Scheduled Functions (v2 scheduler)

| Function                          | Schedule       | File                  | Purpose                             |
| --------------------------------- | -------------- | --------------------- | ----------------------------------- |
| `cancelMissedBookings`            | Every minute   | `src/booking.js`      | Cancel bookings past scheduled time |
| `sendServiceReminders`            | Every 10 min   | `src/booking.js`      | Send 30-min reminders               |
| `autoReactivateSuspendedAccounts` | Hourly         | `src/admin.js`        | Reactivate suspended accounts       |
| `cleanupExpiredNotifications`     | Daily midnight | `src/notification.js` | Delete expired notifications        |
| `cleanupNotificationFrequency`    | Every 6 hours  | `src/notification.js` | Clean old frequency entries         |

### Firestore Triggers (v2)

| Function           | Trigger                         | File          | Purpose                                   |
| ------------------ | ------------------------------- | ------------- | ----------------------------------------- |
| `onMessageCreated` | `messages/{messageId}` onCreate | `src/chat.js` | Create notification for new chat messages |

### HTTP Request Functions (`.https.onRequest`)

| Function          | File           | Purpose                              |
| ----------------- | -------------- | ------------------------------------ |
| `getBookingsData` | `src/admin.js` | Admin HTTP endpoint for booking data |

---

## SDK Migration Guide

### Current State

The codebase uses a **mixed v1/v2 pattern**:

- Most HTTPS functions use v1 SDK: `functions.https.onCall()`
- Scheduled functions already use v2: `onSchedule` from `firebase-functions/v2/scheduler`
- Chat trigger uses v2: `onDocumentCreated` from `firebase-functions/v2/firestore`

### Migration Target: Consistent v2 SDK

All functions should use v2 SDK for:

- **90% cold start reduction**
- **Unlimited scaling** (vs. 1000 instance limit in v1)
- **Native error handling improvements**
- **Better TypeScript support**
- **Access to v2-only features** (minimum instances, region targeting)

---

## v2 SDK Import Paths

| Feature           | v1 Import                             | v2 Import                                           |
| ----------------- | ------------------------------------- | --------------------------------------------------- |
| HTTPS Callable    | `require("firebase-functions").https` | `require("firebase-functions/v2/https")`            |
| HttpsError        | `functions.https.HttpsError`          | `require("firebase-functions/v2/https").HttpsError` |
| HTTP Request      | `functions.https.onRequest()`         | `require("firebase-functions/v2/https")`            |
| Firestore Trigger | `functions.firestore`                 | `require("firebase-functions/v2/firestore")`        |
| Scheduler         | `functions.pubsub`                    | `require("firebase-functions/v2/scheduler")`        |
| Set Options       | `functions.config()`                  | `require("firebase-functions/v2/core")`             |

---

## Pattern Transformations

### HTTPS Callable Function

**Before (v1):**

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.createService = functions.https.onCall(async (data, context) => {
  const uid = context.auth.uid;
  const isAdmin = context.auth.token.isAdmin || false;

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // implementation
});
```

**After (v2):**

```javascript
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

exports.createService = onCall(async (req) => {
  const { data, auth } = req;
  const uid = auth.uid;
  const isAdmin = auth.token.isAdmin || false;

  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // implementation
});
```

### Scheduled Function

**Before (v1 with pubsub):**

```javascript
const functions = require("firebase-functions");

exports.cancelMissedBookings = functions.pubsub
  .schedule("every minute")
  .onRun(async (context) => {
    // implementation
  });
```

**After (v2 scheduler):**

```javascript
const { onSchedule } = require("firebase-functions/v2/scheduler");

exports.cancelMissedBookings = onSchedule("every minute", async (req) => {
  // implementation
});
```

### Firestore Trigger

**Before (v1):**

```javascript
const functions = require("firebase-functions");

exports.onMessageCreated = functions.firestore
  .document("messages/{messageId}")
  .onCreate((snap, context) => {
    const data = snap.data();
    const messageId = context.params.messageId;
    // implementation
  });
```

**After (v2):**

```javascript
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

exports.onMessageCreated = onDocumentCreated(
  "messages/{messageId}",
  async (event) => {
    const data = event.data.data();
    const messageId = event.params.messageId;
    // implementation
  },
);
```

### Helper Function Pattern

Auth info extraction helper (used across many functions):

**Current in index.js:**

```javascript
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}
```

**v2 adaptation:**

```javascript
function getAuthInfo(req) {
  const auth = req.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}
```

---

## Dependency Versions

### Current (from package.json)

```json
{
  "firebase": "^12.12.0",
  "firebase-admin": "^12.7.0",
  "firebase-functions": "^6.0.1"
}
```

### Recommended Targets

| Package              | Target Version               | Notes                  |
| -------------------- | ---------------------------- | ---------------------- |
| `firebase-functions` | `^6.3.0` (v1) or `^4.x` (v2) | See SDK Decision below |
| `firebase-admin`     | `^13.0.0`                    | Latest stable          |
| `firebase`           | `^13.0.0`                    | Client SDK             |

### SDK Decision Required

**Option A: Stay on v1 SDK (Firebase Functions v1)**

- Pros: Minimal code changes, most compatible
- Cons: 1000 max instances, slower cold starts
- Command: `npm install firebase-functions@^6.3.0 firebase-admin@^13.0.0`

**Option B: Migrate to v2 SDK (Firebase Functions v2)** (Recommended)

- Pros: 90% cold start reduction, unlimited scaling, min instances
- Cons: Breaking changes to function signatures
- Command: `npm install firebase-functions@^4.9.0 firebase-admin@^13.0.0`

---

## Environment and Secrets Management

### Current Issue

The `.env` file contains live credentials and is NOT in `.gitignore`.

### Required Changes

1. **Add `.env` to `.gitignore`** (if not already)
2. **Move secrets to Firebase Secret Manager:**
   ```bash
   firebase functions:secrets:set XENDIT_API_KEY
   firebase functions:secrets:set SMTP_PASSWORD
   # etc.
   ```
3. **Access secrets in v2 functions:**

   ```javascript
   const { defineSecret } = require("firebase-functions/params");
   const xenditApiKey = defineSecret("XENDIT_API_KEY");

   exports.sendPayment = onCall(async (req) => {
     const apiKey = xenditApiKey.value();
     // use apiKey
   });
   ```

### Secrets Currently in .env

- Xendit API keys (development)
- ICP canister IDs (auth and reputation)
- OneSignal configuration
- SMTP settings
- Firebase Realtime Database URL

---

## Admin Initialization Pattern

### Current Problem

Both `firebase-admin.js` and `index.js` initialize Firebase Admin.

### Recommended Single-Instance Pattern

Create `src/lib/admin.js`:

```javascript
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const functions = require("firebase-functions");
  if (functions.config().emulator?.firestore) {
    admin.initializeApp({ projectId: "demo-project" });
  } else {
    admin.initializeApp();
  }
}

module.exports = admin;
```

Then import from all modules:

```javascript
const admin = require("./lib/admin");
```

---

## Testing Procedures

### Local Development

```bash
cd functions
npm install
firebase emulators:start --only functions
```

### Test Callable Function

```bash
firebase functions:shell
> createService({data: {...}}, {auth: {uid: "123", token: {isAdmin: false}}})
```

### Deploy to Staging

```bash
firebase deploy --only functions --project YOUR_STAGING_PROJECT
```

### Deploy to Production

```bash
firebase deploy --only functions --project YOUR_PRODUCTION_PROJECT
```

### Run Lint

```bash
cd functions
npm run lint
```

---

## Migration Execution Order

Due to complexity (~150 functions), migrate file-by-file in this order:

1. **`src/chat.js`** - Firestore trigger (reference implementation)
2. **`src/auth.js`** - Simple, minimal dependencies
3. **`src/commission-utils.js`** - Utility module (no function exports)
4. **`src/commission.js`** - Depends on commission-utils
5. **`src/reputation.js`** - Simple dependencies
6. **`sendContactEmail.js`** - Simple email function
7. **`src/review.js`** - Medium complexity
8. **`src/feedback.js`** - Medium complexity
9. **`src/wallet.js`** - Medium with transactions
10. **`src/account.js`** - Medium with file uploads
11. **`src/media.js`** - Medium with file operations
12. **`src/notification.js`** - Complex with scheduled cleanup
13. **`src/service.js`** - Complex, many functions
14. **`src/booking.js`** - Most complex, has scheduled functions
15. **`src/admin.js`** - Complex, has scheduled + HTTP functions
16. **`src/adminAuth.js`** - Depends on admin.js

---

## Per-File Migration Checklist

For each file, verify:

- [ ] All imports updated to v2 paths
- [ ] `context.auth` changed to `req.auth`
- [ ] `context.auth.token.isAdmin` changed to `req.auth.token.isAdmin`
- [ ] `functions.https.HttpsError` replaced with `HttpsError` from v2
- [ ] `context.params` unchanged in v2 Firestore triggers
- [ ] `snap.data()` changed to `event.data.data()` in v2 Firestore triggers
- [ ] Test locally with emulators
- [ ] No new lint errors introduced

---

## Global Configuration

### Current setGlobalOptions in index.js

```javascript
setGlobalOptions({ maxInstances: 10 });
```

### v2 Enhanced Options

```javascript
const { setGlobalOptions } = require("firebase-functions/v2/core");

setGlobalOptions({
  maxInstances: 10,
  minInstances: 1, // Reduce cold starts (v2 only)
  memory: "256MB", // Default memory
  timeoutSeconds: 60, // Default timeout
  region: "asia-southeast1", // Default region
});
```

### Per-Function Configuration (v2)

```javascript
exports.expensiveOperation = onCall(
  {
    memory: "512MB",
    timeoutSeconds: 120,
    region: "asia-southeast1",
  },
  async (req) => {
    // implementation
  },
);
```

---

## Performance Optimization Tips

1. **Enable minInstances** for frequently accessed functions
2. **Use region targeting** to reduce latency (currently default us-central)
3. **Batch database operations** where possible
4. **Implement caching** for frequently read data
5. **Use callable functions** instead of HTTP requests when possible (better auth handling)

---

## Import Patterns by File Type

### Callable HTTPS (v2)

```javascript
const { onCall, HttpsError } = require("firebase-functions/v2/https");
```

### HTTP Request (v2)

```javascript
const { onRequest } = require("firebase-functions/v2/https");
```

### Firestore Triggers (v2)

```javascript
const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
```

### Scheduler (v2)

```javascript
const { onSchedule } = require("firebase-functions/v2/scheduler");
```

### Storage Triggers (v2)

```javascript
const {
  onObjectFinalized,
  onObjectDeleted,
} = require("firebase-functions/v2/storage");
```

---

## Common Pitfalls

1. **Forgetting to handle `req.auth` being null** - Always check `if (!auth)`
2. **Using v1 error codes** - v2 HttpsError uses same codes but import path differs
3. **Snapshot access in v2** - Use `.data()` not `.data`
4. **Double initialization** - Ensure admin is initialized only once
5. **Missing secret access** - Use `defineSecret()` for v2 secret access

---

## Useful Commands

```bash
# Install dependencies
cd functions && npm install

# Run linter
npm run lint

# Start emulators
firebase emulators:start --only functions

# Deploy functions
firebase deploy --only functions

# View function logs
firebase functions:log

# List deployed functions
firebase functions:list

# Rollback (if needed)
firebase functions:rollback [region]

# Check billing
gcloud billing projects describe YOUR_PROJECT
```

---

## File Size Reference

| File                  | Approximate Lines | Complexity |
| --------------------- | ----------------- | ---------- |
| `src/booking.js`      | 2553              | Highest    |
| `src/service.js`      | 2163              | High       |
| `src/review.js`       | 1787              | High       |
| `src/admin.js`        | 1141              | High       |
| `src/notification.js` | 1170              | Medium     |
| `src/media.js`        | 992               | Medium     |
| `src/account.js`      | 640               | Medium     |
| `src/feedback.js`     | 725               | Medium     |
| `src/reputation.js`   | 437               | Medium     |
| `src/commission.js`   | 217               | Low        |
| `src/chat.js`         | 116               | Low        |
| `src/auth.js`         | 94                | Low        |

---

## Integration Points

### External Services

| Service                 | Purpose               | Key Files                                |
| ----------------------- | --------------------- | ---------------------------------------- |
| Xendit                  | Payment processing    | Missing (onboardProvider, etc.)          |
| ICP (Internet Computer) | Identity & reputation | `utils/canisterConfig.js`, `src/auth.js` |
| OneSignal               | Push notifications    | `src/notification.js`                    |
| SMTP                    | Email                 | `sendContactEmail.js`                    |
| Firebase Storage        | File storage          | `src/media.js`, `src/account.js`         |

### Database Collections

- `users` - User profiles
- `services` - Service listings
- `bookings` - Booking records
- `reviews` - Review documents
- `messages` - Chat messages (Firestore trigger target)
- `notifications` - Push notifications
- `wallets` - Wallet balances
- `feedback` - User feedback
- `certificates` - Service certificates
- `commissions` - Commission tracking

---

## AI Agent Instructions

When working on this codebase:

1. **Always run lint** after making changes: `cd functions && npm run lint`
2. **Test locally** before assuming changes work: `firebase emulators:start --only functions`
3. **Check for side effects** - Many files share helper functions (e.g., `getAuthInfo`)
4. **Preserve CommonJS style** - This project uses `module.exports`, not ES modules
5. **Keep functions in their original files** - Don't split files unless necessary
6. **Document any breaking changes** - If API signature changes, note it
7. **Never commit secrets** - `.env` should never be added to git
8. **Check index.js exports** - When adding new functions, update the exports
9. **Verify missing files issue** - Address the 8 missing imported files before deployment
10. **Use emulator for testing** - Never test production changes without emulators

---

## Contact for Questions

This migration requires careful attention to:

- Auth context changes (v1 `context` vs v2 `req`)
- Error handling consistency
- Admin initialization singleton
- Secret management migration
- Testing across all 150+ functions

Consider staging deployment and comprehensive testing before production rollout.
