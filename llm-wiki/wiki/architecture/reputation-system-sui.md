---
tags: [architecture, backend, reputation, sui]
date: 2026-06-16
sources:
  - raw/specs/REPUTATION_SUI.md
  - functions/src/utils/reputationMath.js
related:
  - [[Reputation System Overview]]
  - [[Reputation Service (Firestore)]]
  - [[Reputation Scoring Algorithm]]
---

# Reputation System — Sui Blockchain (Standalone Module)

> **Note**: The Sui Move module (`srv_reputation::reputation`) exists at `src/backend/` as a standalone blockchain experiment. It is NOT connected to the production Firebase Functions layer. The production system uses a Firestore-native JS implementation (see [[Reputation Service (Firestore)]]).

## Module Structure

- `ReputationScore` — per-user reputation objects (transferable)
- `ReputationRegistry` — shared global registry
- `ReviewStore` — shared review storage
- `HistoryStore` — per-user history tracking

## Scoring Constants (Sui, 0–10000 scale)

| Constant | Value |
|---|---|
| `BASE_SCORE` | 5000 |
| `MAX_BOOKING_POINTS` | 2000 |
| `MAX_AGE_POINTS` | 1000 |
| `CANCELLATION_PENALTY` | 500 |

## Key Differences from JS Implementation

- **Scale**: Sui uses 0–10000 (JS uses 0–100)
- **Provider bonus**: Sui provider base is 5500 (JS: 50 + 25 booking points)
- **Sentiment**: Sui uses keyword-based (not LLM); JS uses Gemini via cloud function
- **Analysis**: Sui has basic flag checks; Gemini provides deeper pattern detection

## Detection Flags

| Flag | Trigger |
|---|---|
| `FLAG_FAKE_EVIDENCE` | Rating ≤100 with empty comment |
| `FLAG_ABUSIVE_CONTENT` | Banned keywords found |
| `FLAG_OTHER` | Rating >500 |

## Integration Status

**Not integrated.** There is no bridge code in `functions/` that calls the Sui module. This remains a potential future direction for distributed reputation portability.
