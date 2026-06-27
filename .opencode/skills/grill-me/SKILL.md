---
name: grill-me
description: >
  Interview the user relentlessly about every aspect of a plan — feature specs,
  architecture decisions, implementation approaches — until reaching a shared
  understanding. Walks each branch of the design tree, resolves dependencies
  between decisions one-by-one, cross-references the SRV project wiki, and
  produces a structured decision record.
version: 1.0.0
license: MIT
---

# Grill-Me — Relentless Design Reviewer

**You MUST use this skill when the user presents a plan, spec, architecture change, or implementation approach.**

This skill interviews the user about every aspect of a proposed plan until reaching a shared understanding. It walks each branch and component of the design tree, resolves dependencies between decisions one-by-one, cross-references the SRV wiki for consistency, and records the outcome.

## When to Use

Use this skill when the user:

- Says **"Grill me on \<topic\>"** or **"Review this plan"** or any explicit activation
- **Presents a design doc, spec, or plan** (proactive detection — the skill activates when you see a detailed proposed plan, not a casual question)
- **Asks for a design review** of an architectural change, feature, or refactor
- **Starts a conversation** about a significant implementation that touches multiple subsystems

Do NOT use when:

- The user asks a simple factual question ("how does X work?")
- The user reports a bug or asks for debugging help
- The user gives a direct instruction ("implement feature X") without asking for review

## Trigger Phrases (Explicit)

The user can activate Grill-Me with any of these phrases:

- "Grill me on \<plan/topic\>"
- "Review this plan"
- "Review this design"
- "Interview me about \<topic\>"
- "Walk through \<plan\> with me"
- "Design review this"

Proactive detection: if the user shares a long-form document, spec, or proposal (e.g., asking "what do you think of this approach?" or dropping a link to a doc), treat it as an implicit activation.

## The Grill Method

### Phase 1: Detect and Map

1. **Identify the plan type**: Feature spec, architecture change, implementation plan, refactor, or other.
2. **Locate existing context**: Check `llm-wiki/wiki/` for relevant pages, `llm-wiki/raw/` for existing specs, and `docs/` for design docs. Read any pages that intersect with the plan's domain.
3. **Validate the Activation**: If triggered proactively, ask the user once: *"I detect a plan. Should I grill you on this?"* If yes, proceed. If no, disengage.
4. **Map the design tree**: Break the plan into components — entities, decisions, dependencies, touchpoints. Present the tree back to the user for confirmation before walking it.

### Phase 2: Walk Each Branch

For every node in the design tree, in dependency order:

1. **State your understanding**: "I understand X works like this — is that correct?"
2. **Probe for gaps**: "What happens when Y fails?" / "How does this handle Z?"
3. **Flag contradictions**: If the plan contradicts a documented pattern in the wiki, surface it. Example: "The wiki says all Cloud Functions use the action-dispatch pattern, but this proposes a standalone endpoint. Was this intentional?"
4. **Check wiki consistency**: After resolving each branch, note whether the existing wiki pages need updates. Append to a running "Wiki Updates Needed" list.
5. **Resolve before descending**: Do not walk sub-branches until the parent decision is locked. Flag blocking dependencies explicitly.

#### Question Templates (by domain)

**Entities / Data Models**:
- What new Firestore collections or subcollections does this introduce?
- What fields are indexed? What query patterns will hit those indexes?
- Is there a risk of the 1MB document size limit being hit?
- Are timestamps `string` (ISO 8601) to match the `Booking` and `Service` convention?

**Backend / Cloud Functions**:
- Does this follow the action-dispatch pattern (`actionName` → switch → handler)?
- What state machine does this introduce? What are the valid transitions?
- Is `isValidTransition()` enforced server-side?
- Are writes wrapped in Firestore transactions where atomicity matters?
- Does this need a new callable, a Firestore trigger, or a scheduled function?
- Are notifications dispatched on lifecycle events?

**Frontend**:
- Does this need a new service module or hook?
- Is real-time (`onSnapshot`) or one-time fetch appropriate?
- Does this component need to be mobile-compatible (Expo/RN)?
- Are there Zustand stores or React Contexts involved?
- Does this use TanStack Query? What's the stale/GC strategy?

**Media / Uploads**:
- Is this a two-step init→upload flow (matching `ChatAttachment` / `ProjectBriefAttachment`)?
- What are the 6 scattered touchpoints in `media.js` that need updating?
- What's the max file size? Does `validateFileSize` need a new case?

**Auth / Security**:
- Does this need Firestore security rules updates?
- Is the write path gated through a callable (back-end enforced), or client-side?
- What role(s) can perform this action?

**Existing Patterns to Reference**:
- Action-dispatch Cloud Functions (`bookingAction`, `serviceAction`, `reputationAction`, etc.)
- Two-step media upload (`initXxxUpload` → client uploads directly to Storage)
- Firestore subcollections + transactions (like `negotiations/{offerId}`)
- State machines with `isValidTransition()` (like `Booking`, `OnlineProject`)
- Callable-only mutations (no direct Firestore client writes)
- ISO 8601 string timestamps (`createdAt`, `updatedAt`)
- 10 predefined categories in Firestore `categories` collection

### Phase 3: Resolve Dependencies

Before descending into sub-branches:

1. Identify decisions the current branch depends on.
2. If unresolved, ask the user to decide before proceeding.
3. If the user cannot decide, flag as a **blocking open question** and record it in the output.

### Phase 4: Completion Checklist

The session is complete when ALL of the following are true:

- ☐ All branches of the design tree have been walked
- ☐ All known dependencies between decisions have been resolved
- ☐ AI has no remaining open questions about the plan
- ☐ Contradictions with wiki / existing patterns have been flagged (not necessarily resolved — user decides)
- ☐ A decision record has been written to `llm-wiki/wiki/decisions/`
- ☐ User confirms shared understanding ("yes, that's right" / "looks good")

The user may say **"I'm satisfied"** or **"let's move on"** at any point to override and skip remaining items. Log any skipped items in the decision record.

## Output: Decision Record

After each Grill-Me session, write a structured document to:

```
llm-wiki/wiki/decisions/grill-YYYY-MM-DD-topic-slug.md
```

### Format

```markdown
---
tags: [grill, decision-record]
date: YYYY-MM-DD
related:
  - [[Related Wiki Page]]
  - [[Another Page]]
---

# Grill Record: \<Topic Title\>

## Plan Summary

One-paragraph description of what was being reviewed.

## Design Tree

```
Root
├── Component A → decision: X
│   └── Sub-component A1 → decision: Y
├── Component B → decision: Z
└── Component C → [blocking: needs auth decision]
```

## Key Decisions

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Should X be a Firestore subcollection? | Yes | Matches negotiations pattern, avoids 1MB doc limit |
| What cache strategy for Y? | 5min stale, 24h GC | Matches TanStack Query pattern |

## Flagged Contradictions

- Wiki page `[[Backend Pattern]]` claims X, but plan proposes Y — user confirmed Y is intentional, wiki needs update

## Wiki Updates Needed

- `llm-wiki/wiki/backend/<page>.md` — update X to reflect this decision
- `llm-wiki/wiki/frontend/<page>.md` — add section for new component

## Open Questions / Blockers

- [ ] Blocking: Need to decide on auth strategy before walking Component C
- [ ] Non-blocking: Should thumbnails be generated server-side or client-side?

## Source

User's plan / spec / conversation (embed key excerpts or reference paths)
```

### Update Index and Log

1. Add an entry in `llm-wiki/wiki/index.md` under the **Decisions** category:

   ```markdown
   - [[Grill Record: Topic Title]] — Design review decision record (YYYY-MM-DD)
   ```

2. Append to `llm-wiki/wiki/log.md`:

   ```markdown
   ## [YYYY-MM-DD] grill | Topic Title

   - Grilled plan for \<topic\>
   - Walked N branches, resolved M dependencies
   - Flagged K contradictions with wiki
   - Output: `wiki/decisions/grill-YYYY-MM-DD-topic-slug.md`
   ```

## Project-Specific Context

This skill is calibrated for the **SRV monorepo**. When grilling, the AI should draw on:

### Wiki Knowledge Base
- **26 wiki pages** at `llm-wiki/wiki/` covering architecture, backend, frontend, domain, decisions, and operations
- **Decision records** at `llm-wiki/wiki/decisions/` — existing decisions that constrain new plans
- **Raw specs** at `llm-wiki/raw/specs/` — reference designs like `OnlineService.md`
- **Wiki consistency check**: Before and after each session, verify whether the plan renders any wiki page stale. Flag these for the user.

### Architectural Patterns (SRV-specific)
| Pattern | Description |
|---------|-------------|
| **Action-dispatch** | Cloud Functions use a single `onCall` entrypoint + `switch (action)` dispatcher |
| **State machine** | Entities enforce valid transitions server-side via `isValidTransition()` |
| **Firestore subcollections** | Nested data stored in subcollections, written inside transactions |
| **Two-step upload** | `initXxxUpload` → client uploads directly to Storage (no base64) |
| **Callable-only writes** | No direct Firestore client writes; all mutations go through callable functions |
| **ISO 8601 timestamps** | `createdAt`/`updatedAt` as `string` (not Firestore `Timestamp`) |
| **TanStack Query defaults** | 5min stale, 24h GC, 2 retries |
| **Zustand + Context** | Zustand for shared data (location), React Context for auth/notifications |
| **zkLogin auth** | Google OAuth → Sui zkLogin → Firebase custom token bridge |
| **6 touchpoints** | `media.js` type registration spans 6 scattered locations |

## Usage Examples

### Example 1: Explicit Activation
**User**: "Grill me on this plan to add coupon codes to the booking flow"

**AI**:
1. Reads booking-system.md, service-and-booking-models.md, firebase-architecture.md
2. Maps design tree: Coupon entity → validation logic → discount application → payment reconciliation
3. Starts walking: "You need a new Firestore collection for coupons. What indexes? ... You apply the discount at booking creation. Does this affect the GCash escrow amount? ... The wiki says payment statuses are PENDING/PAID_HELD/RELEASED — where does coupon refund fit in a cancellation?"
4. Produces decision record in `llm-wiki/wiki/decisions/grill-2026-06-27-coupon-codes.md`

### Example 2: Proactive Detection
**User**: "I'm thinking we should move all chat to a real-time database instead of Firestore."

**AI**: "I detect a significant architecture change. Should I grill you on this? (Yes / No)"

User: "Yes."

**AI**:
1. Reads chat-system.md, firebase-hybrid-architecture.md, services-layer.md
2. Maps design tree: data model migration → real-time sync → message ordering → notification triggers → cost analysis
3. Probes: "Firestore chat uses `onSnapshot` with 200ms debounce. What latency improvement justifies the migration? ... The `onMessageCreated` Cloud Function trigger won't work with Realtime Database — how do notifications fire? ... The wiki documents 5 remaining gaps in chat — are any of these addressed by the migration?"

## Common Mistakes

**Grilling too shallow**: Walking branches without resolving dependencies first. Always confirm the parent decision before descending.

**Grilling too deep prematurely**: Don't ask about thumbnail generation strategy before confirming the media type registration pattern.

**Missing wiki cross-refs**: Always check the wiki. If the plan touches a documented domain, read those pages before starting the interview.

**Assuming the user has all answers**: When the user says "I don't know" for a blocking dependency, flag it as an open question and recommend a path forward based on existing patterns.
