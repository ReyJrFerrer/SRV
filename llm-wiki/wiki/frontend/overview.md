---
tags: [frontend, architecture]
date: 2026-06-16
sources:
  - src/frontend/main.tsx
  - src/frontend/vite.config.ts
  - src/frontend/package.json
related:
  - [[Routing and Layouts]]
  - [[Authentication Flow]]
  - [[Services Layer]]
  - [[State and Hooks]]
---

# Frontend Overview

The SRV frontend is a React 19 single-page application (SPA) using Vite 6, Tailwind CSS v4, and HashRouter (React Router v7). It lives at `src/frontend/` and is one of two npm workspace packages (alongside `src/admin/`).

## Stack

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Framework      | React 19                                       |
| Build tool     | Vite 6                                         |
| Routing        | React Router v7 (HashRouter)                   |
| Styling        | Tailwind CSS v4 + plain CSS files              |
| Backend        | Firebase (Auth, Firestore, Functions, Storage) |
| Auth           | zkLogin (Google OAuth via Sui) + Firebase      |
| State (server) | TanStack Query (5min stale, 24h GC, 2 retries) |
| State (client) | Zustand with `persist` middleware              |
| Push           | OneSignal v16 via `react-onesignal`            |
| Maps           | `@vis.gl/react-google-maps` (places library)   |
| TypeScript     | strict, `noUnusedLocals`, `noUnusedParameters` |
| Linting        | Prettier + `prettier-plugin-tailwindcss`       |
| Testing        | Vitest configured but no test files exist      |

## Entry Point Chain

`main.tsx` (`src/frontend/main.tsx`, ~659 lines) is the application root:

1. **Pre-router**: ZkLoginCallbackWrapper detects Google OAuth redirect (URL has `id_token` param) and handles it before HashRouter mounts.
2. **HashRouter** wraps everything else.
3. **Provider nesting** (innermost to outermost): `Routes` → `Suspense` → `QueryClientProvider` → `InAppNotificationProvider` → `BookingCacheProvider` → `AuthProvider`.
4. **Global components**: OneSignal init call, version checker init call, `MapsProviderWrapper` (wraps client/provider route groups), `GlobalLocationModals` (permission prompts).
5. **Lazy-loaded routes**: All page components use `React.lazy()` + `Suspense` except ZkLoginCallback (eager, needed before router).

## Directory Structure

```
src/frontend/src/
├── components/
│   ├── layout/        — ProtectedRoute, ClientLayout, ProviderLayout, BottomNavigation
│   ├── ui/            — Reusable UI primitives (buttons, modals, inputs, cards)
│   └── *.tsx          — Feature-specific components (maps, chat, booking, etc.)
├── pages/
│   ├── client/        — Client-facing pages (home, search, booking, chat, etc.)
│   ├── provider/      — Provider-facing pages (services, bookings, wallet, etc.)
│   └── auth/          — Login callback handling
├── services/          — 21 service modules (Firebase, auth, booking, chat, media, onlineProject, etc.)
├── hooks/             — 28 custom React hooks (Phase 1: +2 for online projects)
├── store/             — Zustand stores (locationStore, locationDataStore)
├── context/           — React contexts (Auth, BookingCache, InAppNotification)
├── utils/             — Utilities (session, version checker, image cache, asset resolver)
├── data/              — Static data (phLocations.ts — PH admin hierarchy)
├── types/             — TS declarations (svg module declaration)
└── styles/            — Plain CSS files
```

## Build Pipeline

`npm run build` → `tsc` (type-check) → `vite build` → `node scripts/generate-version.js` (writes `dist/version.json` for cache busting).

## Key Conventions

- Named function exports preferred over `export default`.
- Services are singleton classes with `getInstance()` or module-level singletons.
- Zustand stores for location only; React Context for auth, bookings, notifications.
- Component files: kebab-case, PascalCase for React components.
- Icons from `@heroicons/react` (outline, `24/outline` path).
- No ESLint — purely Prettier-based linting.

## Environment Variables

Required on `process.env` (from `../../.env`): Firebase config vars (`VITE_FIREBASE_*`), `VITE_GOOGLE_MAPS_API_KEY`, `VITE_MAP_ID`, `VITE_MOCK_VAPID_KEY`. `CANISTER_*` and `DFX_*` are auto-exposed by `vite-plugin-environment`.
