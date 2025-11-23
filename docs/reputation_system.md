# Reputation System Documentation

## Overview

Overhaul of SRV's reputations system.

## Key Features

### 1. Bayesian Average Scoring

Instead of a simple arithmetic mean, we now use a **Bayesian Average** for calculating trust scores.

- **Problem**: A new user with one 5-star rating would have a "perfect" score, while a veteran with hundreds of 5-star ratings and one 4-star rating would have a lower score.
- **Solution**: We add "dummy" votes to the calculation to pull the score towards a global average (prior).
- **Formula**: `( (avg_rating * count) + (prior_mean * confidence_threshold) ) / (count + confidence_threshold)`
- **Parameters**:
  - `Prior Mean`: 3.0 (Neutral start to prevent inflation)
  - `Confidence Threshold`: 2.0 (Lower threshold for faster sensitivity)

### 2. Explicit Deductions & Consistency Threshold

Penalizes low ratings while protecting new users from premature score destruction.

- **Deduction Logic**: If the Bayesian Average drops below **3.0**, points are **deducted** from the score instead of added.
  - _Providers_: `(3.0 - Avg) * 12.5` (Max 25 pts deduction)
  - _Clients_: `(3.0 - Avg) * 8.0` (Max 16 pts deduction)

- **Consistency Threshold**:
  - **New Users (< 3 bookings)**:
    - **Low Ratings**: Reduced deduction multiplier (2.0x) to keep score near neutral (50.0).
    - **High Ratings**: Reduced reward multiplier to prevent premature score inflation.
  - **Established Users (>= 3 bookings)**:
    - Full penalties and rewards apply.

### 3. Reputation-Weighted Reviews

Ratings are no longer equal. A rating from a trusted, high-reputation user carries more weight than a rating from a new or low-reputation user.

- **Reviewer Reputation**: 0.5 to 1.5 multiplier based on the reviewer's own trust score.
- **Trust Level Bonus**: Additional multipliers for High/Very High trust levels.
- **Review Quality**: Multiplier based on the quality of the review text (length, sentiment alignment).

### 3. Time Decay

The impact of a review on the "weight" calculation decays over time, ensuring that recent reputation is more relevant.

- **Half-Life**: 180 days.
- **Effect**: Older reviews have slightly less influence on the _weighting_ calculation (though they still count for the average).

### 4. Anti-Manipulation Flags

The system continues to detect and penalize:

- **Review Bombing**: Suspiciously low ratings.
- **Competitive Manipulation**: 5-star ratings with no comments.
- **Sentiment Inconsistency**: Ratings that don't match the text sentiment (verified by LLM).

## Scoring Components

### Client Trust Score

1.  **Booking Activity**: Points for completed bookings.
2.  **Rating Quality**: Bayesian average of ratings received from providers.
3.  **Account Age**: Points for longevity.
4.  **Consistency**: Bonus for maintaining high ratings.
5.  **Recency**: Bonus for recent activity.
6.  **Frequency**: Bonus for frequent usage.

### Provider Trust Score

Similar to clients but with higher emphasis on:

- **Service Completion**: Higher points for completing jobs.
- **Service Quality**: Stricter rating scales.
- **Experience**: Bonus for reaching booking milestones (10, 25, 50 bookings).

## Usage

The reputation score is automatically updated whenever:

- A booking is completed.
- A review is submitted.
- A cancellation occurs (penalty applied).

Developers can access the score via `getReputationScore(principal)`.
