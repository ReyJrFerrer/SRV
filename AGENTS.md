# SRV Agent Context

Monorepo: two npm workspaces (`src/frontend`, `src/admin`), Firebase Cloud Functions at `functions/`, ICP canisters at `src/backend/`, mobile app at `SRV-Mobile/srv-mobile/` (NOT in workspaces).

## Key Commands (run from repo root unless noted)

| Action                  | Command                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| Frontend dev            | `cd src/frontend && npm run start` (port 5173, proxy `/api` → `:4943`)  |
| Frontend build          | `cd src/frontend && npm run build` (tsc → vite → generate version.json) |
| Frontend test           | `npm run test:frontend` (Vitest)                                        |
| Lint (whole repo)       | `npm run lint` (prettier --check)                                       |
| Format                  | `npm run format` (prettier --write)                                     |
| Mobile dev              | `cd SRV-Mobile/srv-mobile && bun run start`                             |
| Kill Firebase emulators | `npm run emulators:kill`                                                |
| All tests               | `npm test` (backend + frontend)                                         |
| Backend tests           | `npm run test:backend` (Vitest, config at `tests/vitest.config.ts`)     |
| Bundle analysis         | `npm run analyze` (from frontend)                                       |
| Generate iOS icons      | `npm run generate:icons` (from frontend; needs `sharp`)                 |

## Frontend (`src/frontend/`)

- **Stack**: React 19, Vite 6, Tailwind CSS v4, React Router v7 (HashRouter), TanStack Query
- **TypeScript**: strict mode, `noUnusedLocals: true`, `noUnusedParameters: true`
- **Testing**: Vitest with jsdom, config in `vite.config.ts` under `test` key
- **Routing**: HashRouter — routes are `/#/client/home`, `/#/provider/services`, etc.
- **PWA**: See `src/frontend/PWA-ARCHITECTURE.md`
- **Google Maps**: Required (`VITE_GOOGLE_MAPS_API_KEY`); wraps both client and provider routes
- **Alias**: `import ... from "declarations"` → `../declarations` (ICP canister types)

### Build detail

`npm run build` → `tsc` (type-check) → `vite build` → `node scripts/generate-version.js` (writes `dist/version.json` for cache busting).

### Env vars

Required on `process.env` (from `../../.env`): `CANISTER_*` and `DFX_*` are auto-exposed by `vite-plugin-environment`. Frontend Vite env vars needed:

```
VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_STORAGE_BUCKET,
VITE_FIREBASE_VAPID_KEY, VITE_GOOGLE_MAPS_API_KEY, VITE_MAP_ID, VITE_MOCK_VAPID_KEY,
VITE_FIREBASE_DATABASE_URL
```

## Admin (`src/admin/`)

Also React/Vite. Separate workspace with its own `package.json` and build. Deployed separately.

## Mobile App (`SRV-Mobile/srv-mobile/`)

- **Not** part of npm workspaces. Use `bun` directly.
- React Native + Expo SDK 56 + Expo Router.
- `@/*` → `./src/*`
- CLAUDE.md at `SRV-Mobile/srv-mobile/CLAUDE.md` (just `@AGENTS.md`)
- Refer to versioned Expo docs: `https://docs.expo.dev/versions/v56.0.0/`

### Known issues

- **No frontend test files exist** — `src/frontend/` has no `.test.*` or `.spec.*` files; the referenced `frontend-test-setup.ts` in `vite.config.ts` does not exist either

## Backend

- **ICP canisters** (Motoko) at `src/backend/function/`, built with `mops`
- **Firebase Functions** at `functions/` (Node.js, separate `npm install`)
- **Canister config**: `dfx.json` (reputation, auth, internet_identity)
- **Declarations** auto-generated at `src/declarations/`

## CI & Quality

- **Husky** pre-commit hooks (`npm run prepare`)
- **Prettier** with `prettier-plugin-tailwindcss` — run `npm run format` before committing
- No ESLint — linting is purely Prettier-based

## Conventions

| Context            | Convention                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Component patterns | Named function exports (not `export default function`) where possible                     |
| Services           | Singleton classes with `getInstance()` or module-level singleton                          |
| State              | Zustand stores in `src/frontend/src/store/`, React Context in `src/frontend/src/context/` |
| Canister calls     | Through service classes in `src/frontend/src/services/`                                   |
| File naming        | kebab-case for files, PascalCase for components, camelCase for utils/services             |
| Icons              | `@heroicons/react` (outline style imported as `.../24/outline`)                           |
| Push notifications | OneSignal v16 via `react-onesignal` (NOT raw FCM unless firebase-messaging-sw.js)         |

## Chat System Current State

### Backend (`functions/src/chat.js`)

- **Single trigger**: `onMessageCreated` — Firestore `onDocumentCreated` on `messages/{messageId}` (database `srvefirestore`)
- Creates in-app notification in `notifications` collection, sends OneSignal push (non-blocking), and sends email with 1-hour cooldown per receiver+conversation pair (`chatEmailCooldowns` collection)
- **Text-only**: only processes messages where `content.encryptedText` exists; message preview = first 50 chars of text
- **No attachment awareness**: trigger ignores any attachment data on the message document

### Frontend Service (`src/frontend/src/services/chatCanisterService.ts`)

- **Firestore-based** (despite the "canister" name, all chat data lives in Firestore, not ICP)
- `FrontendMessage` interface already has `attachment?: { fileName, fileSize, fileType, fileUrl }` and `messageType: "Text" | "File"`
- `adaptBackendMessage()` parses attachments from Firestore array format (`attachment[0]`)
- `sendMessage()` is **text-only**: hardcodes `messageType: { Text: null }`, `attachment: []`
- Real-time via `onSnapshot` with 200ms debounce; shared listener pattern for conversation summaries

### Frontend UI

- `pages/client/chat.tsx` and `pages/provider/chat.tsx` — full-page chat views
- **No attachment UI anywhere**: no file picker, no attachment rendering in message bubbles
- `useChat.tsx` hook: `sendMessage(content: string, receiverId: string)` — no file parameter

### Media System (`functions/src/media.js`)

- `mediaAction` callable with action-based routing (upload, get, delete, etc.)
- Media types: `UserProfile`, `ServiceImage`, `ServiceCertificate`, `RemittancePaymentProof`, `ReportAttachment`, `ProblemProof` — **no `ChatAttachment` type**
- Storage bucket: `srve-7133d` (Firebase Cloud Storage)
- Size limits: 1MB general, 1MB remittance, 30MB problem-proof video
- Supported MIME: images (jpeg, png, gif, webp, bmp, svg, heic), PDF, video (mp4, webm, quicktime)
- Internal helpers exported for cross-module use: `uploadMediaInternal`, `deleteMediaInternal`

### Key Gaps (no media sending in chat)

1. No `ChatAttachment` media type in `functions/src/media.js`
2. `chatCanisterService.sendMessage()` doesn't accept or store attachments
3. `useChat.sendMessage()` only accepts string content
4. No file picker or attachment preview UI in any chat component
5. `onMessageCreated` trigger doesn't generate attachment-aware notification previews
6. No thumbnail generation for image/video attachments

### Implementation plan

See `CHAT-MEDIA-PLAN.md` for the detailed plan to add media sending (images, PDFs, text files, videos) to chat.
