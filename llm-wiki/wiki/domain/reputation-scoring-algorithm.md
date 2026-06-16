---
tags: [domain, reputation]
date: 2026-06-16
sources:
  - functions/src/utils/reputationMath.js
  - raw/specs/reputation_system.md
  - raw/specs/comprehensive_reputation_system.md
related:
  - [[Reputation System Overview]]
  - [[Reputation Service (Firestore)]]
  - [[Gemini Review Analysis]]
---

# Reputation Scoring Algorithm

The actual scoring algorithm as implemented in `functions/src/utils/reputationMath.js` (ported from Motoko). Uses a 0–100 scale.

## Constants

| Constant | Value |
|---|---|
| `BASE_SCORE` | 50.0 |
| `MAX_BOOKING_POINTS` | 20.0 |
| `MAX_AGE_POINTS` | 10.0 |
| `CANCELLATION_PENALTY` | 5.0 |
| `CONSISTENCY_BONUS` | 5.0 |
| `RECENCY_WEIGHT` | 0.3 |
| `ACTIVITY_FREQUENCY_WEIGHT` | 0.1 |

## Bayesian Average

```
bayesian = (avg * count + 3.0 * 2.0) / (count + 2.0)
```

- Prior Mean: 3.0
- Confidence Threshold: 2.0

## Client Trust Score

```
BASE_SCORE (50)
+ booking_points (min(20, completed))
+ rating_points (bayesian_avg - 1.0) * 5.0) clamped [0, 20]
+ age_points (min(10, age_days / 36.5))
+ consistency_bonus (5 if 5+ bookings and avg >= 4.0, or 3 if avg >= 3.5)
+ recency * 0.3  (15 if <30d, 10 if <90d, 5 if <180d, else 0)
+ frequency * 0.1 (10 if 5+/mo, 7 if 3+/mo, 4 if 1+/mo)
- flag_penalties (capped at 50% of score)
* 0.8 if <3 bookings AND <30 days old
```

## Provider Trust Score

```
BASE_SCORE (50)
+ completion_points (min(25, completed * 1.25))
+ rating_quality (bayesian-based, with different multipliers)
  - if avg < 3.0: penalty of (3 - avg) * 2.0 (< 3 bks) or * 8.0 (3+ bks)
  - if avg >= 3.0: reward of (avg - 3) * 2.5 (< 3 bks) or * 12.5 (3+ bks)
+ age_points (same as client)
+ consistency_bonus (up to 10 based on avg rating tier, 5 at 10+ bookings)
+ recency * 0.3 (same as client)
+ frequency * 0.1 (same as client)
+ experience_bonus (5 at 50+, 3 at 25+, 1 at 10+ bookings)
- flag_penalties (capped at 40% of score)
* 0.9 if <3 bookings AND <30 days old
```

## Trust Level Thresholds

| Level | Score Range |
|---|---|
| New | 0–20 |
| Low | 20–50 |
| Medium | 50–80 |
| High | 80–100 |
| VeryHigh | >100 |

## Penalties

| Flag | Deduction | Stacking |
|---|---|---|
| ReviewBomb | 15 + 5 if multiple flags | Capped at 50% of score (clients) / 40% (providers) |
| CompetitiveManipulation | 15 + 5 if multiple flags | Same |
| FakeEvidence | 10 + 3 if multiple flags | Same |
| IdentityFraud | 15 + 10 if multiple flags | Same |
| AbusiveContent | 20 + 10 if multiple flags | Same |
| Cancellation | 5 pts flat | Applied separately in `deductReputationForCancellationInternal` |

## Review Weighting

A review's impact on reputation depends on the reviewer's own trust score (0.5x–1.5x), trust level bonuses, review quality (length and detail), and time decay (180-day half-life). See [[Gemini Review Analysis]] for AI-based content analysis.
