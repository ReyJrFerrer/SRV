# Online Services Phase 1 — Test-Driven Implementation Checklist

**Status**: In progress (Phase 0 + 1 + 2 complete: 42/93 tasks done, 290 service+online tests passing; Phase 3+ pending)
**Date**: 2026-06-28
**Source spec**: `docs/OnlineService.md` (ratified 2026-06-27)
**Source decision record**: `llm-wiki/wiki/decisions/grill-2026-06-27-online-services-integration.md`
**Methodology**: Strict TDD (red-green-refactor) — write failing test → implement → re-run → pass → refactor

---

## Decisions Locked

| Area | Decision |
|---|---|
| TDD mode | Strict red-green-refactor |
| Action count | 18 actions (per `docs/OnlineService.md` §6.7, binding) |
| Scope | Full Phase 1 (backend + frontend) |
| Test count | Strict 7-case minimum per action |
| Test files | One per Cloud Function: `service.online.test.js`, `onlineProject.test.js`, `firestore.rules.test.js` |
| Session packages | Rejected by `createOnlineProject`; flow to multi-session Booking (Phase 2) |
| Backfill | One-time script, no test |
| Media upload tests | Skip dedicated `media.test.js`; cover via `createOnlineProject` happy path |
| Notification tests | No new `notification.test.js`; assert side effects inline in `onlineProject.test.js` |
| Rules test | New `firestore.rules.test.js` using `@firebase/rules-unit-testing` |
| Milestone metadata | Direct Firestore write, tested via rules test (not callable) |
| Negotiation tests | 7-case + 1 race condition test |
| Milestone sum | Strict boundary cases |
| Frontend tests | None; list 12 frontend tasks as no-test items |
| Internal helpers | Test both `isValidOnlineProjectTransition` + `deductReputationForLateReschedule` |
| `getOnlineProject` | Returns project doc only; subcollections via separate `onSnapshot` |
| `service.online.test.js` | 4 fields + ServicePackage `type` |
| Implementation order | Lifecycle → Negotiation → Deliverables → Housekeeping |
| Seed helpers | Full online-project seed family (~15 new helpers) |
| Wiki updates | Batch at end |
| Test runner | Auto-included via existing glob; new log file |
| 3 new categories | Seeded in Phase 2 as `cat-011/012/013`; no test; lazy auto-seed via `initializeCategoriesDirectly()` |
| `weeklySchedule` required for InPerson/Hybrid | Phase 1 validation; matches §4.3 spec |
| 1-5 packages-per-service rule | Phase 1 validation; matches §5.4 spec |
| `Service.price = min(package.prices)` invariant | Phase 1 validation; transactional update on package create |
| CashOnHand/GCash rejection for OnlineProject | **Deferred** — user decision 2026-06-28; future ticket |
| Frontend route mods (3) | `/client/categories/:slug`, `/provider/service-details/:id`, `/client/search-results` all in Phase 10 |

---

## Test Target Summary

| Test file | Status | Cases |
|---|---|---|
| `onlineProject.test.js` | NEW | ~144 (18 actions + 1 race + 2 helpers) |
| `service.online.test.js` | NEW | ~50 (29 existing + 21 new from 3 Phase 1 validations) |
| `firestore.rules.test.js` | NEW | ~8 (milestone metadata rule exception) |
| `booking.test.js` | modified | 0 (Phase 2 — deferred) |
| `service.test.js` | modified | 0 (new field tests live in `service.online.test.js`) |
| `notification.test.js` | n/a | 0 (doesn't exist; assertions inline in `onlineProject.test.js`) |
| `media.test.js` | n/a | 0 (doesn't exist; upload flow tested in `createOnlineProject`) |
| **Total** | | **~202 cases** |

---

## 7-Case Test Template (per action)

Apply this template to every action unless the per-action delta overrides:

```
1. Happy path                  — valid auth + valid data → success, doc persisted, all side effects
2. Unauthenticated             — HttpsError("unauthenticated")
3. Wrong role                  — HttpsError("permission-denied")
4. Stranger (not owner/admin)  — HttpsError("permission-denied")
5. Missing required field      — HttpsError("invalid-argument")
6. Doc-not-found (if read)     — HttpsError("not-found")
7. Invalid state transition    — HttpsError("failed-precondition")
```

**Side-effect assertions (in happy path, not separate test)**:

- Notification count + types (use `NOTIFICATION_TYPES.PROJECT_*` constants)
- Subcollection doc creation (briefs/negotiations/deliverables)
- Reports doc (for `cancelProject`/`disputeProject`)
- Reputation updates (for cancellation/dispute)
- `workStarted` flag set
- `paymentStatus` field updates (for `recordPayment`)

---

## Per-Action Test Plan

### Group A — Lifecycle (8 actions)

| # | Action | Cases | Per-action delta |
|---|---|---|---|
| 1 | `createOnlineProject` | 11 | + 1 test: `service.serviceMode === 'InPerson'` rejected with `permission-denied`; + 1 test: `service.negotiable === true` but `suggestedPrice` omitted; + 1 test: brief doc created in subcollection; + 1 test: `packageType === 'Session'` rejected (defers to Phase 2 Booking) |
| 2 | `acceptProject` | 9 | + 1 test: client `acceptedAt` timestamp set; + 1 test: `Negotiating` → `Active` via accept (re-validates) |
| 3 | `declineProject` | 9 | + 1 test: provider-only (client cannot decline); + 1 test: `acceptedAt` NOT set (terminal) |
| 4 | `cancelProject` | 12 | + 2 tests: `workStarted=false` (full refund) + `workStarted=true` (no refund); + 1 test: `reports` doc auto-created; + 1 test: reputation deduction |
| 5 | `disputeProject` | 10 | + 1 test: `reports` doc auto-created; + 1 test: either party can dispute (client-initiated, provider-initiated) |
| 6 | `getOnlineProject` | 5 | "Just project doc" → 4 cases (client, provider, admin, stranger) + 1 empty case |
| 7 | `listClientOnlineProjects` | 5 | 4 cases: own list, stranger denied, admin-on-behalf, empty |
| 8 | `listProviderOnlineProjects` | 5 | 4 cases: own list, stranger denied, admin-on-behalf, empty |

**Lifecycle subtotal: 66 cases**

### Group B — Analytics (1 action)

| # | Action | Cases | Per-action delta |
|---|---|---|---|
| 18 | `getProjectAnalytics` | 5 | 5 cases: own, stranger denied, admin-on-behalf, empty (all zero), missing-providerId |

**Analytics subtotal: 5 cases**

### Group C — Negotiation (3 actions)

| # | Action | Cases | Per-action delta |
|---|---|---|---|
| 4 | `negotiateProject` | 10 | + 1 test: `service.negotiable === false` rejected; + 1 test: latest offer gets `Superseded` after new offer; + 1 race test: concurrent offers from both sides within transaction |
| 5 | `acceptCounterOffer` | 10 | + 1 test: offer status set to `Accepted`; + 1 test: prior offers `Superseded`; + 1 test: project `price`/`deadline`/`scope`/`revisionRounds` updated from offer |
| 6 | `rejectCounterOffer` | 9 | + 1 test: client rejecting provider's last offer → `Declined`; + 1 test: provider rejecting client's last offer → stays `Negotiating` (asymmetry per spec) |

**Negotiation subtotal: 29 cases (includes 1 race condition)**

### Group D — Deliverables (4 actions)

| # | Action | Cases | Per-action delta |
|---|---|---|---|
| 7 | `submitDeliverable` | 11 | + 1 test: `Active` → `InReview` transition; + 1 test: `workStarted=true` set; + 1 test: deliverable doc created in subcollection; + 1 test: `milestoneId` linking (for Milestone-type) |
| 8 | `approveDeliverable` | 10 | + 1 test: all milestones approved → `Completed`; + 1 test: partial approval (some pending) → stays `Active`; + 1 test: deliverable `reviewStatus: 'Approved'` set |
| 9 | `requestRevision` | 9 | + 1 test: `revisionsRemaining` decremented; + 1 test: `revisionsRemaining === 0` → auto-escalates to `Disputed` (not `RevisionsRequested`) |
| 13 | `markMilestoneApproved` | 10 | + 1 test: client-only (provider cannot approve); + 1 test: `milestone.status` set to `Approved`; + 1 test: project stays `Active` until all approved |

**Deliverables subtotal: 40 cases**

### Group E — Payment (1 action)

| # | Action | Cases | Per-action delta |
|---|---|---|---|
| 12 | `recordPayment` | 10 | + 1 test: `amountPaid` updates; + 1 test: `paymentStatus: PENDING → PAID_HELD`; + 1 test: SRVWallet only (rejects future fields) |

**Payment subtotal: 10 cases**

### Group F — Milestone metadata (1 action — rules-only)

| # | Action | Cases | Notes |
|---|---|---|---|
| 14 | `updateMilestoneMetadata` | 0 in `onlineProject.test.js`; 8 in `firestore.rules.test.js` | Provider-only direct write. Rules test: provider can update `title`/`description`/`dueDate` only; cannot modify `percentage` or `status`; client cannot; non-owner provider cannot; admin can. |

### Group G — Internal helpers (2 helpers)

| Helper | Cases |
|---|---|
| `isValidOnlineProjectTransition` | 12 (all 9 statuses × valid + 1 negative each) |
| `deductReputationForLateReschedule` | 5 (trust score decrements; floor at 0; provider penalty; client penalty; detection flag propagation) |

**Internal helpers subtotal: 17 cases**

### `service.online.test.js` — Phase 1 (29 cases, original)

| Test area | Cases |
|---|---|
| `serviceMode='InPerson'` rejects `negotiable=true` | 1 |
| `serviceMode='InPerson'` rejects `onlineDeliveryFormat='live'` | 1 |
| `serviceMode='InPerson'` rejects `allowsMilestones=true` | 1 |
| `serviceMode='Online'` accepts all 4 fields | 1 |
| `serviceMode='Hybrid'` accepts all 4 fields | 1 |
| `serviceMode='Online'` requires `onlineDeliveryFormat` | 1 |
| `serviceMode='Online'` invalid `onlineDeliveryFormat` (not in `live`/`async`/`mixed`) | 1 |
| `serviceMode` not in `InPerson`/`Online`/`Hybrid` | 1 |
| `ServicePackage.type='Fixed'` accepts no extra fields | 1 |
| `ServicePackage.type='Milestone'` requires `milestones[]` | 1 |
| `ServicePackage.type='Milestone'` milestone sum = 100 boundary (9 cases: 1×100, 50/50, 33/33/34, reject 50/51, reject 49/50, reject empty, reject 0 milestones, reject 1@99, reject 1@101) | 9 |
| `ServicePackage.type='Session'` accepts `sessionCount`/`sessionDurationMinutes`/`sessionType` | 1 |
| `ServicePackage.type='Session'` `sessionCount` boundary (0, 1, 50, 51) | 4 |
| `ServicePackage.type='Session'` `sessionDurationMinutes` boundary (14, 15, 240, 241) | 4 |
| `ServicePackage.type` missing | 1 |
| `ServicePackage.type` invalid value | 1 |

### `service.online.test.js` — Phase 1 additions (21 cases, Gaps 2/3/4)

| Test area | Cases |
|---|---|
| **Gap 2 — `weeklySchedule` required for InPerson/Hybrid** | 7 |
| ↳ Happy: `serviceMode='InPerson' + weeklySchedule={...}` → success | 1 |
| ↳ Reject: `serviceMode='InPerson' + weeklySchedule=null` → invalid-argument | 1 |
| ↳ Reject: `serviceMode='Hybrid' + weeklySchedule=null` → invalid-argument | 1 |
| ↳ Accept: `serviceMode='Online' + weeklySchedule=null` → success (no requirement) | 1 |
| ↳ Reject: unauth | 1 |
| ↳ Reject: missing serviceMode (defaults to InPerson) + missing weeklySchedule → invalid-argument | 1 |
| ↳ Reject: weeklySchedule=null + serviceMode invalid (compound error) | 1 |
| **Gap 3 — 1-5 packages-per-service rule** | 7 |
| ↳ Happy: create 1st package → success | 1 |
| ↳ Happy: create 5th package → success (boundary) | 1 |
| ↳ Reject: create 6th package → invalid-argument | 1 |
| ↳ Reject: unauth | 1 |
| ↳ Reject: missing serviceId | 1 |
| ↳ Reject: service belongs to other provider | 1 |
| ↳ Empty: `getServicePackages` on a service with 0 packages → returns [] | 1 |
| **Gap 4 — `Service.price = min(package.prices)` invariant** | 7 |
| ↳ Happy: `createServicePackage` with `price > current` → service.price unchanged | 1 |
| ↳ Update: `createServicePackage` with `price < current` → service.price updates (transactional) | 1 |
| ↳ Boundary: `createServicePackage` with `price === current` → unchanged | 1 |
| ↳ Reject: invalid package price (0) | 1 |
| ↳ Reject: unauth | 1 |
| ↳ Reject: missing serviceId | 1 |
| ↳ Concurrent: 2 simultaneous package creates — both updates apply, final price = min | 1 |

**Phase 1 additions subtotal: 21 cases**

### `firestore.rules.test.js` (8 cases)

| Case | Asserts |
|---|---|
| Provider can update `milestones[0].title` | succeeds |
| Provider can update `milestones[0].description` | succeeds |
| Provider can update `milestones[0].dueDate` | succeeds |
| Provider CANNOT update `milestones[0].percentage` | rejected |
| Provider CANNOT update `milestones[0].status` | rejected |
| Client cannot update any milestone field | rejected |
| Non-owner provider cannot update | rejected |
| Admin can update any field | succeeds |

---

## Test File Inventory

| File | Status | Purpose |
|---|---|---|
| `functions/src/onlineProject.js` | NEW | 18-action Cloud Function + 2 internal helpers |
| `functions/test/onlineProject.test.js` | NEW | 18 actions × 7-case template + race + helper tests (~144 cases) |
| `functions/test/service.online.test.js` | NEW | 4 new Service fields + ServicePackage `type` validation + 3 new Phase 1 validations (~50 cases) |
| `functions/test/firestore.rules.test.js` | NEW | Rules test for milestone metadata exception (~8 cases) |
| `functions/src/service.js` | MODIFIED | Add 4 new Service field validation; add `ServicePackage.type` validation; add weeklySchedule requirement; add 1-5 packages rule; add Service.price invariant |
| `functions/src/notification.js` | MODIFIED | Add 8 new `NOTIFICATION_TYPES` + href table entries |
| `functions/src/media.js` | MODIFIED | Register `ProjectBriefAttachment` in 6 touchpoints + add `initProjectBriefUpload` |
| `functions/test/helpers/seed.js` | MODIFIED | Add ~15 new helpers |
| `functions/test/mocha.js` | MODIFIED | Add `online_projects` + 3 subcollections to `COLLECTIONS_TO_CLEAR`; add log file routing |
| `firestore.rules` | MODIFIED | Add `online_projects` + 3 subcollections match block + milestone metadata exception |
| `storage.rules` | MODIFIED | Add `project-briefs/{ownerId}/{file}` |
| `firestore.indexes.json` | MODIFIED | Add 6 new composite indexes |
| `functions/package.json` | MODIFIED | Add `@firebase/rules-unit-testing` dev dep |
| `src/frontend/src/services/onlineProjectCanisterService.ts` | NEW | Frontend service module |
| `src/frontend/src/hooks/useOnlineProject.tsx` | NEW | Client hook |
| `src/frontend/src/hooks/useProviderOnlineProject.tsx` | NEW | Provider hook |
| `src/frontend/src/pages/client/project/*` | NEW | 3 pages (new, list, detail) |
| `src/frontend/src/pages/provider/project/*` | NEW | 3 pages (list, detail, delivered) |
| `src/frontend/src/pages/provider/services/add.tsx` | MODIFIED | Add Step 0 serviceMode |
| `src/frontend/src/pages/client/service/[id].tsx` | MODIFIED | Dynamic CTA logic |
| `src/frontend/src/pages/provider/home.tsx` | MODIFIED | Add "Projects" tab |
| `src/frontend/src/pages/client/home.tsx` | MODIFIED | Add serviceMode filter |
| `src/frontend/src/pages/client/categories/[slug].tsx` | MODIFIED | Add serviceMode filter (Gap 7) |
| `src/frontend/src/pages/provider/service-details/[id].tsx` | MODIFIED | Show 4 new fields (Gap 8) |
| `src/frontend/src/pages/client/search-results.tsx` | MODIFIED | Add serviceMode filter (Gap 9) |
| `scripts/backfillOnlineServiceFields.js` | NEW | One-time backfill script (no test) |

**Seed helpers to add to `functions/test/helpers/seed.js`**:

- `buildOnlineService` (with `serviceMode`/`negotiable`/`allowsMilestones`/`onlineDeliveryFormat` overrides)
- `seedOnlineService`
- `buildOnlineProject`
- `seedOnlineProjectPending` / `Negotiating` / `Active` / `InReview` / `RevisionsRequested` / `Completed` / `Declined` / `Cancelled` / `Disputed` (9 scenario seeders)
- `seedNegotiationOffer`
- `seedDeliverable`
- `seedBrief`
- `buildMilestonePackage` (with `milestones[]` field)
- `buildSessionPackage` (with `sessionCount`/`sessionDurationMinutes`/`sessionType`)

---

## Numbered Implementation Checklist

**Total: 93 tasks across 12 phases. Each task follows the TDD loop: (1) write test → (2) confirm RED → (3) implement → (4) confirm GREEN → (5) refactor.**

### Phase 0 — Scaffolding (no business logic)

- [x] **Task 1**: Create `functions/src/onlineProject.js` skeleton with `exports.onlineProjectAction = onCall(...)` + `switch` dispatching to 18 unimplemented handlers (each throws "not yet implemented"). Skeleton compiles.
- [x] **Task 2**: Write `functions/test/onlineProject.test.js` with `describe("onlineProjectAction")` + 18 empty `describe` blocks (one per action) + 2 helper `describe` blocks. Skeleton test passes (RED, since all actions return `HttpsError("internal")`).
- [x] **Task 3**: Modify `functions/test/mocha.js`: add `online_projects`, `online_projects/.../briefs`, `online_projects/.../negotiations`, `online_projects/.../deliverables` to `COLLECTIONS_TO_CLEAR`; add `test-output-onlineProject.log`, `test-output-service-online.log`, `test-output-rules.log` to `LOG_FILES`; add routing logic in `logFileForTest`.
- [x] **Task 4**: Modify `functions/test/helpers/seed.js`: add the 15 new helpers listed above.
- [x] **Task 5**: Add `@firebase/rules-unit-testing` to `functions/package.json` devDependencies; `npm install`.
- [x] **Task 6**: Create `functions/test/firestore.rules.test.js` skeleton with rules-unit-testing setup; describe blocks for milestone metadata tests (RED, since rules not yet updated).
- [x] **Task 7**: Create `scripts/backfillOnlineServiceFields.js` (one-time script, no test).

### Phase 1 — Service entity (18 tasks, 50 cases)

- [x] **Task 8**: Write `service.online.test.js` test: `createService` with `serviceMode: 'InPerson'` + `negotiable: true` → `permission-denied` (RED).
- [x] **Task 9**: Implement: `service.js` `createService_service` validates `InPerson` + `negotiable`. GREEN.
- [x] **Task 10**: TDD: `createService` with `serviceMode: 'InPerson'` + `onlineDeliveryFormat: 'live'` → `permission-denied`. GREEN.
- [x] **Task 11**: TDD: `createService` with `serviceMode: 'InPerson'` + `allowsMilestones: true` → `permission-denied`. GREEN.
- [x] **Task 12**: TDD: `createService` with `serviceMode: 'Online'` + all 4 fields set → success. GREEN.
- [x] **Task 13**: TDD: `createService` with `serviceMode: 'Hybrid'` + all 4 fields set → success. GREEN.
- [x] **Task 14**: TDD: `createService` with `serviceMode: 'Online'` + `onlineDeliveryFormat` omitted → `invalid-argument`. GREEN.
- [x] **Task 15**: TDD: `createService` with `serviceMode: 'Online'` + `onlineDeliveryFormat: 'invalid'` → `invalid-argument`. GREEN.
- [x] **Task 16**: TDD: `createService` with `serviceMode: 'invalid'` → `invalid-argument`. GREEN.
- [x] **Task 17**: TDD: `ServicePackage.type='Fixed'` accepts no extra fields. GREEN.
- [x] **Task 18**: TDD: `ServicePackage.type='Milestone'` requires `milestones[]` (9 boundary cases). GREEN.
- [x] **Task 19**: TDD: `ServicePackage.type='Session'` accepts session params + boundary cases (8 cases). GREEN.
- [x] **Task 20**: TDD: `ServicePackage.type` missing → defaults to `Fixed` (backward-compat). GREEN.
- [x] **Task 21**: TDD: `ServicePackage.type` invalid value → `invalid-argument`. GREEN.
- [x] **Task 22**: Refactor `service.js` to share validation logic via a single `validateServiceMode(serviceMode, negotiable, allowsMilestones, onlineDeliveryFormat)` helper. Re-run all 29 tests. GREEN.
- [x] **Task 23 (NEW)**: TDD: `weeklySchedule` required for `serviceMode='InPerson'` and `serviceMode='Hybrid'`; optional for `Online` (7 cases). GREEN — `service.js:219-226` enforces it via `validateServiceMode`; 7 cases pass in `service.online.test.js:253-396`.
- [x] **Task 24 (NEW)**: TDD: 1-5 packages-per-service rule in `createServicePackage_service` (7 cases). GREEN — `service.js:1987-1997` queries `service_packages` by `serviceId` and rejects when `size >= MAX_PACKAGES_PER_SERVICE` (5); 7 cases pass in `service.online.test.js:405-581`.
- [x] **Task 25 (NEW)**: TDD: `Service.price = min(package.prices)` invariant. On `createServicePackage` with `price < current`, update service.price transactionally (7 cases). GREEN — `service.js:2050-2070` wraps the update in `db.runTransaction`; 7 cases pass in `service.online.test.js:592-770` (including a concurrent 2-write race test that verifies final price = min).

### Phase 1.5 — Phase 1 closure (3 tasks, 21 cases) — ✅ COMPLETE 2026-06-29

- [x] **Task 23** (7 cases) — `weeklySchedule` requirement for InPerson/Hybrid. Implemented at `service.js:219-226` in `validateServiceMode()`.
- [x] **Task 24** (7 cases) — 1-5 packages-per-service rule. Implemented at `service.js:1987-1997`; constant `MAX_PACKAGES_PER_SERVICE = 5` at `service.js:52`.
- [x] **Task 25** (7 cases) — `Service.price = min(package.prices)` invariant. Implemented at `service.js:2050-2070` via `db.runTransaction` with re-read of `service.price` to prevent race-condition overwrites.

**Test verification**: 50/50 cases pass in `service.online.test.js` (Group A2 + A3 + A4). Combined with 168/168 cases in `service.test.js`, **218 service-related tests pass with zero regressions**.

### Phase 2 — OnlineProject lifecycle (17 tasks, 66 cases) — ✅ COMPLETE 2026-06-29

- [x] **Task 26 (NEW)**: Add 3 new categories to `STATIC_CATEGORIES` in `functions/src/service.js:initializeCategoriesDirectly()`. GREEN — `service.js:1903-1926` adds `cat-011` (Digital & Creative Services), `cat-012` (Business & SME Services), `cat-013` (Education & Specialized Knowledge). Auto-seeded via the existing `getAllCategories` defensive init call.
- [x] **Task 27**: Write 11 cases for `createOnlineProject` (RED). GREEN — `onlineProject.test.js:82-389` (11 cases).
- [x] **Task 28**: Implement: `createOnlineProject_onlineProject`. Validates `service.serviceMode !== 'InPerson'`, validates `packageType !== 'Session'`, validates client `trustScore > 5`, validates `negotiable` services have `brief.suggestedPrice`, creates project + brief atomically via `db.runTransaction`. GREEN — `onlineProject.js:103-273`.
- [x] **Task 29**: Write 9 cases for `acceptProject` (RED). GREEN — `onlineProject.test.js:393-505`.
- [x] **Task 30**: Implement. `acceptProject_onlineProject` validates Pending/Negotiating → Active transition, sets `acceptedAt`, provider-only. GREEN — `onlineProject.js:280-339`.
- [x] **Task 31**: Write 9 cases for `declineProject` (RED). GREEN — `onlineProject.test.js:507-620`.
- [x] **Task 32**: Implement. `declineProject_onlineProject` validates Pending/Negotiating → Declined, sets `declinedAt`, provider-only, no `acceptedAt`. GREEN — `onlineProject.js:345-407`.
- [x] **Task 33**: Write 12 cases for `cancelProject` (including `workStarted` boundary + reports doc + reputation deduction) (RED). GREEN — `onlineProject.test.js:622-805`.
- [x] **Task 34**: Implement. `cancelProject_onlineProject` allows either party to cancel non-terminal projects, sets `cancelledAt` + `cancelledBy` + optional `cancelReason`. GREEN — `onlineProject.js:413-479`.
- [x] **Task 35**: Write 10 cases for `disputeProject` (RED). GREEN — `onlineProject.test.js:807-925`.
- [x] **Task 36**: Implement. `disputeProject_onlineProject` allows either party to dispute a Completed project, sets `disputedAt` + `disputedBy` + optional `disputeReason`. GREEN — `onlineProject.js:485-549`.
- [x] **Task 37**: Write 5 cases for `getOnlineProject` (client/provider/admin/stranger/empty — doc-only return) (RED). GREEN — `onlineProject.test.js:927-993`.
- [x] **Task 38**: Implement. `getOnlineProject_onlineProject` returns project doc only (no subcollections); gates by clientId/providerId/admin. GREEN — `onlineProject.js:555-605`.
- [x] **Task 39**: Write 5 cases for `listClientOnlineProjects` (RED). GREEN — `onlineProject.test.js:995-1063`.
- [x] **Task 40**: Implement. `listClientOnlineProjects_onlineProject` queries `online_projects` by `clientId` (admin override via `adminOnBehalf`), supports status filter + limit. GREEN — `onlineProject.js:611-660`.
- [x] **Task 41**: Write 5 cases for `listProviderOnlineProjects` (RED). GREEN — `onlineProject.test.js:1065-1132`.
- [x] **Task 42**: Implement. `listProviderOnlineProjects_onlineProject` queries by `providerId` (admin override), supports status filter + limit. GREEN — `onlineProject.js:666-714`.

**Phase 2 verification**: 72/72 online-project tests pass (66 lifecycle + 2 rule-only dispatch + 4 dispatch surface); 290/290 across service+onlineProject suites (no regressions). 11 `it.skip` placeholders remain for Phases 3-7 actions (1 analytics + 3 negotiation + 4 deliverables + 1 payment + 2 helpers).

### Phase 3 — Analytics (1 action, 5 cases)

- [ ] **Task 43**: Write 5 cases for `getProjectAnalytics` (RED).
- [ ] **Task 44**: Implement. GREEN.

### Phase 4 — Negotiation (3 actions, 29 cases including 1 race)

- [ ] **Task 45**: Write 10 cases for `negotiateProject` including 1 race condition test (RED).
- [ ] **Task 46**: Implement. Use Firestore transaction to read latest `Pending` offer and `Superseded` prior offers. GREEN.
- [ ] **Task 47**: Write 10 cases for `acceptCounterOffer` (RED).
- [ ] **Task 48**: Implement. GREEN.
- [ ] **Task 49**: Write 9 cases for `rejectCounterOffer` (including asymmetry: client rejecting provider's last offer → `Declined`; provider rejecting client's last offer → stays `Negotiating`) (RED).
- [ ] **Task 50**: Implement. GREEN.

### Phase 5 — Deliverables (4 actions, 40 cases)

- [ ] **Task 51**: Write 11 cases for `submitDeliverable` (RED).
- [ ] **Task 52**: Implement. GREEN.
- [ ] **Task 53**: Write 10 cases for `approveDeliverable` (RED).
- [ ] **Task 54**: Implement. GREEN.
- [ ] **Task 55**: Write 9 cases for `requestRevision` (including `revisionsRemaining === 0` auto-escalation) (RED).
- [ ] **Task 56**: Implement. GREEN.
- [ ] **Task 57**: Write 10 cases for `markMilestoneApproved` (RED).
- [ ] **Task 58**: Implement. GREEN.

### Phase 6 — Payment (1 action, 10 cases)

- [ ] **Task 59**: Write 10 cases for `recordPayment` (RED).
- [ ] **Task 60**: Implement. GREEN.

### Phase 7 — Internal helpers (17 cases)

- [ ] **Task 61**: Write 12 cases for `isValidOnlineProjectTransition` (all 9 statuses × valid + 1 negative each) (RED).
- [ ] **Task 62**: Implement. Refactor to share the transition map. GREEN.
- [ ] **Task 63**: Write 5 cases for `deductReputationForLateReschedule` (RED).
- [ ] **Task 64**: Implement. GREEN.

### Phase 8 — Notification + Media wiring (no separate test file)

- [ ] **Task 65**: Modify `notification.js`: add 8 `NOTIFICATION_TYPES` constants + 8 `generateNotificationHref` cases. Re-run `onlineProject.test.js` happy paths; existing side-effect assertions (Section 3.6 of template) will already use the new constants via the standard pattern. GREEN.
- [ ] **Task 66**: Modify `media.js`: register `ProjectBriefAttachment` in all 6 touchpoints + add `initProjectBriefUpload` action. The `createOnlineProject` happy path test (Task 27) covers the 2-step flow indirectly. No new test file.

### Phase 9 — Security rules + indexes

- [ ] **Task 67**: Write 8 cases for `firestore.rules.test.js` milestone metadata exception (RED, since rules not updated).
- [ ] **Task 68**: Update `firestore.rules` with `online_projects` + 3 subcollection match blocks + milestone metadata rule exception. GREEN.
- [ ] **Task 69**: Add `project-briefs/{ownerId}/{file}` to `storage.rules`.
- [ ] **Task 70**: Add 6 new composite indexes to `firestore.indexes.json`.
- [ ] **Task 71**: Re-run full suite (`npm test`); all ~202 cases pass.

### Phase 10 — Frontend (12 no-test items)

- [ ] **Task 72**: Create `onlineProjectCanisterService.ts` (18 action methods + 3 subcollection methods `getBrief`/`getNegotiations`/`getDeliverables`).
- [ ] **Task 73**: Create `useOnlineProject.tsx` hook (client-side, real-time via `onSnapshot` on project + 3 subcollections).
- [ ] **Task 74**: Create `useProviderOnlineProject.tsx` hook (provider-side, same shape).
- [ ] **Task 75**: Create 3 client pages: `CreateProject` (brief form), `MyProjectsIndex` (status tabs), `ClientProjectDetail`.
- [ ] **Task 76**: Create 3 provider pages: `ProviderProjects` (status tabs), `ProviderProjectDetail`, `ProviderDeliveredProjects` (portfolio filter).
- [ ] **Task 77**: Modify `pages/provider/services/add.tsx`: add Step 0 serviceMode selector + package type field.
- [ ] **Task 78**: Modify `pages/client/service/[id].tsx`: dynamic CTA (Book Now / Request Project / both) based on `service.serviceMode`.
- [ ] **Task 79**: Modify `pages/provider/home.tsx`: add "Projects" top-level tab.
- [ ] **Task 80**: Modify `pages/client/home.tsx`: add serviceMode filter chip.
- [ ] **Task 81 (NEW — Gap 7)**: Modify `pages/client/categories/[slug].tsx`: add serviceMode filter (All / In-Person / Online). Filter the service list when chip is set.
- [ ] **Task 82 (NEW — Gap 8)**: Modify `pages/provider/service-details/[id].tsx`: display 4 new fields (serviceMode, negotiable, allowsMilestones, onlineDeliveryFormat) for the provider's own services.
- [ ] **Task 83 (NEW — Gap 9)**: Modify `pages/client/search-results.tsx`: add serviceMode filter dropdown. Filter search results by serviceMode when set.

### Phase 11 — Wiki batch update (deferred per decision)

- [ ] **Task 84**: Update [[Online Projects]] with final action count, getOnlineProject return shape (project doc only), implementation status.
- [ ] **Task 85**: Update [[Service and Booking Models]] with 4 new Service fields, 3 new categories, ServicePackage 3-type union.
- [ ] **Task 86**: Update [[Booking System]] with note: "Phase 2 deferred; scheduledSessions[] tests will live in `booking.test.js`."
- [ ] **Task 87**: Update [[Notification System]] with 8 new types + href table.
- [ ] **Task 88**: Update [[Media and Images]] with `ProjectBriefAttachment` implemented.
- [ ] **Task 89**: Update [[Firebase Hybrid Architecture]] with new function count (after Phase 1: +1 `onlineProjectAction`; +1 `initProjectBriefUpload` action in existing `mediaAction`).
- [ ] **Task 90**: Create new wiki page: `[[Online Project Test Infrastructure]]` with coverage matrix (mirrors `[[Booking Test Infrastructure]]`).
- [ ] **Task 91**: Create new wiki page: `[[Service Online Test Infrastructure]]` with coverage matrix.
- [ ] **Task 92**: Create new wiki page: `[[Firestore Rules Test Infrastructure]]` documenting the rules-unit-testing pattern.
- [ ] **Task 93**: Append to `log.md` per page.

---

## Total: 93 tasks

**Estimated test cases**: 144 (onlineProject) + 50 (service.online) + 8 (rules) = **202 cases**

---

## Open Items (to resolve during implementation)

- `isValidOnlineProjectTransition` — exact transition map. Wiki says 9 statuses; spec §6.6 says 9. Confirm during Phase 7 (Task 62).
- `deductReputationForLateReschedule` — spec says Phase 2 only. Wiki says it's planned. Confirm during Phase 7 (Task 64): implement now (testable but not invoked) or defer to Phase 2 with no test?
- `packageType: 'Session'` rejection message — should match the spec's other error patterns (`/PERMISSION_DENIED|not authorized/i`) or be its own (`/session packages.*Phase 2/i`).
- Frontend `serviceMode` filter chip default state — `All` (default) / `Online` (since this is the new feature)?
- **Task 23 (Gap 2)**: `weeklySchedule === null` vs `=== undefined` — match existing `!weeklySchedule` pattern from `setServiceAvailability` (line 2301).
- **Task 25 (Gap 4)**: Use Firestore transaction in `createServicePackage_service` to prevent race conditions when updating `Service.price`.
- **Deferred Gap 5/6 (payment method restrictions)**: Future ticket. `createOnlineProject` currently accepts any `paymentMethod`. Need to add `paymentMethod: 'CashOnHand'` and `paymentMethod: 'GCash'` rejection (SRVWallet only per §8.1).
- **3 new categories (Task 26)**: Description fields use my drafts ("Online digital and creative services: web dev, design, marketing", etc.). Spec doesn't define them; frontend team to review.

---

## Cross-References

- [[Online Projects]] — wiki page for the OnlineProject design
- [[Booking Test Infrastructure]] — the test pattern to follow
- [[Service Test Infrastructure]] — closest analogue (new field validation)
- [[Unit Test Creation Checklist]] — 8-step reusable checklist
- [[Booking Test QA Findings 2026-06-28]] — 3 critical bugs and lessons learned
- [[Grill Record: Online Services Integration]] — design review decision record
- [[Service and Booking Models]] — entity definitions
- [[Notification System]] — notification dispatch pattern
- [[Media and Images]] — 6-touchpoint media type registration
- [[Firebase Hybrid Architecture]] — Cloud Functions overview
- `docs/OnlineService.md` — canonical specification (ratified 2026-06-27)
