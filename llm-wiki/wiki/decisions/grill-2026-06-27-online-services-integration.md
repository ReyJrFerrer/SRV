---
tags: [grill, decision-record, online-services, architecture]
date: 2026-06-27
related:
  - [[Online Projects]]
  - [[Service Creation Workflow]]
  - [[Service and Booking Models]]
  - [[Booking System]]
  - [[Service Discovery and Listing]]
  - [[Notification System]]
  - [[Media and Images]]
  - [[Chat System]]
---

# Grill Record: Online Services Integration

## Plan Summary

Extend the SRV local-service marketplace with 20 new online services across 3 new top-level categories (Digital & Creative, Business & SME, Education & Specialized Knowledge), supporting two distinct engagement models: product-based (deliverable, negotiation, revisions) and session-based (multi-session bookings, recurring dates). The work builds on the existing [[Online Projects]] design (currently unimplemented) and extends the [[Booking System]] with a `scheduledSessions[]` array. The wiki's online-projects spec is ratified with a few adjustments: negotiation is opt-in via `service.negotiable`, ServicePackage becomes a 3-type discriminated union, and security rules allow provider-side direct milestone writes.

## Design Tree

```
Online Services Integration
├── A. Engagement model split → Product → OnlineProject; Sessions → extended Booking
│   ├── B. ServicePackage → 3 types (Fixed / Milestone / Session) — discriminated union
│   ├── C. Multi-session Booking → scheduledSessions[] array
│   │   ├── C1. Session status: Scheduled / Completed / Rescheduled
│   │   ├── C2. Booking transitions Accepted → InProgress on first start, InProgress → Completed on last completion
│   │   ├── C3. Provider marks session Completed
│   │   └── C4. Reschedule: either party, 24h notice, late = reputation penalty
│   └── D. OnlineProject → 9 statuses, 16-18 actions, negotiation opt-in
│       ├── D1. Negotiation fields: price, deadline, scope, revisionRounds
│       ├── D2. Negotiation subcollection: online_projects/{id}/negotiations/{offerId}
│       └── D3. Direct milestone metadata writes allowed (provider only)
│
├── E. Service entity → add 4 fields
│   ├── E1. serviceMode: 'InPerson' | 'Online' | 'Hybrid'
│   ├── E2. negotiable: boolean
│   ├── E3. allowsMilestones: boolean
│   └── E4. onlineDeliveryFormat: 'live' | 'async' | 'mixed' | null
│
├── F. Categorization → 3 new top-level categories added to Firestore categories collection
│   ├── F1. Digital & Creative Services
│   ├── F2. Business & SME Services
│   └── F3. Education & Specialized Knowledge
│
├── G. Service field optionality for online services
│   ├── G1. location → optional
│   ├── G2. weeklySchedule → optional
│   └── G3. certificateMedia → optional (still recommended for trust)
│
├── H. Provider wizard → new Step 0: serviceMode selection
│
├── I. Discovery → same /client/home + serviceMode filter
│
├── J. Provider dashboard → 2 top-level tabs: 'Bookings' and 'Projects'
│
├── K. Service detail page → single page, dynamic CTA (Book Now / Request Project / both)
│
├── L. Brief → separate doc with attachments (ProjectBriefAttachment media type)
│   └── L1. ProjectBriefAttachment registered in all 6 media.js touchpoints
│
├── M. Payment
│   ├── M1. OnlineProject → SRVWallet manual (no escrow) — amountPaid/paymentStatus forward-compatible
│   ├── M2. Sessions → SRVWallet or GCash upfront
│   └── M3. CashOnHand disabled for online services
│
├── N. Notifications → 8 new types
│   ├── N1. PROJECT_CREATED
│   ├── N2. PROJECT_ACCEPTED
│   ├── N3. PROJECT_DECLINED
│   ├── N4. PROJECT_NEGOTIATION_RECEIVED
│   ├── N5. PROJECT_NEGOTIATION_ACCEPTED
│   ├── N6. DELIVERABLE_SUBMITTED
│   ├── N7. DELIVERABLE_APPROVED
│   └── N8. REVISION_REQUESTED
│
├── O. Security rules → callable-only with provider-milestone-write exception
│
├── P. Firestore indexes → 6 new composite indexes
│
├── Q. Mobile parity → deferred
│
├── R. Rollout → Phase 1 ships online (OnlineProject + 15 product services), Phase 2 ships sessions
│
└── S. Admin tools → reuse existing (adminUserAction, feedbackAction, accountAction)
```

## Key Decisions

| Decision | Resolution | Rationale |
|---|---|---|
| Engagement model split | Product → OnlineProject, Sessions → extended Booking | Matches user's stated direction; reuses the existing (unimplemented) OnlineProject design |
| Service categorization | Add 3 top-level categories | Cleanest; avoids parent/child complexity; 10 → 13 total |
| Service entity | Add `serviceMode` field | One Service collection, conditional validation, supports 'Hybrid' |
| Multi-session schema | `scheduledSessions[]` array on Booking | Simpler than subcollection; ~50 sessions fits 1MB doc limit; per-session status enables reporting |
| OnlineProject negotiation | Opt-in via `service.negotiable` | Not all 15 product services need it (e.g., a 1-page logo); provider decides |
| ServicePackage types | 3-type discriminated union | Reuses existing collection; type-safe schema; per-type UI |
| OnlineProject delivery | Single `deadline` + optional `milestones[]` | Web dev has phases, copywriting has one deadline — both fit |
| Cancellation rules | Inherit existing: no work started = full refund, work started = no refund | Consistency with current system; "work started" = first deliverable submitted / first session started |
| Brief submission | Submitted with project request | Project goes to Pending with brief attached; provider reviews brief before deciding |
| Provider service wizard | New Step 0: serviceMode selection | Single wizard with conditional fields per mode |
| Service detail CTA | Single page, dynamic CTA | Avoids doubling the route table; in-person → "Book Now", online → "Request Project", hybrid → both |
| Provider dashboard | Two top-level tabs (Bookings, Projects) | Clean separation; mixed list is confusing because booking and project statuses differ |
| Negotiation fields | price, deadline, scope, revisionRounds | All 4 are negotiable when `service.negotiable === true` |
| Security rules | Callable-only with provider-milestone-write exception | Mirrors existing `updateProviderAttachments` exception; updates needed to wiki |
| ProjectBriefAttachment | Register now in all 6 media.js touchpoints | Required for brief-with-attachments flow; spec exists in wiki but not implemented |
| Notification types | 8 new lifecycle types | Each state transition needs its own notification for clarity |
| Firestore indexes | 6 new composite indexes | Matches expected query patterns (by clientId/providerId/status, by status/updatedAt) |
| Mobile parity | Deferred | Web proves out first; mobile is a future ticket |
| Rollout | Phase 1 = full online (OnlineProject + 15 product services), Phase 2 = sessions (5 services + multi-session Booking) | User chose "single ship" for Phase 1; validate state machine before scaling sessions |
| Session completion | Provider marks each session Completed; booking auto-transitions | Frictionless; client can confirm but isn't required |
| Session reschedule | Either party, 24h notice, late = reputation penalty | Mirrors existing cancelBooking reputation deduction pattern |
| Provider onboarding | Any provider can create online services | Same as in-person; trust score gate at engagement time filters bad actors |
| Admin tools | Reuse existing (adminUserAction, feedbackAction, accountAction) | No new admin tools in Phase 1; build reactively if needed |
| Service field optionality for online | location, weeklySchedule, certificates all optional | Online services don't need physical presence; certificates still recommended for trust |

## Service-to-Model Mapping

| Category | Service | Model | Package Type |
|---|---|---|---|
| Digital & Creative | Frontend & Backend Web Development | Product | Milestone |
| Digital & Creative | UI/UX Design | Product | Milestone |
| Digital & Creative | CMS Management | Product | Fixed |
| Digital & Creative | IT Support & Troubleshooting | Product (online-only) | Session |
| Digital & Creative | Video Editing | Product | Milestone |
| Digital & Creative | Graphic Design | Product | Fixed |
| Digital & Creative | Copywriting | Product | Fixed |
| Digital & Creative | Digital Marketing & SEO | Product | Milestone |
| Business & SME | Business Registration | Product | Fixed |
| Business & SME | Tax & Financial Consulting | Product | Fixed |
| Business & SME | Legal Contract Drafting | Product | Fixed |
| Business & SME | Bookkeeping & Accounting | Product | Milestone |
| Business & SME | Payroll Management | Product | Milestone |
| Business & SME | Virtual Assistant Services | Product | Milestone |
| Business & SME | Project Management | Product | Milestone |
| Education | Academic Tutoring | Session | Session |
| Education | Business & Startup Coaching | Session | Session |
| Education | Music & Arts Instruction | Session | Session |
| Education | Coding & Software Training | Session | Session |
| Education | Fitness Coaching | Session | Session |

**Count**: 15 product services + 5 session services = 20 total. IT Support is online-only product (not session).

## Flagged Contradictions

- Wiki `[[Online Projects]]` states "all `create`, `update`, `delete` set to `false` — all mutations go through `onlineProjectAction` callable" (line 84). User approved direct provider-side milestone metadata writes (title, dueDate, description). **Wiki needs update** to reflect callable-only as the guideline, with documented exceptions (matches existing `updateProviderAttachments` precedent in `[[Booking System]]`).
- Wiki `[[Service and Booking Models]]` lists 10 categories; this plan adds 3 → 13. Wiki needs update.
- Wiki `[[Firebase Architecture]]` says 20 deployed functions; Phase 1 adds `onlineProjectAction` and `initProjectBriefUpload` to `mediaAction` → 22 functions. Wiki needs update after Phase 1.
- Wiki `[[Media and Images]]` notes `ProjectBriefAttachment` is "planned, not implemented" — Phase 1 implements it. Wiki needs update.
- `[[Online Projects]]` lists 18 actions in total; need to confirm final count after the simplified negotiation model is implemented. Likely reduced if negotiation sub-feature removes some actions.

## Wiki Updates Needed

- `llm-wiki/wiki/backend/online-projects.md` — Update security rules section to reflect callable-only-with-documented-exceptions; confirm action count after Phase 1
- `llm-wiki/wiki/domain/service-and-booking-models.md` — Add `serviceMode`, `negotiable`, `allowsMilestones`, `onlineDeliveryFormat` to Service type; add 3 new categories; document `ServicePackage` 3-type discriminated union; add `scheduledSessions[]` to Booking
- `llm-wiki/wiki/backend/service-creation.md` — Document Step 0 serviceMode selection; document package type field
- `llm-wiki/wiki/backend/booking-system.md` — Document `scheduledSessions[]` array extension; per-session state machine; reschedule action
- `llm-wiki/wiki/frontend/services.md` — Add `onlineProjectCanisterService.ts`; extend `bookingCanisterService.ts` for multi-session
- `llm-wiki/wiki/frontend/state-and-hooks.md` — Add `useOnlineProject.tsx` and `useProviderOnlineProject.tsx`; document extensions to booking hooks
- `llm-wiki/wiki/frontend/routing-and-layouts.md` — Add /client/project/*, /provider/projects/*, /provider/project/:id, /client/project/:id routes
- `llm-wiki/wiki/frontend/media-and-images.md` — Mark `ProjectBriefAttachment` as implemented; document 6 touchpoint entries; document 50MB cap
- `llm-wiki/wiki/backend/notification-system.md` — Add 8 new notification types; document project notification dispatch
- `llm-wiki/wiki/architecture/firebase-hybrid-architecture.md` — Update function count after Phase 1
- `firestore.indexes.json` — Add 6 new composite indexes
- `firestore.rules` — Add online_projects rules

## Open Questions / Blockers

- [ ] Confirm exact `onlineProjectAction` action count (likely 16–18 actions; depends on how the simplified negotiation collapses) — to be resolved during implementation
- [ ] Confirm the wizard Step 0 placement: at the very start, or after Step 1 (Service Details) — UX validation needed
- [ ] Confirm project brief "scope vs requirements" distinction — possibly collapse to one field — to be resolved during UI mockup
- [ ] Confirm deadline suggestion default (e.g., 7 days from creation) when client doesn't pick one — to be resolved in implementation
- [ ] Confirm the notification href table for the 8 new types — to be resolved when routes are added

## Source

User's plan presented 2026-06-27 in conversation, listing 20 new online services across 3 categories. User stated direction: "one is making it a product and multiple-day appointment based system to solve the problem of a one day appointment schedule we have in our service since services here could include products that takes more than a day or tutoring service to make." User requested business + architecture-level review before implementation.
