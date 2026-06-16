---
tags: [operations, backend, locations, philippines]
date: 2026-06-16
sources:
  - functions/src/phLocationData.js
  - functions/src/phLocations.js
  - functions/data/ph-brgy-list.json
related: []
---

# Philippine Location Data Service

In-memory geographic data service for Philippine administrative divisions, served via a v2 callable Cloud Function.

## Files

- `functions/src/phLocationData.js` — In-memory index built once from `data/ph-brgy-list.json` on cold start
- `functions/src/phLocations.js` — `phLocationsAction` onCall handler with action dispatch
- `functions/data/ph-brgy-list.json` — Raw barangay-level geographic data

## Architecture

Data is loaded once per instance during cold start and kept in memory. The `phLocationsAction` function uses an action switch similar to other domain functions:

- `fetchRegions` — Get all regions
- `fetchProvinces` — Get provinces by region
- `fetchMunicipalities` — Get municipalities by province
- `fetchBarangays` — Get barangays by municipality
- `searchLocation` — Text search across all divisions

## Usage

```js
const result = await httpsCallable(functions, "phLocationsAction")({
  action: "fetchProvinces",
  data: { regionCode: "01" }
});
```

## Config

- `memory: "256MiB"` (handles in-memory geographic index)
- Cached per function instance — no Firestore reads for location lookups
