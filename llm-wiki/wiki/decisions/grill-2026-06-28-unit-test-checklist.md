---
tags: [grill, decision-record, testing, quality-assurance]
date: 2026-06-28
related:
  - [[Unit Test Creation Checklist]]
  - [[Booking Test Infrastructure]]
  - [[Booking Test QA Findings 2026-06-28]]
  - [[Functions Lint Report]]
---

# Grill Record: Unit Test Creation Checklist

## Plan Summary

User requested a reusable wiki checklist for creating unit tests for the other Cloud Functions in `functions/src/`, codifying the patterns from `booking.test.js` and the QA lessons from the 2026-06-28 review. The checklist should be SRV-specific, action-oriented, and applicable to all 4 function types present in the codebase (action-dispatch callable, scheduled, Firestore trigger, internal helper).

## Design Tree

```
Unit Test Creation Checklist
├── Step 0: Read First (wiki pages + Firebase docs) → decision: cite existing patterns
├── Step 1: Function Discovery → decision: 8-question intake per function
│   ├── Entrypoint type
│   ├── Auth model
│   ├── Side effects
│   ├── State machine
│   └── External dependencies
├── Step 2: Test Infrastructure Setup → decision: extend existing test/mocha.js
│   ├── COLLECTIONS_TO_CLEAR
│   ├── New entity seeders
│   ├── New scenario seeders
│   └── Import constants from source
├── Step 3: Per-Action Test Matrix (the 7-case minimum) → decision: explicit checklist
│   ├── Happy path
│   ├── Auth errors × 3 (unauth, wrong-role, stranger)
│   ├── Validation errors
│   ├── Doc-not-found
│   ├── State-machine errors
│   ├── Side effects (asserted in happy path)
│   └── Idempotency
├── Step 4: Cross-Cutting Edge Cases → decision: 6 categories
│   ├── Boundary values
│   ├── Empty results
│   ├── Conflict/duplicate guards
│   ├── Silent error swallowing
│   ├── Provider-or-client initiation
│   └── Admin-on-behalf
├── Step 5: Code Quality Standards → decision: enforce via checklist
│   ├── Constants (NOTIFICATION_TYPES, CANCELLATION_PENALTY)
│   ├── Error regex patterns
│   ├── Seed function conventions
│   ├── Assertion style
│   └── No mocking
├── Step 6: Patterns by Function Type → decision: 4 separate sections
│   ├── Action-dispatch callable
│   ├── Scheduled function
│   ├── Firestore trigger
│   └── Internal helper / pure function
├── Step 7: Pre-Flight Checklist → decision: 9 items before merge
└── Step 8: Wiki Updates → decision: link to existing test infrastructure page
```

## Key Decisions

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Where to put the checklist? | `llm-wiki/wiki/operations/unit-test-creation-checklist.md` | Other ops/QA docs live here (lint reports, test infrastructure) |
| What scope? | All 4 function types in `functions/src/` | Codifies the pattern, not function-specific |
| How prescriptive? | Step-by-step with explicit checkboxes | Maximizes reusability; the "1 file = 1 function" mental model is too narrow |
| Include the 7-case matrix? | Yes, as a per-action checklist | This was the gap that caused the 0/11 doc-not-found miss in booking.test.js |
| Include anti-patterns? | Yes, explicit "what NOT to do" section | Each anti-pattern comes from a real bug in the booking review |
| Include booking test stats as reference? | Yes, at the bottom | Concrete evidence the checklist works |
| Should we also produce grill record? | Yes (per skill protocol) | Documents the design rationale for future reference |

## Flagged Contradictions

None. The checklist is consistent with all existing wiki pages:
- [[Booking Test Infrastructure]] — same test stack, same seed helpers
- [[Booking Test QA Findings 2026-06-28]] — checklist steps derived directly from the QA findings
- [[Functions Lint Report]] finding #6 (no test files) — checklist is the implementation path to resolve the remaining functions

## Wiki Updates Needed

None required. The checklist is a new page that links to existing pages. No existing page needs modification.

However, future updates will be needed:
- After the first non-booking function is tested using this checklist, update [[Booking Test Infrastructure]] to reflect the new function family
- The "remaining test backlog" section in [[Functions Lint Report]] should be updated to reference this checklist as the implementation guide

## Open Questions / Blockers

- [ ] Non-blocking: Should scheduled functions export their handler separately? `booking.js` and `service.js` wrap the handler inside `onSchedule(...)` — to test them, the handler must be exported separately. Recommend refactoring scheduled functions to export `exports.handlerName = async () => {...}` separately from the `onSchedule` wrapper. This is a pre-requisite for testing the scheduled functions using this checklist.
- [ ] Non-blocking: Should the 6 scattered touchpoints in `media.js` (per [[Media and Images]]) be a separate checklist? For now, the `mediaAction` tests can follow the standard action-dispatch pattern; the 6 touchpoints are a separate concern (adding a new media type, not testing).

## Source

The checklist was derived from:
1. `functions/test/booking.test.js` — 97 passing tests, 17 actions
2. `functions/src/booking.js` — full source review during the QA pass
3. [[Booking Test QA Findings 2026-06-28]] — 3 critical bugs, ~30 recommended tests
4. The 4 function types found in `functions/src/`: action-dispatch (11 functions), scheduled (6 functions), Firestore trigger (2 functions), internal helper (`phLocationData.js`, `utils/*`)

## Output

- `llm-wiki/wiki/operations/unit-test-creation-checklist.md` — 8-step checklist, 4 function-type patterns, anti-patterns section
- `llm-wiki/wiki/decisions/grill-2026-06-28-unit-test-checklist.md` — this decision record
- `llm-wiki/wiki/index.md` — Operations category updated
- `llm-wiki/wiki/log.md` — grill log entry appended
