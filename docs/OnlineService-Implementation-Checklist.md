# Online Services Phase 1 — Test-Driven Implementation Checklist

**Status**: Ready to begin
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
| Frontend tests | None; list 7 frontend tasks as no-test items |
| Internal helpers | Test both `isValidOnlineProjectTransition` + `deductReputationForLateReschedule` |
| `getOnlineProject` | Returns project doc only; subcollections via separate `onSnapshot` |
| `service.online.test.js` | 4 fields + ServicePackage `type` |
| Implementation order | Lifecycle → Negotiation → Deliverables → Housekeeping |
| Seed helpers | Full online-project seed family (~15 new helpers) |
| Wiki updates | Batch at end |
| Test runner | Auto-included via existing glob; new log file |

---

## Test Target Summary

| Test file | Status | Cases |
|---|---|---|
| `onlineProject.test.js` | NEW | ~144 (18 actions + 1 race + 2 helpers) |
| `service.online.test.js` | NEW | ~29 (4 Service fields + ServicePackage `type` validation) |
| `firestore.rules.test.js` | NEW | ~8 (milestone metadata rule exception) |
| `booking.test.js` | modified | 0 (Phase 2 — deferred) |
| `service.test.js` | modified | 0 (new field tests live in `service.online.test.js`) |
| `notification.test.js` | n/a | 0 (doesn't exist; assertions inline in `onlineProject.test.js`) |
| `media.test.js` | n/a | 0 (doesn't exist; upload flow tested in `createOnlineProject`) |
| **Total** | | **~181 cases** |

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

### `service.online.test.js` (29 cases)

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
| `functions/test/service.online.test.js` | NEW | 4 new Service fields + ServicePackage `type` validation (~29 cases) |
| `functions/test/firestore.rules.test.js` | NEW | Rules test for milestone metadata exception (~8 cases) |
| `functions/src/service.js` | MODIFIED | Add 4 new Service field validation; add `ServicePackage.type` validation |
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

**Total: 75 tasks across 12 phases. Each task follows the TDD loop: (1) write test → (2) confirm RED → (3) implement → (4) confirm GREEN → (5) refactor.**

### Phase 0 — Scaffolding (no business logic)

- [ ] **Task 1**: Create `functions/src/onlineProject.js` skeleton with `exports.onlineProjectAction = onCall(...)` + `switch` dispatching to 18 unimplemented handlers (each throws "not yet implemented"). Skeleton compiles.
- [ ] **Task 2**: Write `functions/test/onlineProject.test.js` with `describe("onlineProjectAction")` + 18 empty `describe` blocks (one per action) + 2 helper `describe` blocks. Skeleton test passes (RED, since all actions return `HttpsError("internal")`).
- [ ] **Task 3**: Modify `functions/test/mocha.js`: add `online_projects`, `online_projects/.../briefs`, `online_projects/.../negotiations`, `online_projects/.../deliverables` to `COLLECTIONS_TO_CLEAR`; add `test-output-onlineProject.log`, `test-output-service-online.log`, `test-output-rules.log` to `LOG_FILES`; add routing logic in `logFileForTest`.
- [ ] **Task 4**: Modify `functions/test/helpers/seed.js`: add the 15 new helpers listed above.
- [ ] **Task 5**: Add `@firebase/rules-unit-testing` to `functions/package.json` devDependencies; `npm install`.
- [ ] **Task 6**: Create `functions/test/firestore.rules.test.js` skeleton with rules-unit-testing setup; describe blocks for milestone metadata tests (RED, since rules not yet updated).
- [ ] **Task 7**: Create `scripts/backfillOnlineServiceFields.js` (one-time script, no test).

### Phase 1 — Service entity (29 cases, ~12 tasks)

- [ ] **Task 8**: Write `service.online.test.js` test: `createService` with `serviceMode: 'InPerson'` + `negotiable: true` → `permission-denied` (RED).
- [ ] **Task 9**: Implement: `service.js` `createService_service` validates `InPerson` + `negotiable`. GREEN.
- [ ] **Task 10**: TDD: `createService` with `serviceMode: 'InPerson'` + `onlineDeliveryFormat: 'live'` → `permission-denied`. GREEN.
- [ ] **Task 11**: TDD: `createService` with `serviceMode: 'InPerson'` + `allowsMilestones: true` → `permission-denied`. GREEN.
- [ ] **Task 12**: TDD: `createService` with `serviceMode: 'Online'` + all 4 fields set → success. GREEN.
- [ ] **Task 13**: TDD: `createService` with `serviceMode: 'Hybrid'` + all 4 fields set → success. GREEN.
- [ ] **Task 14**: TDD: `createService` with `serviceMode: 'Online'` + `onlineDeliveryFormat` omitted → `invalid-argument`. GREEN.
- [ ] **Task 15**: TDD: `createService` with `serviceMode: 'Online'` + `onlineDeliveryFormat: 'invalid'` → `invalid-argument`. GREEN.
- [ ] **Task 16**: TDD: `createService` with `serviceMode: 'invalid'` → `invalid-argument`. GREEN.
- [ ] **Task 17**: TDD: `ServicePackage.type='Fixed'` accepts no extra fields. GREEN.
- [ ] **Task 18**: TDD: `ServicePackage.type='Milestone'` requires `milestones[]` (9 boundary cases). GREEN.
- [ ] **Task 19**: TDD: `ServicePackage.type='Session'` accepts session params + boundary cases (8 cases). GREEN.
- [ ] **Task 20**: TDD: `ServicePackage.type` missing → `invalid-argument`. GREEN.
- [ ] **Task 21**: TDD: `ServicePackage.type` invalid value → `invalid-argument`. GREEN.
- [ ] **Task 22**: Refactor `service.js` to share validation logic via a single `validateServiceMode(serviceMode, negotiable, allowsMilestones, onlineDeliveryFormat)` helper. Re-run all 29 tests. GREEN.

### Phase 2 — OnlineProject lifecycle (8 actions, 66 cases)

- [ ] **Task 23**: Write 11 cases for `createOnlineProject` (RED).
- [ ] **Task 24**: Implement: `createOnlineProject_project` function. Validates `service.serviceMode !== 'InPerson'`, validates `packageType !== 'Session'`, creates project + brief in transaction. GREEN.
- [ ] **Task 25**: Write 9 cases for `acceptProject` (RED).
- [ ] **Task 26**: Implement. GREEN.
- [ ] **Task 27**: Write 9 cases for `declineProject` (RED).
- [ ] **Task 28**: Implement. GREEN.
- [ ] **Task 29**: Write 12 cases for `cancelProject` (including `workStarted` boundary + reports doc + reputation deduction) (RED).
- [ ] **Task 30**: Implement. GREEN.
- [ ] **Task 31**: Write 10 cases for `disputeProject` (RED).
- [ ] **Task 32**: Implement. GREEN.
- [ ] **Task 33**: Write 5 cases for `getOnlineProject` (client/provider/admin/stranger/empty — doc-only return) (RED).
- [ ] **Task 34**: Implement. GREEN.
- [ ] **Task 35**: Write 5 cases for `listClientOnlineProjects` (RED).
- [ ] **Task 36**: Implement. GREEN.
- [ ] **Task 37**: Write 5 cases for `listProviderOnlineProjects` (RED).
- [ ] **Task 38**: Implement. GREEN.

### Phase 3 — Analytics (1 action, 5 cases)

- [ ] **Task 39**: Write 5 cases for `getProjectAnalytics` (RED).
- [ ] **Task 40**: Implement. GREEN.

### Phase 4 — Negotiation (3 actions, 29 cases including 1 race)

- [ ] **Task 41**: Write 10 cases for `negotiateProject` including 1 race condition test (RED).
- [ ] **Task 42**: Implement. Use Firestore transaction to read latest `Pending` offer and `Superseded` prior offers. GREEN.
- [ ] **Task 43**: Write 10 cases for `acceptCounterOffer` (RED).
- [ ] **Task 44**: Implement. GREEN.
- [ ] **Task 45**: Write 9 cases for `rejectCounterOffer` (including asymmetry: client rejecting provider's last offer → `Declined`; provider rejecting client's last offer → stays `Negotiating`) (RED).
- [ ] **Task 46**: Implement. GREEN.

### Phase 5 — Deliverables (4 actions, 40 cases)

- [ ] **Task 47**: Write 11 cases for `submitDeliverable` (RED).
- [ ] **Task 48**: Implement. GREEN.
- [ ] **Task 49**: Write 10 cases for `approveDeliverable` (RED).
- [ ] **Task 50**: Implement. GREEN.
- [ ] **Task 51**: Write 9 cases for `requestRevision` (including `revisionsRemaining === 0` auto-escalation) (RED).
- [ ] **Task 52**: Implement. GREEN.
- [ ] **Task 53**: Write 10 cases for `markMilestoneApproved` (RED).
- [ ] **Task 54**: Implement. GREEN.

### Phase 6 — Payment (1 action, 10 cases)

- [ ] **Task 55**: Write 10 cases for `recordPayment` (RED).
- [ ] **Task 56**: Implement. GREEN.

### Phase 7 — Internal helpers (17 cases)

- [ ] **Task 57**: Write 12 cases for `isValidOnlineProjectTransition` (all 9 statuses × valid + 1 negative each) (RED).
- [ ] **Task 58**: Implement. Refactor to share the transition map. GREEN.
- [ ] **Task 59**: Write 5 cases for `deductReputationForLateReschedule` (RED).
- [ ] **Task 60**: Implement. GREEN.

### Phase 8 — Notification + Media wiring (no separate test file)

- [ ] **Task 61**: Modify `notification.js`: add 8 `NOTIFICATION_TYPES` constants + 8 `generateNotificationHref` cases. Re-run `onlineProject.test.js` happy paths; existing side-effect assertions (Section 3.6 of template) will already use the new constants via the standard pattern. GREEN.
- [ ] **Task 62**: Modify `media.js`: register `ProjectBriefAttachment` in all 6 touchpoints + add `initProjectBriefUpload` action. The `createOnlineProject` happy path test (Task 23) covers the 2-step flow indirectly. No new test file.

### Phase 9 — Security rules + indexes

- [ ] **Task 63**: Write 8 cases for `firestore.rules.test.js` milestone metadata exception (RED, since rules not updated).
- [ ] **Task 64**: Update `firestore.rules` with `online_projects` + 3 subcollection match blocks + milestone metadata rule exception. GREEN.
- [ ] **Task 65**: Add `project-briefs/{ownerId}/{file}` to `storage.rules`.
- [ ] **Task 66**: Add 6 new composite indexes to `firestore.indexes.json`.
- [ ] **Task 67**: Re-run full suite (`npm test`); all ~181 cases pass.

### Phase 10 — Frontend (7 no-test items)

- [ ] **Task 68**: Create `onlineProjectCanisterService.ts` (18 action methods + 3 subcollection methods `getBrief`/`getNegotiations`/`getDeliverables`).
- [ ] **Task 69**: Create `useOnlineProject.tsx` hook (client-side, real-time via `onSnapshot` on project + 3 subcollections).
- [ ] **Task 70**: Create `useProviderOnlineProject.tsx` hook (provider-side, same shape).
- [ ] **Task 71**: Create 3 client pages: `CreateProject` (brief form), `MyProjectsIndex` (status tabs), `ClientProjectDetail`.
- [ ] **Task 72**: Create 3 provider pages: `ProviderProjects` (status tabs), `ProviderProjectDetail`, `ProviderDeliveredProjects` (portfolio filter).
- [ ] **Task 73**: Modify `pages/provider/services/add.tsx`: add Step 0 serviceMode selector + package type field.
- [ ] **Task 74**: Modify `pages/client/service/[id].tsx`: dynamic CTA (Book Now / Request Project / both) based on `service.serviceMode`.
- [ ] **Task 75**: Modify `pages/provider/home.tsx`: add "Projects" top-level tab.
- [ ] **Task 76**: Modify `pages/client/home.tsx`: add serviceMode filter chip.

### Phase 11 — Wiki batch update (deferred per decision)

- [ ] **Task 77**: Update [[Online Projects]] with final action count, getOnlineProject return shape (project doc only), implementation status.
- [ ] **Task 78**: Update [[Service and Booking Models]] with 4 new Service fields, 3 new categories, ServicePackage 3-type union.
- [ ] **Task 79**: Update [[Booking System]] with note: "Phase 2 deferred; scheduledSessions[] tests will live in `booking.test.js`."
- [ ] **Task 80**: Update [[Notification System]] with 8 new types + href table.
- [ ] **Task 81**: Update [[Media and Images]] with `ProjectBriefAttachment` implemented.
- [ ] **Task 82**: Update [[Firebase Hybrid Architecture]] with new function count (after Phase 1: +1 `onlineProjectAction`; +1 `initProjectBriefUpload` action in existing `mediaAction`).
- [ ] **Task 83**: Create new wiki page: `[[Online Project Test Infrastructure]]` with coverage matrix (mirrors `[[Booking Test Infrastructure]]`).
- [ ] **Task 84**: Create new wiki page: `[[Service Online Test Infrastructure]]` with coverage matrix.
- [ ] **Task 85**: Create new wiki page: `[[Firestore Rules Test Infrastructure]]` documenting the rules-unit-testing pattern.
- [ ] **Task 86**: Append to `log.md` per page.

---

## Total: 86 tasks (1 milestone = 86 completed tasks)

**Estimated test cases**: 144 (onlineProject) + 29 (service.online) + 8 (rules) = **181 cases**

---

## Open Items (to resolve during implementation)

- `isValidOnlineProjectTransition` — exact transition map. Wiki says 9 statuses; spec §6.6 says 9. Confirm during Phase 7 (Task 58).
- `deductReputationForLateReschedule` — spec says Phase 2 only. Wiki says it's planned. Confirm during Phase 7 (Task 60): implement now (testable but not invoked) or defer to Phase 2 with no test?
- `packageType: 'Session'` rejection message — should match the spec's other error patterns (`/PERMISSION_DENIED|not authorized/i`) or be its own (`/session packages.*Phase 2/i`).
- Frontend `serviceMode` filter chip default state — `All` (default) / `Online` (since this is the new feature)?

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
