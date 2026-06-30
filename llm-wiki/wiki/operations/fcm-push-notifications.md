---
tags: [operations, firebase, notifications, fcm]
date: 2026-06-16
sources:
  - docs/FCM_TEST_COMMANDS.md
  - docs/FCM_TROUBLESHOOTING.md
related:
  - [[Chat Media Implementation]]
---

# FCM Push Notifications

Firebase Cloud Messaging (FCM) configuration, testing, and troubleshooting for the SRV platform. OneSignal v16 handles most push delivery; FCM serves as the underlying delivery layer.

## Project Configuration

- **Project ID**: `devsrv-rey`
- **Sender ID**: `851522429469`
- **VAPID Key**: (configured in `VITE_FIREBASE_VAPID_KEY` env var)
- **Service Workers**: `sw.js` (main), `firebase-messaging-sw.js` (FCM handler)

## Common Issues

- **"Registration failed — push service error"**: Usually means FCM API is not enabled in Google Cloud Console for the project. Ensure `Firebase Cloud Messaging API` is enabled in APIs & Services → Library.
- **Browser permission blocked**: Check site notification settings
- **Stale token**: >7 days old, can be force-refreshed

## Testing

Browser console test commands at `docs/FCM_TEST_COMMANDS.md` include:
- Full diagnostic (`printDiagnostics()`)
- Comprehensive test (`testFCMConfiguration()`)
- Raw Firebase FCM test (bypasses OneSignal)
- Token health check and force refresh

## Debugging

Enable verbose logging with `localStorage.setItem("DEBUG", "fcm:*")`. Unregister all service workers from DevTools Application tab if needed.
