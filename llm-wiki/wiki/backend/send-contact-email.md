---
tags: [backend, email, contact]
date: 2026-06-16
sources:
  - functions/sendContactEmail.js
  - functions/src/utils/email.js
related:
  - [[Firebase Hybrid Architecture]]
---

# Contact Email Function

Standalone v1 callable function at `functions/sendContactEmail.js` that handles website contact form submissions.

## Notable Details

- **Uses v1 SDK** (`require("firebase-functions")`) — the only function in the codebase not on v2
- Sends email via SMTP (Hostinger, port 465) using `functions/src/utils/email.js`
- Validates: name, email, subject, message (all required), email format regex
- Different error handling pattern from v2 functions (different `HttpsError` import path)

## Context

This was likely the first deployed function before the rest of the codebase was migrated to v2. It remains on v1 and should be migrated for consistency.
