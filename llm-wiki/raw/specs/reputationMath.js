/**
 * Reputation Math Utility
 *
 * Contains all mathematical constants and functions ported from the Motoko canister.
 * Used for calculating trust scores and trust levels for users and providers.
 */

/**
 * @typedef {'Low' | 'Medium' | 'High' | 'VeryHigh' | 'New'} TrustLevel
 *
 * @typedef {'ReviewBomb' | 'CompetitiveManipulation' | 'FakeEvidence' | 'IdentityFraud' |
 * 'Other' | 'AbusiveContent'} DetectionFlag
 */

const BASE_SCORE = 50.0;
const MAX_BOOKING_POINTS = 20.0;
const MAX_AGE_POINTS = 10.0;
const MIN_TRUST_SCORE = 0.0;
const MAX_TRUST_SCORE = 100.0;
const CANCELLATION_PENALTY = 5.0;

const TRUST_LEVEL_THRESHOLDS = [
  {level: "Low", threshold: 20.0},
  {level: "Medium", threshold: 50.0},
  {level: "High", threshold: 80.0},
  {level: "VeryHigh", threshold: 100.0},
];

const RECENCY_WEIGHT = 0.3;
const CONSISTENCY_BONUS = 5.0;
const ACTIVITY_FREQUENCY_WEIGHT = 0.1;

const BAYESIAN_CONFIDENCE_THRESHOLD = 2.0;
const BAYESIAN_PRIOR_MEAN = 3.0;

const ABUSIVE_KEYWORDS = [
  "scam", "fraud", "thief", "stole", "liar", "idiot",
  "stupid", "fuck", "shit", "asshole", "bitch", "damn",
  "hell", "crap",
];

/**
 * Calculate Bayesian Average
 * @param {number} currentAverage
 * @param {number} count
 * @returns {number} The calculated Bayesian average
 */
function calculateBayesianAverage(currentAverage, count) {
  const n = count;
  const weightedSum = (currentAverage * n) + (BAYESIAN_PRIOR_MEAN * BAYESIAN_CONFIDENCE_THRESHOLD);
  const totalWeight = n + BAYESIAN_CONFIDENCE_THRESHOLD;
  return weightedSum / totalWeight;
}

/**
 * Calculate Recency Score
 * @param {number} completedBookings
 * @param {number} accountAgeMs - timestamp in ms of account creation
 * @returns {number} The calculated recency score
 */
function calculateRecencyScore(completedBookings, accountAgeMs) {
  if (completedBookings === 0) return 0.0;

  const now = Date.now();
  const ageInDays = (now - accountAgeMs) / (24.0 * 60.0 * 60.0 * 1000.0);

  if (ageInDays <= 30.0) return 15.0;
  if (ageInDays <= 90.0) return 10.0;
  if (ageInDays <= 180.0) return 5.0;

  return 0.0;
}

/**
 * Calculate Activity Frequency
 * @param {number} completedBookings
 * @param {number} accountAgeMs - timestamp in ms of account creation
 * @returns {number} The activity frequency score
 */
function calculateActivityFrequency(completedBookings, accountAgeMs) {
  if (completedBookings < 3) return 0.0;

  const now = Date.now();
  const ageInDays = (now - accountAgeMs) / (24.0 * 60.0 * 60.0 * 1000.0);
  const effectiveAgeDays = Math.max(30.0, ageInDays);

  const bookingsPerMonth = completedBookings / (effectiveAgeDays / 30.0);

  if (bookingsPerMonth >= 5.0) return 10.0;
  if (bookingsPerMonth >= 3.0) return 7.0;
  if (bookingsPerMonth >= 1.0) return 4.0;

  return 0.0;
}

/**
 * Determine Trust Level based on score
 * @param {number} trustScore
 * @returns {TrustLevel} The determined trust level
 */
function determineTrustLevel(trustScore) {
  for (const {level, threshold} of TRUST_LEVEL_THRESHOLDS) {
    if (trustScore <= threshold) {
      return level;
    }
  }
  return "VeryHigh";
}

/**
 * Calculate Client Trust Score
 * @param {number} completedBookings
 * @param {number|null} averageRating
 * @param {number} accountAgeMs - timestamp in ms of account creation
 * @param {DetectionFlag[]} flags
 * @returns {number} The client trust score
 */
function calculateTrustScore(completedBookings, averageRating, accountAgeMs, flags = []) {
  let score = BASE_SCORE;

  // 1. Booking Activity Score (max 20 points)
  const bookingPoints = Math.min(MAX_BOOKING_POINTS, completedBookings);
  score += bookingPoints;

  // 2. Rating Quality Score (max 20 points)
  if (averageRating !== null && averageRating !== undefined) {
    const bayesianAvg = calculateBayesianAverage(averageRating, completedBookings);
    const ratingPoints = (bayesianAvg - 1.0) * 5.0;
    score += Math.max(0.0, Math.min(20.0, ratingPoints));
  }

  // 3. Account Age Score (max 10 points)
  const now = Date.now();
  const ageInDays = (now - accountAgeMs) / (24.0 * 60.0 * 60.0 * 1000.0);
  const agePoints = Math.min(MAX_AGE_POINTS, ageInDays / 36.5);
  score += agePoints;

  // 4. Activity Consistency Bonus (up to 5 points)
  if (completedBookings >= 5 && averageRating !== null && averageRating !== undefined) {
    if (averageRating >= 4.0) {
      score += CONSISTENCY_BONUS;
    } else if (averageRating >= 3.5) {
      score += CONSISTENCY_BONUS * 0.6;
    }
  }

  // 5. Recency Weight (up to 15 points)
  const recencyScore = calculateRecencyScore(completedBookings, accountAgeMs);
  score += recencyScore * RECENCY_WEIGHT;

  // 6. Activity Frequency Score (up to 10 points)
  const frequencyScore = calculateActivityFrequency(completedBookings, accountAgeMs);
  score += frequencyScore * ACTIVITY_FREQUENCY_WEIGHT;

  // 7. Penalties for Suspicious Activity
  let penaltyPoints = 0.0;
  for (const flag of flags) {
    switch (flag) {
    case "ReviewBomb":
      penaltyPoints += 15.0 + (flags.length > 1 ? 5.0 : 0);
      break;
    case "CompetitiveManipulation":
      penaltyPoints += 15.0 + (flags.length > 1 ? 5.0 : 0);
      break;
    case "FakeEvidence":
      penaltyPoints += 10.0 + (flags.length > 1 ? 3.0 : 0);
      break;
    case "IdentityFraud":
      penaltyPoints += 15.0 + (flags.length > 1 ? 10.0 : 0);
      break;
    case "Other":
      penaltyPoints += 5.0;
      break;
    case "AbusiveContent":
      penaltyPoints += 20.0 + (flags.length > 1 ? 10.0 : 0);
      break;
    }
  }

  score -= Math.min(penaltyPoints, score * 0.5);

  // 8. Minimum Activity Threshold
  if (completedBookings < 3 && ageInDays < 30.0) {
    score *= 0.8;
  }

  return Math.max(MIN_TRUST_SCORE, Math.min(MAX_TRUST_SCORE, score));
}

/**
 * Calculate Provider Trust Score
 * @param {number} completedBookings
 * @param {number|null} averageRating
 * @param {number} accountAgeMs - timestamp in ms of account creation
 * @param {DetectionFlag[]} flags
 * @returns {number} The provider trust score
 */
function calculateProviderTrustScore(completedBookings, averageRating, accountAgeMs, flags = []) {
  let score = BASE_SCORE;

  // 1. Booking Completion Score (max 25 points)
  const completionPoints = Math.min(25.0, completedBookings * 1.25);
  score += completionPoints;

  // 2. Service Quality Score based on ratings (max 25 points)
  if (averageRating === null || averageRating === undefined) {
    score += 5.0; // Small bonus for new providers
  } else {
    const bayesianAvg = calculateBayesianAverage(averageRating, completedBookings);

    if (bayesianAvg < 3.0) {
      if (completedBookings < 3) {
        const penalty = (3.0 - bayesianAvg) * 2.0;
        score -= penalty;
      } else {
        const penalty = (3.0 - bayesianAvg) * 8.0;
        score -= penalty;
      }
    } else {
      if (completedBookings < 3) {
        const reward = (bayesianAvg - 3.0) * 2.5;
        score += reward;
      } else {
        const reward = (bayesianAvg - 3.0) * 12.5;
        score += reward;
      }
    }
  }

  // 3. Account Age Score (max 10 points)
  const now = Date.now();
  const ageInDays = (now - accountAgeMs) / (24.0 * 60.0 * 60.0 * 1000.0);
  const agePoints = Math.min(MAX_AGE_POINTS, ageInDays / 36.5);
  score += agePoints;

  // 4. Provider Consistency Bonus (up to 10 points)
  if (completedBookings >= 5) {
    if (averageRating !== null && averageRating !== undefined) {
      if (averageRating >= 4.5) {
        score += 10.0;
      } else if (averageRating >= 4.0) {
        score += 7.5;
      } else if (averageRating >= 3.5) {
        score += 5.0;
      }
    } else if (completedBookings >= 10) {
      score += 5.0;
    }
  }

  // 5. Service Activity Recency (up to 15 points)
  const recencyScore = calculateRecencyScore(completedBookings, accountAgeMs);
  score += recencyScore * RECENCY_WEIGHT;

  // 6. Provider Activity Frequency (up to 10 points)
  const frequencyScore = calculateActivityFrequency(completedBookings, accountAgeMs);
  score += frequencyScore * ACTIVITY_FREQUENCY_WEIGHT;

  // 7. Experience Bonus
  if (completedBookings >= 50) {
    score += 5.0;
  } else if (completedBookings >= 25) {
    score += 3.0;
  } else if (completedBookings >= 10) {
    score += 1.0;
  }

  // 8. Penalties for Suspicious Activity
  let penaltyPoints = 0.0;
  for (const flag of flags) {
    switch (flag) {
    case "ReviewBomb":
      penaltyPoints += 15.0 + (flags.length > 1 ? 5.0 : 0);
      break;
    case "CompetitiveManipulation":
      penaltyPoints += 15.0 + (flags.length > 1 ? 5.0 : 0);
      break;
    case "FakeEvidence":
      penaltyPoints += 10.0 + (flags.length > 1 ? 3.0 : 0);
      break;
    case "IdentityFraud":
      penaltyPoints += 15.0 + (flags.length > 1 ? 10.0 : 0);
      break;
    case "Other":
      penaltyPoints += 5.0;
      break;
    case "AbusiveContent":
      penaltyPoints += 20.0 + (flags.length > 1 ? 10.0 : 0);
      break;
    }
  }

  score -= Math.min(penaltyPoints, score * 0.4);

  // 9. New Provider Support
  if (completedBookings < 3 && ageInDays < 30.0) {
    score *= 0.9;
  }

  return Math.max(MIN_TRUST_SCORE, Math.min(MAX_TRUST_SCORE, score));
}

module.exports = {
  BASE_SCORE,
  CANCELLATION_PENALTY,
  ABUSIVE_KEYWORDS,
  calculateTrustScore,
  calculateProviderTrustScore,
  determineTrustLevel,
  calculateBayesianAverage,
};
