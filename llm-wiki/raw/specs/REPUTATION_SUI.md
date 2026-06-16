# Sui Reputation Module Documentation

## Overview

The `srv_reputation::reputation` module implements an on-chain reputation and trust scoring system for the SRV service marketplace on the Sui blockchain. It tracks trust scores for both clients and providers using a multi-factor algorithm with Bayesian averaging, time-decay, and anti-manipulation detection.

## Module Structure

```move
module srv_reputation::reputation
```

### Key Capabilities

- **Per-user reputation tracking** via `ReputationScore` objects (transferable)
- **Global registry** via `ReputationRegistry` (shared object)
- **Review storage** via `ReviewStore` (shared object)
- **History tracking** via `HistoryStore` (per-user, transferable)

## Constants

### Scoring Constants

| Constant               | Value | Description                            |
| ---------------------- | ----- | -------------------------------------- |
| `BASE_SCORE`           | 5000  | Starting trust score for new users     |
| `MAX_BOOKING_POINTS`   | 2000  | Maximum points from booking completion |
| `MAX_AGE_POINTS`       | 1000  | Maximum points from account age        |
| `MIN_TRUST_SCORE`      | 0     | Minimum possible trust score           |
| `MAX_TRUST_SCORE`      | 10000 | Maximum possible trust score           |
| `CANCELLATION_PENALTY` | 500   | Points deducted for cancellations      |

### Bayesian Parameters

| Constant                        | Value | Description                         |
| ------------------------------- | ----- | ----------------------------------- |
| `BAYESIAN_CONFIDENCE_THRESHOLD` | 200   | Weight of prior in Bayesian average |
| `BAYESIAN_PRIOR_MEAN`           | 300   | Prior mean (neutral baseline)       |

### Review Weight Parameters

| Constant                      | Value             | Description              |
| ----------------------------- | ----------------- | ------------------------ |
| `MAX_REVIEW_WEIGHT`           | 200               | Maximum review influence |
| `MIN_REVIEW_WEIGHT`           | 10                | Minimum review influence |
| `REVIEW_AGE_HALFLIFE_DAYS_NS` | 15552000000000000 | ~180 days in nanoseconds |

### Trust Level Thresholds

| Level     | Score Range | Constant              |
| --------- | ----------- | --------------------- |
| NEW       | 0-2000      | `THRESHOLD_LOW`       |
| LOW       | 2001-5000   | `THRESHOLD_MEDIUM`    |
| MEDIUM    | 5001-8000   | `THRESHOLD_HIGH`      |
| HIGH      | 8001-10000  | `THRESHOLD_VERY_HIGH` |
| VERY_HIGH | >10000      | (above max)           |

## Data Structures

### ReputationRegistry

Shared object storing global reputation statistics.

```move
public struct ReputationRegistry has key {
    id: UID,
    admin: address,
    total_users: u64,
    total_trust_score: u128,
    trust_level_counts: TrustLevelCounts,
}
```

### ReputationScore

Per-user reputation object (transferred to user).

```move
public struct ReputationScore has key, store {
    id: UID,
    user: address,
    trust_score: u64,
    trust_level: u8,
    completed_bookings: u64,
    total_bookings: u64,
    rating_sum: u64,
    rating_count: u64,
    detection_flags: vector<u8>,
    created_at: u64,
    updated_at: u64,
}
```

### Review

Review record stored in shared `ReviewStore`.

```move
public struct Review has store, drop {
    id: String,
    booking_id: String,
    client_id: address,
    provider_id: address,
    service_id: String,
    rating: u64,
    comment: String,
    status: u8,
    quality_score: u64,
    created_at: u64,
}
```

### HistoryStore

Per-user reputation history (transferable to user).

```move
public struct HistoryStore has key {
    id: UID,
    user: address,
    entries: vector<ReputationHistory>,
}
```

## Public Functions

### Initialization

#### `initialize_registry(ctx: &mut TxContext)`

Creates the shared `ReputationRegistry` object. Should be called once during deployment.

```move
public fun initialize_registry(ctx: &mut TxContext)
```

#### `initialize_reputation(registry: &mut ReputationRegistry, ctx: &mut TxContext): ID`

Creates a new `ReputationScore` for the caller and registers them in the global registry.

```move
public fun initialize_reputation(
    registry: &mut ReputationRegistry,
    ctx: &mut TxContext
): ID
```

#### `initialize_review_store(ctx: &mut TxContext)`

Creates the shared `ReviewStore` for storing reviews.

```move
public fun initialize_review_store(ctx: &mut TxContext)
```

#### `initialize_history(user: address, ctx: &mut TxContext)`

Creates a `HistoryStore` for tracking user's reputation history.

```move
public fun initialize_history(user: address, ctx: &mut TxContext)
```

### Trust Score Calculation

#### `calculate_trust_score_client(...)`

Calculates trust score for a client:

```
BASE_SCORE (5000)
+ booking_points (completed/total * MAX_BOOKING_POINTS)
+ rating_points (average_rating * 3000 / 500)
+ recency_points
+ activity_frequency_points
- detection_flags_penalty (flags * 500)
```

```move
public fun calculate_trust_score_client(
    completed_bookings: u64,
    total_bookings: u64,
    average_rating: u64,
    account_age_ns: u64,
    detection_flags_len: u64
): u64
```

#### `calculate_trust_provider(...)`

Calculates trust score for a provider:

```
BASE_SCORE + 500 (5500)
+ booking_points (completed/total * MAX_BOOKING_POINTS * 1.2)
+ rating_points
+ recency_points
+ activity_frequency_points
+ completion_bonus (500 at 10 bookings, 250 at 5)
- detection_flags_penalty
```

```move
public fun calculate_trust_provider(
    completed_bookings: u64,
    total_bookings: u64,
    average_rating: u64,
    account_age_ns: u64,
    detection_flags_len: u64
): u64
```

### Helper Functions

#### `determine_trust_level(trust_score: u64): u8`

Maps a trust score to its corresponding level (0-4).

```move
public fun determine_trust_level(trust_score: u64): u8
```

#### `clamp_score(score: u64): u64`

Clamps score to valid range [0, 10000].

```move
public fun clamp_score(score: u64): u64
```

#### `calculate_bayesian_average(current_average: u64, count: u64): u64`

Applies Bayesian smoothing to prevent low-count rating manipulation:

```
(count * average + confidence_threshold * prior_mean) / (count + confidence_threshold)
```

```move
public fun calculate_bayesian_average(
    current_average: u64,
    count: u64
): u64
```

#### `calculate_review_weight(...)`

Calculates time-decayed review weight based on reviewer trust level and review age.

```move
public fun calculate_review_weight(
    _reviewer_trust_score: u64,
    trust_level: u8,
    quality_score: u64,
    review_age_ns: u64
): u64
```

#### `calculate_recency(completed_bookings: u64, account_age_ns: u64): u64`

Awards points for recent activity within 30/90/180 day windows.

```move
public fun calculate_recency(
    completed_bookings: u64,
    account_age_ns: u64
): u64
```

#### `calculate_activity_freq(completed_bookings: u64, account_age_ns: u64): u64`

Awards points for booking frequency (bookings per month).

```move
public fun calculate_activity_freq(
    completed_bookings: u64,
    account_age_ns: u64
): u64
```

### Content Analysis

#### `analyze_review(comment: &String, rating: u64): vector<u8>`

Analyzes a review for problematic content and returns flags:

- `FLAG_ABUSIVE_CONTENT` (4) - Contains abusive keywords
- `FLAG_FAKE_EVIDENCE` (2) - Low rating with no comment
- `FLAG_OTHER` (5) - Invalid rating (>500)

```move
public fun analyze_review(
    comment: &String,
    rating: u64
): vector<u8>
```

#### `calculate_sentiment(text: &String): u64`

Performs keyword-based sentiment analysis (100-500 range):

- Base score: 300
- +50 per positive keyword found
- -50 per negative keyword found

```move
public fun calculate_sentiment(text: &String): u64
```

### State Mutations

#### `update_user_rep(...)`

Updates a client's reputation score.

```move
public fun update_user_rep(
    registry: &mut ReputationRegistry,
    score: &mut ReputationScore,
    completed: u64,
    total: u64,
    account_age_ns: u64,
    ctx: &mut TxContext
)
```

#### `update_provider_rep(...)`

Updates a provider's reputation score.

```move
public fun update_provider_rep(
    registry: &mut ReputationRegistry,
    score: &mut ReputationScore,
    completed: u64,
    total: u64,
    account_age_ns: u64,
    ctx: &mut TxContext
)
```

#### `process_review(...)`

Processes a bidirectional review (both client and provider rate each other).

```move
public fun process_review(
    registry: &mut ReputationRegistry,
    client_score: &mut ReputationScore,
    provider_score: &mut ReputationScore,
    rating: u64,
    comment: String,
    ctx: &mut TxContext
)
```

#### `process_provider_review(...)`

Processes a unidirectional review (provider rates client).

```move
public fun process_provider_review(
    registry: &mut ReputationRegistry,
    client_score: &mut ReputationScore,
    rating: u64,
    comment: String,
    ctx: &mut TxContext
)
```

#### `deduct_for_cancellation(...)`

Applies cancellation penalty to a user's score.

```move
public fun deduct_for_cancellation(
    registry: &mut ReputationRegistry,
    score: &mut ReputationScore,
    ctx: &mut TxContext
)
```

#### `set_trust_score(...)`

Admin-only function to manually set a user's trust score.

```move
public fun set_trust_score(
    registry: &mut ReputationRegistry,
    score: &mut ReputationScore,
    new_score: u64,
    ctx: &mut TxContext
)
```

#### `delete_reputation(...)`

Removes a user's reputation from the registry.

```move
public fun delete_reputation(
    registry: &mut ReputationRegistry,
    score: ReputationScore,
    ctx: &mut TxContext
)
```

### Getters

| Function                         | Returns                             |
| -------------------------------- | ----------------------------------- |
| `get_trust_score(score)`         | `u64`                               |
| `get_trust_level(score)`         | `u8`                                |
| `get_completed_bookings(score)`  | `u64`                               |
| `get_total_bookings(score)`      | `u64`                               |
| `get_user(score)`                | `address`                           |
| `get_created_at(score)`          | `u64`                               |
| `get_updated_at(score)`          | `u64`                               |
| `get_average_rating(score)`      | `u64`                               |
| `get_detection_flags(score)`     | `&vector<u8>`                       |
| `get_reputation_stats(registry)` | `(u64, u64, TrustLevelCounts)`      |
| `get_admin(registry)`            | `address`                           |
| `is_admin(registry, addr)`       | `bool`                              |
| `get_reputation_data(score)`     | `(address, u64, u8, u64, u64, u64)` |
| `get_trust_level_counts(counts)` | `(u64, u64, u64, u64, u64)`         |
| `get_review_count(store)`        | `u64`                               |
| `get_history_count(history)`     | `u64`                               |

## Detection Flags

The system uses the following flags to mark problematic content:

| Flag                            | Value | Trigger                        |
| ------------------------------- | ----- | ------------------------------ |
| `FLAG_REVIEW_BOMB`              | 0     | (Defined but not implemented)  |
| `FLAG_COMPETITIVE_MANIPULATION` | 1     | (Defined but not implemented)  |
| `FLAG_FAKE_EVIDENCE`            | 2     | Rating ≤100 with empty comment |
| `FLAG_IDENTITY_FRAUD`           | 3     | (Defined but not implemented)  |
| `FLAG_ABUSIVE_CONTENT`          | 4     | Contains banned keywords       |
| `FLAG_OTHER`                    | 5     | Rating >500                    |

## Abusive Keywords

The following keywords trigger `FLAG_ABUSIVE_CONTENT`:

`scam`, `fraud`, `thief`, `stole`, `liar`, `idiot`, `stupid`, `fuck`, `shit`, `asshole`, `bitch`, `damn`, `hell`, `crap`

## Sentiment Keywords

**Positive** (adds 50 points): `great`, `excellent`, `amazing`, `good`, `wonderful`, `fantastic`, `love`, `best`, `perfect`, `recommend`

**Negative** (subtracts 50 points): `bad`, `terrible`, `awful`, `worst`, `hate`, `disappointing`, `poor`, `horrible`, `avoid`, `scam`

## Trust Level Transitions

| Score      | Level         |
| ---------- | ------------- |
| 0-2000     | NEW (0)       |
| 2001-5000  | LOW (1)       |
| 5001-8000  | MEDIUM (2)    |
| 8001-10000 | HIGH (3)      |
| >10000     | VERY_HIGH (4) |

## Integration Guide

### Initializing the System

1. Deploy the reputation module
2. Call `initialize_registry()` once
3. Call `initialize_review_store()` once

### Registering a User

```move
// As the user
let id = reputation::initialize_reputation(&mut registry, ctx);

// The user now owns their ReputationScore object
```

### Processing a Booking Completion

```move
// Update both client and provider reputation
reputation::update_user_rep(&mut registry, &mut client_score, completed, total, age_ns, ctx);
reputation::update_provider_rep(&mut registry, &mut provider_score, completed, total, age_ns, ctx);
```

### Recording a Review

```move
// Full bidirectional review
reputation::process_review(
    &mut registry,
    &mut client_score,
    &mut provider_score,
    rating,
    comment,
    ctx
);

// Or provider-only review
reputation::process_provider_review(
    &mut registry,
    &mut client_score,
    rating,
    comment,
    ctx
);
```

### Handling Cancellations

```move
reputation::deduct_for_cancellation(&mut registry, &mut score, ctx);
```

## Error Codes

| Code | Meaning                                     |
| ---- | ------------------------------------------- |
| 0    | Authorization failure (non-admin operation) |

## Constants Summary

```move
// Scoring
const BASE_SCORE: u64 = 5000;
const MAX_BOOKING_POINTS: u64 = 2000;
const MAX_AGE_POINTS: u64 = 1000;
const MIN_TRUST_SCORE: u64 = 0;
const MAX_TRUST_SCORE: u64 = 10000;
const CANCELLATION_PENALTY: u64 = 500;

// Bayesian
const BAYESIAN_CONFIDENCE_THRESHOLD: u64 = 200;
const BAYESIAN_PRIOR_MEAN: u64 = 300;

// Review Weight
const MAX_REVIEW_WEIGHT: u64 = 200;
const MIN_REVIEW_WEIGHT: u64 = 10;
const REVIEW_AGE_HALFLIFE_DAYS_NS: u64 = 15552000000000000;

// Thresholds
const THRESHOLD_LOW: u64 = 2000;
const THRESHOLD_MEDIUM: u64 = 5000;
const THRESHOLD_HIGH: u64 = 8000;
const THRESHOLD_VERY_HIGH: u64 = 10000;

// Trust Levels
const TRUST_LEVEL_NEW: u8 = 0;
const TRUST_LEVEL_LOW: u8 = 1;
const TRUST_LEVEL_MEDIUM: u8 = 2;
const TRUST_LEVEL_HIGH: u8 = 3;
const TRUST_LEVEL_VERY_HIGH: u8 = 4;

// Review Status
const REVIEW_STATUS_VISIBLE: u8 = 0;
const REVIEW_STATUS_HIDDEN: u8 = 1;
const REVIEW_STATUS_FLAGGED: u8 = 2;
```

## Security Considerations

1. **Admin functions**: `set_trust_score` is restricted to the registry admin
2. **Score clamping**: All scores are clamped to prevent overflow
3. **Flag penalties**: Excessive flags reduce trust score to 0 (not negative)
4. **Underflow protection**: Registry totals use u128 to prevent overflow

## Testing

Run tests with:

```bash
sui move test --filter reputation
```

Test categories include:

- Trust level determination
- Score clamping
- Bayesian averaging
- Sentiment analysis
- Abuse detection
- Recency/activity calculations
- Full integration scenarios

## Dependencies

```move
use std::string::{Self, String};
use std::vector;
use sui::object::{Self, UID, ID};
use sui::transfer;
use sui::tx_context::{Self, TxContext, sender};
```
