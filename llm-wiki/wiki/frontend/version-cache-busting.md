---
tags: [frontend, deployment, caching]
date: 2026-06-16
sources:
  - docs/CACHE_CLEARING.md
  - src/frontend/scripts/generate-version.js
  - src/frontend/src/utils/versionChecker.ts
related:
  - [[Firebase Functions Optimization]]
---

# Version Cache Busting

Multi-layered cache busting strategy ensuring users always get the latest app version after Firebase Hosting deployments.

## Implementation Layers

1. **HTTP Cache Headers** (`firebase.json`): HTML files set to `no-cache, no-store, must-revalidate`. Assets (CSS, JS, images) remain cached for performance with hashed filenames.

2. **HTML Meta Tags**: Redundant cache-prevention meta tags in both `src/frontend/index.html` and `src/admin/index.html`.

3. **Version Checker Utility** (`src/frontend/src/utils/versionChecker.ts` and `src/admin/src/utils/versionChecker.ts`): Polls `version.json` every 5 minutes, compares current vs deployed version, shows non-intrusive update notification.

4. **Build-Time Version Generation** (`scripts/generate-version.js`): Creates `version.json` with build timestamp as part of `npm run build`.

## File Locations

- `src/frontend/scripts/generate-version.js`
- `src/admin/scripts/generate-version.js`
- `src/frontend/src/utils/versionChecker.ts`
- `src/admin/src/utils/versionChecker.ts`

## Key Design

- Assets use content-hashed filenames via Vite for cacheable performance
- Version check does not affect UI performance (background polling)
- On update detected: clear Cache API, Service Workers, and localStorage before reload
- OneSignal service workers are unaffected
