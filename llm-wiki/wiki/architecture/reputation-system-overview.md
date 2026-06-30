---
tags: [architecture, reputation]
date: 2026-06-16
sources:
  - functions/src/reputation.js
  - functions/src/utils/reputationMath.js
related:
  - [[Reputation Service (Firestore)]]
  - [[Reputation System ICP]]
  - [[Reputation System Sui]]
  - [[Reputation Scoring Algorithm]]
  - [[Gemini Review Analysis]]
---

# Reputation System Overview

Reputation and trust scoring system running as a Firebase Cloud Function (`reputationAction`). Reputation data lives in Firestore (not on blockchain), computed using JavaScript math utilities ported from the original Motoko canister.

## Actual Architecture (Runtime)

- **Firestore** — `reputations/{userId}` documents store trust scores, trust levels, completed bookings, and detection flags
- **Firebase Cloud Function** — `reputationAction` (onCall) handles all reputation operations via action dispatch
- **`reputationMath.js`** — Pure JS utility with scoring constants, Bayesian average, penalty logic
- **No blockchain interaction** — The original ICP canister-based design was replaced with a Firestore-native approach for simplicity

## Scoring (0–100 scale)

| Component | Max Points | Notes |
|---|---|---|
| Base Score | 50.0 | Starting point for all users |
| Booking Activity | 20 | Points = completed bookings (capped) |
| Rating Quality | 20 | Bayesian average of received ratings (1–5 scale converted) |
| Account Age | 10 | Maxes out at ~365 days |
| Recency | 4.5 | 30d > 90d > 180d windows (effectively) |
| Consistency Bonus | 5 | 4.0+ avg over 5+ bookings |
| Frequency Score | 1 | Bookings per month (effectively) |
| **Provider Experience** | 5 | Milestones at 10/25/50 bookings |

## Legacy Design (ICP Canister)

The original design used an IC canister for tamper-proof scoring. See [[Reputation System ICP]] for the Motoko reference architecture. The Sui Move module (`srv_reputation::reputation`) at `src/backend/` is a parallel experiment — see [[Reputation System Sui]].

## Key Design Principles (Still Apply)

- **Bayesian average** prevents score manipulation for new users with few ratings
- **Deduction logic** penalizes providers when Bayesian average drops below 3.0 (client scoring has no such penalty)
- **Anti-manipulation flags** detect review bombing, competitive manipulation, fake evidence, identity fraud, abusive content, and other suspicious activity (see [[Reputation Scoring Algorithm]] for penalties)
- **AI-powered review analysis** via Firestore-triggered Gemini analysis (see [[Gemini Review Analysis]])
