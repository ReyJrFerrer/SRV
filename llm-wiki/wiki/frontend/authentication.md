---
tags: [frontend, auth, security]
date: 2026-06-16
related:
  - [[Frontend Overview]]
  - [[Services Layer]]
---

# Authentication Flow

The auth system uses **zkLogin** (Sui blockchain's Google OAuth mechanism) bridged to Firebase custom tokens. This gives Google OAuth without a dedicated backend — the Sui testnet handles JWT verification, and `identityBridge.ts` exchanges the Sui address for a Firebase custom token.

## Auth Flow (Detailed)

1. **User clicks "Sign in with Google"** → `AuthContext.login()` calls `zkLoginService.startZkLogin()`.
2. **Ephemeral key generation**: Ed25519 key pair generated in-browser, stored in `sessionStorage`.
3. **Nonce computation**: SHA-256 of ephemeral public key → base64 → URL encoded.
4. **Google OAuth URL**: Constructed with `id_token` response type, nonce, client ID from `VITE_GOOGLE_OAUTH_CLIENT_ID`.
5. **User signs in** → Google redirects back to the app with `id_token` in URL hash.
6. **Callback handling**: `ZkLoginCallbackWrapper` (pre-router) detects `id_token` param, calls `zkLoginService.completeZkLogin()`.
7. **JWT decode**: Parses `sub`, `email`, `name`, `picture` from the Google-signed JWT. Verifies nonce matches.
8. **Sui address derivation**: Computes from `sub` (Google user ID) + ephemeral public key + aud.
9. **Token exchange**: `identityBridge.ts` calls `exchangeForFirebaseToken()` Cloud Function (15s timeout) → returns Firebase custom token.
10. **Firebase sign-in**: `signInWithCustomToken(firebaseCustomToken)` → `onAuthStateChanged` fires → `AuthContext` sets `firebaseUser`, `isAuthenticated = true`.
11. **Session persistence**: `sessionManager` stores `SessionData` (principal, firebaseToken, expiresAt, lastRefresh, email) in IndexedDB (`wchl_auth` DB) with localStorage fallback.
12. **Proactive refresh**: 50-minute timer dispatches `session-refresh-needed` custom event. When caught, re-calls `exchangeForFirebaseToken()` and updates stored token.
13. **Profile check**: `authCanisterService.getMyProfile()` fetches profile → `profileStatus` set → `CreateProfileGuard` shows profile creation if missing.
14. **Post-login**: Location permission prompt shown if not set. Push notification subscription auto-enabled.

## Session Management

- `sessionManager` singleton (`sessionPersistence.ts`, 322 lines).
- IndexedDB store `wchl_auth/sessions` with localStorage as critical backup (iOS PWA).
- Validates sessions: required fields check + max 30-day age.
- Auto-refresh at 50min or 80% of session duration (whichever shorter).
- Platform detection for storage strategy.

## Phone Auth (Alternative)

`FirebaseAuthService` (`firebaseAuth.ts`) provides `signInWithPhoneNumber` + RecaptchaVerifier for users without Google accounts. OTP confirmation via `confirmOtp(code)`. Used as a secondary path.

## Logout

`logout.tsx` hook: calls `authLogout()`, clears IndexedDB + sessionStorage + localStorage (preserves tour flags), navigates to `/`.

## Security Notes

- Ephemeral keys stored in sessionStorage (cleared on tab close).
- Nonce ties OAuth request to ephemeral key (prevents replay).
- Firebase token lifetime ~60min; proactive 50min refresh prevents expiry gaps.
- Session max 30-day age forces periodic re-authentication.
