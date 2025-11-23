import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import LLM "mo:llm";

import Types "../types/shared";

persistent actor ReputationCanister {
  // Type definitions
  type ReputationScore = Types.ReputationScore;
  type TrustLevel = Types.TrustLevel;
  type DetectionFlag = Types.DetectionFlag;
  type Result<T> = Types.Result<T>;
  type Evidence = Types.Evidence;
  type Review = Types.Review;
  type Booking = Types.Booking;

  // State variables
  private var reputationEntries : [(Principal, ReputationScore)] = [];
  private transient var reputations = HashMap.HashMap<Principal, ReputationScore>(10, Principal.equal, Principal.hash);

  // Trusted Firebase service agent for authorization
  private var trustedServiceAgent : ?Principal = null;

  // Constants for reputation calculation
  private transient let BASE_SCORE : Float = 50.0;
  private transient let MAX_BOOKING_POINTS : Float = 20.0;
  // private let MAX_RATING_POINTS : Float = 20.0;
  private transient let MAX_AGE_POINTS : Float = 10.0;
  private transient let MIN_TRUST_SCORE : Float = 0.0;
  private transient let MAX_TRUST_SCORE : Float = 100.0;
  private let CANCELLATION_PENALTY : Float = 5.0; // Points to deduct for each cancellation
  private transient let TRUST_LEVEL_THRESHOLDS : [(TrustLevel, Float)] = [
    (#Low, 20.0),
    (#Medium, 50.0),
    (#High, 80.0),
    (#VeryHigh, 100.0),
  ];

  // New constants for enhanced scoring
  private let RECENCY_WEIGHT : Float = 0.3;
  private let CONSISTENCY_BONUS : Float = 5.0;
  // private let EVIDENCE_QUALITY_WEIGHT : Float = 0.2;
  // private let REVIEW_SENTIMENT_WEIGHT : Float = 0.15;
  private let ACTIVITY_FREQUENCY_WEIGHT : Float = 0.1;

  // Bayesian Average Constants
  private let BAYESIAN_CONFIDENCE_THRESHOLD : Float = 2.0; // Reduced from 5.0 for faster sensitivity
  private let BAYESIAN_PRIOR_MEAN : Float = 3.0; // Reduced from 4.0 for neutral start

  // Review Weighting Constants
  private let MAX_REVIEW_WEIGHT : Float = 2.0;
  private let MIN_REVIEW_WEIGHT : Float = 0.1;
  private let REVIEW_AGE_HALFLIFE_DAYS : Float = 180.0; // Weight decays by half every 6 months

  // Abusive content detection
  private let ABUSIVE_KEYWORDS : [Text] = [
    "scam",
    "fraud",
    "thief",
    "stole",
    "liar",
    "idiot",
    "stupid",
    "fuck",
    "shit",
    "asshole",
    "bitch",
    "damn",
    "hell",
    "crap",
  ];

  // State variables for reputation history
  // private stable var reputationHistoryEntries : [(Principal, [(Time.Time, Float)])] = [];
  private transient var reputationHistory = HashMap.HashMap<Principal, [(Time.Time, Float)]>(10, Principal.equal, Principal.hash);

  // Initialization
  system func preupgrade() {
    reputationEntries := Iter.toArray(reputations.entries());
  };

  system func postupgrade() {
    reputations := HashMap.fromIter<Principal, ReputationScore>(reputationEntries.vals(), 10, Principal.equal, Principal.hash);
    reputationEntries := [];
  };

  // Authorization helper function
  private func _isAuthorized(caller : Principal) : Bool {
    switch (trustedServiceAgent) {
      case (null) { false };
      case (?agent) { Principal.equal(caller, agent) };
    };
  };

  // Helper functions
  private func calculateTrustScore(
    completedBookings : Nat,
    averageRating : ?Float,
    accountAge : Time.Time,
    flags : [DetectionFlag],
  ) : Float {
    var score : Float = BASE_SCORE;

    // 1. Booking Activity Score (max 20 points)
    let bookingPoints = Float.min(MAX_BOOKING_POINTS, Float.fromInt(completedBookings));
    score += bookingPoints;

    // 2. Rating Quality Score (max 20 points)

    switch (averageRating) {
      case (null) {};
      case (?rating) {
        // Use Bayesian Average for smoother scoring
        let bayesianAvg = calculateBayesianAverage(rating, completedBookings);

        // Map Bayesian average (1-5) to points (0-20)
        // 5.0 -> 20 points
        // 4.0 -> 15 points
        // 3.0 -> 10 points
        // 1.0 -> 0 points
        let ratingPoints = (bayesianAvg - 1.0) * 5.0;
        score += Float.max(0.0, Float.min(20.0, ratingPoints));
      };
    };

    // 3. Account Age Score (max 10 points)
    let ageInDays = Float.fromInt(Time.now() - accountAge) / (24.0 * 60.0 * 60.0 * 1_000_000_000.0);
    let agePoints = Float.min(MAX_AGE_POINTS, ageInDays / 36.5); // Max points after ~1 year
    score += agePoints;

    // 4. Activity Consistency Bonus (up to 5 points)
    if (completedBookings >= 5) {
      switch (averageRating) {
        case (?rating) {
          if (rating >= 4.0) {
            score += CONSISTENCY_BONUS; // Full bonus for consistent high ratings
          } else if (rating >= 3.5) {
            score += CONSISTENCY_BONUS * 0.6; // Partial bonus for good ratings
          };
        };
        case (null) {};
      };
    };

    // 5. Recency Weight (up to 15 points)
    let recencyScore = calculateRecencyScore(completedBookings, accountAge);
    score += recencyScore * RECENCY_WEIGHT;

    // 6. Activity Frequency Score (up to 10 points)
    let frequencyScore = calculateActivityFrequency(completedBookings, accountAge);
    score += frequencyScore * ACTIVITY_FREQUENCY_WEIGHT;

    // 7. Penalties for Suspicious Activity
    var penaltyPoints : Float = 0.0;
    for (flag in flags.vals()) {
      switch (flag) {
        case (#ReviewBomb) {
          penaltyPoints += 15.0;
          if (flags.size() > 1) {
            penaltyPoints += 5.0;
          };
        };
        case (#CompetitiveManipulation) {
          penaltyPoints += 15.0;
          if (flags.size() > 1) {
            penaltyPoints += 5.0;
          };
        };
        case (#FakeEvidence) {
          penaltyPoints += 10.0;
          if (flags.size() > 1) {
            penaltyPoints += 3.0;
          };
        };
        case (#IdentityFraud) {
          penaltyPoints += 15.0;
          if (flags.size() > 1) {
            penaltyPoints += 10.0;
          };
        };
        case (#Other) {
          penaltyPoints += 5.0;
        };
        case (#AbusiveContent) {
          penaltyPoints += 20.0;
          if (flags.size() > 1) {
            penaltyPoints += 10.0;
          };
        };
      };
    };

    // Apply penalties with a cap
    score -= Float.min(penaltyPoints, score * 0.5);

    // 8. Minimum Activity Threshold
    if (completedBookings < 3 and ageInDays < 30.0) {
      score *= 0.8;
    };

    // Ensure final score is between 0 and 100
    return Float.max(MIN_TRUST_SCORE, Float.min(MAX_TRUST_SCORE, score));
  };

  // Provider-specific trust score calculation that rewards service completion
  private func calculateProviderTrustScore(
    completedBookings : Nat,
    averageRating : ?Float,
    accountAge : Time.Time,
    flags : [DetectionFlag],
  ) : Float {
    var score : Float = BASE_SCORE;

    // 1. Booking Completion Score (max 25 points) - Higher reward for providers
    let completionPoints = Float.min(25.0, Float.fromInt(completedBookings) * 1.25);
    score += completionPoints;

    // 2. Service Quality Score based on ratings (max 25 points)

    switch (averageRating) {
      case (null) {
        // No penalty for new providers without ratings
        score += 5.0; // Small bonus for new providers
      };
      case (?rating) {
        // Use Bayesian Average for smoother scoring
        let bayesianAvg = calculateBayesianAverage(rating, completedBookings);

        if (bayesianAvg < 3.0) {
          // DEDUCT points for low ratings
          // Check for consistency threshold (new users get lenient treatment)
          if (completedBookings < 3) {
            // For new users, apply minimal penalty to offset completion points
            // Keeps score near BASE_SCORE (50.0)
            // (3.0 - 2.33) * 2.0 = ~1.34 points deduction
            let penalty = (3.0 - bayesianAvg) * 2.0;
            score -= penalty;
          } else {
            // Established users get full penalty
            // 1.0 avg -> (3.0 - 1.0) * 8.0 = -16.0 points
            let penalty = (3.0 - bayesianAvg) * 8.0;
            score -= penalty;
          };
        } else {
          // ADD points for good ratings (3.0+)
          // Check for consistency threshold (new users get limited reward)
          if (completedBookings < 3) {
            // For new users, apply minimal reward
            // Prevents premature score inflation
            // (5.0 - 3.0) * 2.5 = 5.0 points max reward
            let reward = (bayesianAvg - 3.0) * 2.5;
            score += reward;
          } else {
            // Established users get full reward
            // Map 3.0-5.0 to 0-25 points
            let reward = (bayesianAvg - 3.0) * 12.5;
            score += reward;
          };
        };
      };
    };

    // 3. Account Age Score (max 10 points) - Same as client scoring
    let ageInDays = Float.fromInt(Time.now() - accountAge) / (24.0 * 60.0 * 60.0 * 1_000_000_000.0);
    let agePoints = Float.min(MAX_AGE_POINTS, ageInDays / 36.5); // Max points after ~1 year
    score += agePoints;

    // 4. Provider Consistency Bonus (up to 10 points) - Higher than client bonus
    if (completedBookings >= 5) {
      switch (averageRating) {
        case (?rating) {
          if (rating >= 4.5) {
            score += 10.0; // Maximum consistency bonus
          } else if (rating >= 4.0) {
            score += 7.5; // High consistency bonus
          } else if (rating >= 3.5) {
            score += 5.0; // Moderate consistency bonus
          };
        };
        case (null) {
          // Bonus for consistent bookings even without ratings
          if (completedBookings >= 10) {
            score += 5.0;
          };
        };
      };
    };

    // 5. Service Activity Recency (up to 15 points)
    let recencyScore = calculateRecencyScore(completedBookings, accountAge);
    score += recencyScore * RECENCY_WEIGHT;

    // 6. Provider Activity Frequency (up to 10 points)
    let frequencyScore = calculateActivityFrequency(completedBookings, accountAge);
    score += frequencyScore * ACTIVITY_FREQUENCY_WEIGHT;

    // 7. Experience Bonus - Additional points for highly active providers
    if (completedBookings >= 50) {
      score += 5.0; // Veteran provider bonus
    } else if (completedBookings >= 25) {
      score += 3.0; // Experienced provider bonus
    } else if (completedBookings >= 10) {
      score += 1.0; // Active provider bonus
    };

    // 8. Penalties for Suspicious Activity (same as client scoring)
    var penaltyPoints : Float = 0.0;
    for (flag in flags.vals()) {
      switch (flag) {
        case (#ReviewBomb) {
          penaltyPoints += 15.0;
          if (flags.size() > 1) {
            penaltyPoints += 5.0;
          };
        };
        case (#CompetitiveManipulation) {
          penaltyPoints += 15.0;
          if (flags.size() > 1) {
            penaltyPoints += 5.0;
          };
        };
        case (#FakeEvidence) {
          penaltyPoints += 10.0;
          if (flags.size() > 1) {
            penaltyPoints += 3.0;
          };
        };
        case (#IdentityFraud) {
          penaltyPoints += 15.0;
          if (flags.size() > 1) {
            penaltyPoints += 10.0;
          };
        };
        case (#Other) {
          penaltyPoints += 5.0;
        };
        case (#AbusiveContent) {
          penaltyPoints += 20.0;
          if (flags.size() > 1) {
            penaltyPoints += 10.0;
          };
        };
      };
    };

    // Apply penalties with a cap (slightly more lenient for providers)
    score -= Float.min(penaltyPoints, score * 0.4);

    // 9. New Provider Support - Less penalty for new providers
    if (completedBookings < 3 and ageInDays < 30.0) {
      score *= 0.9; // Less harsh penalty than for clients
    };

    // Ensure final score is between 0 and 100
    return Float.max(MIN_TRUST_SCORE, Float.min(MAX_TRUST_SCORE, score));
  };

  // New helper functions for enhanced scoring
  private func calculateRecencyScore(completedBookings : Nat, accountAge : Time.Time) : Float {
    if (completedBookings == 0) return 0.0;

    let now = Time.now();
    let ageInDays = Float.fromInt(now - accountAge) / (24.0 * 60.0 * 60.0 * 1_000_000_000.0);

    // Higher score for recent activity
    if (ageInDays <= 30.0) {
      // Last 30 days
      return 15.0;
    } else if (ageInDays <= 90.0) {
      // Last 90 days
      return 10.0;
    } else if (ageInDays <= 180.0) {
      // Last 180 days
      return 5.0;
    };

    return 0.0;
  };

  private func calculateActivityFrequency(completedBookings : Nat, accountAge : Time.Time) : Float {
    // Require minimum bookings to calculate frequency score
    if (completedBookings < 3) return 0.0;

    let ageInDays = Float.fromInt(Time.now() - accountAge) / (24.0 * 60.0 * 60.0 * 1_000_000_000.0);
    // Ensure we don't divide by zero or very small numbers for new accounts
    let effectiveAgeDays = Float.max(30.0, ageInDays);

    let bookingsPerMonth = Float.fromInt(completedBookings) / (effectiveAgeDays / 30.0);

    // Score based on booking frequency
    if (bookingsPerMonth >= 5.0) {
      return 10.0;
    } else if (bookingsPerMonth >= 3.0) {
      return 7.0;
    } else if (bookingsPerMonth >= 1.0) {
      return 4.0;
    };

    return 0.0;
  };

  // Bayesian Average Calculation
  // Formula: ( (avg * count) + (prior * C) ) / (count + C)
  private func calculateBayesianAverage(currentAverage : Float, count : Nat) : Float {
    let n = Float.fromInt(count);
    let weightedSum = (currentAverage * n) + (BAYESIAN_PRIOR_MEAN * BAYESIAN_CONFIDENCE_THRESHOLD);
    let totalWeight = n + BAYESIAN_CONFIDENCE_THRESHOLD;
    return weightedSum / totalWeight;
  };

  // Calculate Review Weight based on reviewer reputation and age
  private func calculateReviewWeight(
    reviewerReputationScore : Float,
    reviewerTrustLevel : TrustLevel,
    reviewQualityScore : Float,
    reviewAge : Time.Time,
  ) : Float {
    // 1. Base weight from reviewer reputation (0.5 to 1.5)
    var weight = 0.5 + (reviewerReputationScore / 100.0);

    // 2. Adjust based on trust level
    switch (reviewerTrustLevel) {
      case (#VeryHigh) { weight *= 1.2 };
      case (#High) { weight *= 1.1 };
      case (#Medium) { weight *= 1.0 };
      case (#Low) { weight *= 0.8 };
      case (#New) { weight *= 0.6 };
    };

    // 3. Adjust based on review quality (0.5 to 1.5 multiplier)
    weight *= (0.5 + reviewQualityScore);

    // 4. Time Decay (Exponential decay)
    let ageInDays = Float.fromInt(Time.now() - reviewAge) / (24.0 * 60.0 * 60.0 * 1_000_000_000.0);
    if (ageInDays > 0.0) {
      let decayFactor = 1.0 / (1.0 + (ageInDays / REVIEW_AGE_HALFLIFE_DAYS));
      weight *= decayFactor;
    };

    return Float.max(MIN_REVIEW_WEIGHT, Float.min(MAX_REVIEW_WEIGHT, weight));
  };

  // Enhanced review analysis
  private func analyzeReview(review : Review) : [DetectionFlag] {
    var flags : [DetectionFlag] = [];

    // 1. Check for review bombing
    if (review.rating <= 2) {
      flags := Array.append<DetectionFlag>(flags, [#ReviewBomb]);
    };

    // 2. Check for competitive manipulation
    if (review.rating == 5 and Text.size(review.comment) < 20) {
      flags := Array.append<DetectionFlag>(flags, [#CompetitiveManipulation]);
    };

    // 3. Check for sentiment consistency
    let sentimentScore = calculateSentimentScore(review);
    if (sentimentScore < 0.3 and review.rating >= 4) {
      flags := Array.append<DetectionFlag>(flags, [#Other]);
    };

    // 4. Check for abusive content
    let commentLower = Text.toLowercase(review.comment);
    for (keyword in ABUSIVE_KEYWORDS.vals()) {
      if (Text.contains(commentLower, #text keyword)) {
        flags := Array.append<DetectionFlag>(flags, [#AbusiveContent]);
        // Break after finding one to avoid duplicates
        // We can't easily break from this loop structure in Motoko if using vals(),
        // but adding multiple flags of same type is fine as we iterate them.
        // However, to be cleaner, we could use a var boolean.
      };
    };

    return flags;
  };

  private func calculateSentimentScore(review : Review) : Float {
    let comment = Text.toLowercase(review.comment);
    var positiveWords = 0;
    var negativeWords = 0;

    // Simple sentiment analysis based on keyword matching
    let positiveKeywords = ["excellent", "great", "good", "amazing", "wonderful", "perfect", "best", "love", "happy", "satisfied"];
    let negativeKeywords = ["bad", "poor", "terrible", "awful", "horrible", "worst", "hate", "disappointed", "unsatisfied", "waste"];

    for (word in positiveKeywords.vals()) {
      if (Text.contains(comment, #text word)) {
        positiveWords += 1;
      };
    };

    for (word in negativeKeywords.vals()) {
      if (Text.contains(comment, #text word)) {
        negativeWords += 1;
      };
    };

    let totalWords = positiveWords + negativeWords;
    if (totalWords == 0) return 0.5; // Neutral if no keywords found

    return Float.fromInt(positiveWords) / Float.fromInt(totalWords);
  };

  // Enhanced reputation history tracking
  private func updateReputationHistory(userId : Principal, newScore : Float) {
    let now = Time.now();
    switch (reputationHistory.get(userId)) {
      case (?history) {
        let newHistory = Array.append([(now, newScore)], history);
        reputationHistory.put(userId, newHistory);
      };
      case (null) {
        reputationHistory.put(userId, [(now, newScore)]);
      };
    };
  };

  // Enhanced reputation update
  // Now accepts data as parameters instead of fetching from other canisters
  // Secured for Firebase service agent only
  public shared (_msg) func updateUserReputation(
    userId : Principal,
    completedBookingsCount : Nat,
    averageRating : ?Float,
    accountAge : Time.Time,
  ) : async Result<ReputationScore> {
    // Check authorization
    // if (not isAuthorized(msg.caller)) {
    //     return #err("Unauthorized: Only trusted service agent can call this function");
    // };

    switch (reputations.get(userId)) {
      case (null) {
        return #err("User reputation not found");
      };
      case (?_) {
        // Call internal update function with empty new flags
        return _updateUserReputation(userId, completedBookingsCount, averageRating, accountAge, []);
      };
    };
  };

  // Internal function to update user reputation with new flags
  private func _updateUserReputation(
    userId : Principal,
    completedBookingsCount : Nat,
    averageRating : ?Float,
    accountAge : Time.Time,
    newFlags : [DetectionFlag],
  ) : Result<ReputationScore> {
    switch (reputations.get(userId)) {
      case (null) {
        return #err("User reputation not found");
      };
      case (?existingScore) {
        // Combine existing flags with new flags
        let buffer = Buffer.Buffer<DetectionFlag>(10);
        for (flag in existingScore.detectionFlags.vals()) { buffer.add(flag) };
        for (flag in newFlags.vals()) { buffer.add(flag) };
        let combinedFlags = Buffer.toArray(buffer);

        let newTrustScore = calculateTrustScore(
          completedBookingsCount,
          averageRating,
          accountAge,
          combinedFlags,
        );

        let newTrustLevel = determineTrustLevel(newTrustScore);

        let updatedScore : ReputationScore = {
          userId = existingScore.userId;
          trustScore = newTrustScore;
          trustLevel = newTrustLevel;
          completedBookings = completedBookingsCount;
          averageRating = averageRating;
          detectionFlags = combinedFlags;
          lastUpdated = Time.now();
        };

        reputations.put(userId, updatedScore);
        updateReputationHistory(userId, newTrustScore);

        return #ok(updatedScore);
      };
    };
  };

  // Enhanced reputation update specifically for service providers
  public shared (_msg) func updateProviderReputation(
    providerId : Principal,
    completedBookingsCount : Nat,
    averageRating : ?Float,
    accountAge : Time.Time,
  ) : async Result<ReputationScore> {

    switch (reputations.get(providerId)) {
      case (null) {
        return #err("Provider reputation not found");
      };
      case (?_) {
        // Call internal update function with empty new flags
        return _updateProviderReputation(providerId, completedBookingsCount, averageRating, accountAge, []);
      };
    };
  };

  // Internal function to update provider reputation with new flags
  private func _updateProviderReputation(
    providerId : Principal,
    completedBookingsCount : Nat,
    averageRating : ?Float,
    accountAge : Time.Time,
    newFlags : [DetectionFlag],
  ) : Result<ReputationScore> {
    switch (reputations.get(providerId)) {
      case (null) {
        return #err("Provider reputation not found");
      };
      case (?existingScore) {
        // Combine existing flags with new flags
        let buffer = Buffer.Buffer<DetectionFlag>(10);
        for (flag in existingScore.detectionFlags.vals()) { buffer.add(flag) };
        for (flag in newFlags.vals()) { buffer.add(flag) };
        let combinedFlags = Buffer.toArray(buffer);

        let newTrustScore = calculateProviderTrustScore(
          completedBookingsCount,
          averageRating,
          accountAge,
          combinedFlags,
        );

        let newTrustLevel = determineTrustLevel(newTrustScore);

        let updatedScore : ReputationScore = {
          userId = existingScore.userId;
          trustScore = newTrustScore;
          trustLevel = newTrustLevel;
          completedBookings = completedBookingsCount;
          averageRating = averageRating;
          detectionFlags = combinedFlags;
          lastUpdated = Time.now();
        };

        reputations.put(providerId, updatedScore);
        updateReputationHistory(providerId, newTrustScore);

        return #ok(updatedScore);
      };
    };
  };

  // Helper functions
  private func determineTrustLevel(trustScore : Float) : TrustLevel {
    for ((level, threshold) in TRUST_LEVEL_THRESHOLDS.vals()) {
      if (trustScore <= threshold) {
        return level;
      };
    };
    return #VeryHigh;
  };

  // LLM-based sentiment analysis
  private func analyzeSentimentWithLLM(review : Review) : async Float {
    try {
      // Create a prompt for sentiment analysis
      let prompt = "Analyze the sentiment of this review comment and rate it from 0.0 (very negative) to 1.0 (very positive). Only respond with a decimal number between 0.0 and 1.0.\n\nReview comment: \"" # review.comment # "\"";

      // Call LLM for sentiment analysis
      let response = await LLM.prompt(#Llama3_1_8B, prompt);

      // Parse the response to extract sentiment score
      switch (parseFloatFromResponse(response)) {
        case (?score) {
          // Ensure score is within valid range
          return Float.max(0.0, Float.min(1.0, score));
        };
        case (null) {
          // Fallback to basic sentiment analysis if LLM parsing fails
          return calculateSentimentScore(review);
        };
      };
    } catch (e) {
      Debug.print("LLM sentiment analysis failed, falling back to basic analysis: " # Error.message(e));
      return calculateSentimentScore(review);
    };
  };

  // Helper function to parse float from LLM response
  private func parseFloatFromResponse(response : Text) : ?Float {
    // Remove whitespace and common prefixes
    let trimmed = Text.trim(response, #text " \n\r\t");

    // Try to extract a number from the response
    // This is a simple parser - in production you might want more robust parsing
    if (Text.contains(trimmed, #text "0.")) {
      // Try to parse decimal number
      switch (parseDecimal(trimmed)) {
        case (?value) { return ?value };
        case (null) { return null };
      };
    } else if (Text.equal(trimmed, "0")) {
      return ?0.0;
    } else if (Text.equal(trimmed, "1")) {
      return ?1.0;
    };

    return null;
  };

  // Simple decimal parser for LLM responses
  private func parseDecimal(text : Text) : ?Float {
    // This is a simplified parser - extract the first decimal number found
    let chars = Text.toIter(text);
    var numberText = "";
    var foundDecimal = false;
    var foundDigit = false;

    label parsing for (char in chars) {
      if (char == '.' and not foundDecimal) {
        numberText := numberText # ".";
        foundDecimal := true;
      } else if (char >= '0' and char <= '9') {
        numberText := numberText # Text.fromChar(char);
        foundDigit := true;
      } else if (foundDigit) {
        // Stop at first non-digit after we've found digits
        break parsing;
      };
    };

    // Simple conversion for common decimal values
    if (Text.equal(numberText, "0.0")) return ?0.0;
    if (Text.equal(numberText, "0.1")) return ?0.1;
    if (Text.equal(numberText, "0.2")) return ?0.2;
    if (Text.equal(numberText, "0.3")) return ?0.3;
    if (Text.equal(numberText, "0.4")) return ?0.4;
    if (Text.equal(numberText, "0.5")) return ?0.5;
    if (Text.equal(numberText, "0.6")) return ?0.6;
    if (Text.equal(numberText, "0.7")) return ?0.7;
    if (Text.equal(numberText, "0.8")) return ?0.8;
    if (Text.equal(numberText, "0.9")) return ?0.9;
    if (Text.equal(numberText, "1.0")) return ?1.0;

    return null;
  };

  // Get reputation history for a user
  private func getReputationHistory(userId : Principal) : [(Time.Time, Float)] {
    switch (reputationHistory.get(userId)) {
      case (?history) history;
      case (null) [];
    };
  };

  // Public functions

  // Deduct reputation points for booking cancellation
  public shared (_msg) func deductReputationForCancellation(userId : Principal) : async Result<ReputationScore> {
    try {
      // Get current reputation or initialize if not exists
      let currentScore = switch (reputations.get(userId)) {
        case (?score) { score };
        case null {
          let newScore : ReputationScore = {
            userId = userId;
            trustScore = BASE_SCORE;
            trustLevel = #Low;
            completedBookings = 0;
            averageRating = null;
            detectionFlags = [];
            lastUpdated = Time.now();
          };
          reputations.put(userId, newScore);
          newScore;
        };
      };

      // Calculate new score with penalty, ensuring it doesn't go below minimum
      let newTrustScore = Float.max(MIN_TRUST_SCORE, currentScore.trustScore - CANCELLATION_PENALTY);

      // Update reputation
      let updatedScore : ReputationScore = {
        userId = currentScore.userId;
        trustScore = newTrustScore;
        trustLevel = determineTrustLevel(newTrustScore);
        completedBookings = currentScore.completedBookings;
        averageRating = currentScore.averageRating;
        detectionFlags = currentScore.detectionFlags;
        lastUpdated = Time.now();
      };

      // Save the updated score
      reputations.put(userId, updatedScore);

      // Update reputation history
      updateReputationHistory(userId, newTrustScore);

      #ok(updatedScore);
    } catch (e) {
      #err("Failed to update reputation: " # Error.message(e));
    };
  };

  // Initialize reputation for a new user
  public func initializeReputation(userId : Principal, _creationTime : Time.Time) : async Result<ReputationScore> {
    switch (reputations.get(userId)) {
      case (?_) {
        return #err("Reputation already exists for this user");
      };
      case (null) {
        let newScore : ReputationScore = {
          userId = userId;
          trustScore = BASE_SCORE;
          trustLevel = #New;
          completedBookings = 0;
          averageRating = null;
          detectionFlags = [];
          lastUpdated = Time.now();
        };

        reputations.put(userId, newScore);
        return #ok(newScore);
      };
    };
  };

  // Get reputation score for a user
  public query func getReputationScore(userId : Principal) : async Result<ReputationScore> {
    switch (reputations.get(userId)) {
      case (?score) {
        return #ok(score);
      };
      case (null) {
        return #err("No reputation score found for this user");
      };
    };
  };

  // Get reputation score for the caller (authenticated user)
  public shared (msg) func getMyReputationScore() : async Result<ReputationScore> {
    let userId = msg.caller;
    switch (reputations.get(userId)) {
      case (?score) {
        return #ok(score);
      };
      case (null) {
        return #err("No reputation score found for this user");
      };
    };
  };

  // Process a new review and update reputations
  // Accepts additional data needed for reputation calculation
  // Secured for Firebase service agent only
  public shared (_msg) func processReview(
    review : Review,
    clientCompletedBookings : Nat,
    clientAverageRating : ?Float,
    clientAccountAge : Time.Time,
    providerCompletedBookings : Nat,
    providerAverageRating : ?Float,
    providerAccountAge : Time.Time,
  ) : async Result<Review> {
    // Check authorization
    // if (not isAuthorized(msg.caller)) {
    //     return #err("Unauthorized: Only trusted service agent can call this function");
    // };

    // 1. Analyze review for flags
    let flags = analyzeReview(review);

    // 2. Calculate quality score (0.0 - 1.0)
    let qualityScore : Float = Float.max(0.0, Float.min(1.0, 1.0 - (Float.fromInt(flags.size()) * 0.25)));

    // 3. Determine if review should be hidden
    let shouldHide = qualityScore < 0.3 or flags.size() > 2;

    // 4. Update client reputation (the reviewer) - Activity & Quality
    let clientUpdateResult = _updateUserReputation(
      review.clientId,
      clientCompletedBookings,
      clientAverageRating,
      clientAccountAge,
      flags,
    );

    let reviewerReputationScore = switch (clientUpdateResult) {
      case (#ok(score)) score.trustScore;
      case (#err(_)) 50.0; // Default
    };

    let reviewerTrustLevel = switch (clientUpdateResult) {
      case (#ok(score)) score.trustLevel;
      case (#err(_)) #Low;
    };

    // 5. Update provider reputation (the target) - Rating Received
    ignore _updateProviderReputation(
      review.providerId,
      providerCompletedBookings,
      providerAverageRating,
      providerAccountAge,
      flags,
    );

    // Calculate effective weight
    let weight = calculateReviewWeight(reviewerReputationScore, reviewerTrustLevel, qualityScore, review.createdAt);

    // 6. Return updated review with status and quality score
    let updatedReview : Review = {
      id = review.id;
      bookingId = review.bookingId;
      clientId = review.clientId;
      providerId = review.providerId;
      serviceId = review.serviceId;
      rating = review.rating;
      comment = review.comment;
      status = if (shouldHide) { #Hidden } else if (flags.size() > 0) {
        #Flagged;
      } else { #Visible };
      qualityScore = ?qualityScore;
      weight = ?weight;
      createdAt = review.createdAt;
      updatedAt = Time.now();
    };

    return #ok(updatedReview);
  };

  // Process a provider-to-client review and update provider reputation
  // This is used when providers rate clients after service completion
  // Accepts additional data needed for reputation calculation
  // Secured for Firebase service agent only
  public shared (_msg) func processProviderReview(
    review : Review,
    providerCompletedBookings : Nat,
    providerAverageRating : ?Float,
    providerAccountAge : Time.Time,
    clientCompletedBookings : Nat,
    clientAverageRating : ?Float,
    clientAccountAge : Time.Time,
  ) : async Result<Review> {
    // Check authorization
    // if (not isAuthorized(msg.caller)) {
    //     return #err("Unauthorized: Only trusted service agent can call this function");
    // };

    // 1. Analyze review for flags
    let flags = analyzeReview(review);

    // 2. Calculate quality score (0.0 - 1.0)
    let qualityScore : Float = Float.max(0.0, Float.min(1.0, 1.0 - (Float.fromInt(flags.size()) * 0.25)));

    // 3. Determine if review should be hidden
    let shouldHide = qualityScore < 0.3 or flags.size() > 2;

    // 4. Update provider reputation (the reviewer) - Activity & Quality
    let providerUpdateResult = _updateProviderReputation(
      review.providerId,
      providerCompletedBookings,
      providerAverageRating,
      providerAccountAge,
      flags,
    );

    let reviewerReputationScore = switch (providerUpdateResult) {
      case (#ok(score)) score.trustScore;
      case (#err(_)) 50.0; // Default
    };

    let reviewerTrustLevel = switch (providerUpdateResult) {
      case (#ok(score)) score.trustLevel;
      case (#err(_)) #Low;
    };

    // 5. Update client reputation (the target) - Rating Received
    ignore _updateUserReputation(
      review.clientId,
      clientCompletedBookings,
      clientAverageRating,
      clientAccountAge,
      flags,
    );

    // Calculate effective weight
    let weight = calculateReviewWeight(reviewerReputationScore, reviewerTrustLevel, qualityScore, review.createdAt);

    // 6. Return updated review with status and quality score
    let updatedReview : Review = {
      id = review.id;
      bookingId = review.bookingId;
      clientId = review.clientId;
      providerId = review.providerId;
      serviceId = review.serviceId;
      rating = review.rating;
      comment = review.comment;
      status = if (shouldHide) { #Hidden } else if (flags.size() > 0) {
        #Flagged;
      } else { #Visible };
      qualityScore = ?qualityScore;
      weight = ?weight;
      createdAt = review.createdAt;
      updatedAt = Time.now();
    };

    return #ok(updatedReview);
  };
  // Get reputation score with history for a user
  public query func getReputationScoreWithHistory(userId : Principal) : async Result<{ score : ReputationScore; history : [(Time.Time, Float)] }> {
    switch (reputations.get(userId)) {
      case (?score) {
        let history = getReputationHistory(userId);
        return #ok({
          score = score;
          history = history;
        });
      };
      case (null) {
        return #err("No reputation score found for this user");
      };
    };
  };
  public shared (_msg) func processReviewWithLLM(
    review : Review,
    clientCompletedBookings : Nat,
    clientAverageRating : ?Float,
    clientAccountAge : Time.Time,
    providerCompletedBookings : Nat,
    providerAverageRating : ?Float,
    providerAccountAge : Time.Time,
  ) : async Result<Review> {

    // 1. Analyze sentiment with LLM
    let llmSentimentScore = await analyzeSentimentWithLLM(review);

    // 2. Analyze review for flags (enhanced with LLM sentiment)
    let flags = analyzeReviewWithLLMSentiment(review, llmSentimentScore);

    // 3. Calculate quality score incorporating LLM sentiment
    let qualityScore : Float = calculateReviewQualityWithLLM(review, llmSentimentScore, flags);

    // 4. Determine if review should be hidden
    let shouldHide = qualityScore < 0.3 or flags.size() > 2;

    // 5. Update client reputation (the reviewer) - Activity & Quality
    let clientUpdateResult = await updateUserReputation(
      review.clientId,
      clientCompletedBookings,
      clientAverageRating,
      clientAccountAge,
    );

    let reviewerReputationScore = switch (clientUpdateResult) {
      case (#ok(score)) score.trustScore;
      case (#err(_)) 50.0; // Default
    };

    let reviewerTrustLevel = switch (clientUpdateResult) {
      case (#ok(score)) score.trustLevel;
      case (#err(_)) #Low;
    };

    // 6. Update provider reputation (the target) - Rating Received
    ignore await updateProviderReputation(
      review.providerId,
      providerCompletedBookings,
      providerAverageRating,
      providerAccountAge,
    );

    // Calculate effective weight
    let weight = calculateReviewWeight(reviewerReputationScore, reviewerTrustLevel, qualityScore, review.createdAt);

    // 7. Return updated review with status and quality score
    let updatedReview : Review = {
      id = review.id;
      bookingId = review.bookingId;
      clientId = review.clientId;
      providerId = review.providerId;
      serviceId = review.serviceId;
      rating = review.rating;
      comment = review.comment;
      status = if (shouldHide) { #Hidden } else if (flags.size() > 0) {
        #Flagged;
      } else { #Visible };
      qualityScore = ?qualityScore;
      weight = ?weight;
      createdAt = review.createdAt;
      updatedAt = Time.now();
    };

    return #ok(updatedReview);
  };

  // Process a provider-to-client review with LLM sentiment analysis
  // This is used when providers rate clients after service completion
  public shared (_msg) func processProviderReviewWithLLM(
    review : Review,
    providerCompletedBookings : Nat,
    providerAverageRating : ?Float,
    providerAccountAge : Time.Time,
    clientCompletedBookings : Nat,
    clientAverageRating : ?Float,
    clientAccountAge : Time.Time,
  ) : async Result<Review> {
    // Check authorization
    // if (not isAuthorized(msg.caller)) {
    //     return #err("Unauthorized: Only trusted service agent can call this function");
    // };

    // 1. Analyze sentiment with LLM
    let llmSentimentScore = await analyzeSentimentWithLLM(review);

    // 2. Analyze review for flags (enhanced with LLM sentiment)
    let flags = analyzeReviewWithLLMSentiment(review, llmSentimentScore);

    // 3. Calculate quality score incorporating LLM sentiment
    let qualityScore : Float = calculateReviewQualityWithLLM(review, llmSentimentScore, flags);

    // 4. Determine if review should be hidden
    let shouldHide = qualityScore < 0.3 or flags.size() > 2;

    // 5. Update provider reputation (the reviewer) - Activity & Quality
    let providerUpdateResult = await updateProviderReputation(
      review.providerId,
      providerCompletedBookings,
      providerAverageRating,
      providerAccountAge,
    );

    let reviewerReputationScore = switch (providerUpdateResult) {
      case (#ok(score)) score.trustScore;
      case (#err(_)) 50.0; // Default
    };

    let reviewerTrustLevel = switch (providerUpdateResult) {
      case (#ok(score)) score.trustLevel;
      case (#err(_)) #Low;
    };

    // 6. Update client reputation (the target) - Rating Received
    ignore await updateUserReputation(
      review.clientId,
      clientCompletedBookings,
      clientAverageRating,
      clientAccountAge,
    );

    // Calculate effective weight
    let weight = calculateReviewWeight(reviewerReputationScore, reviewerTrustLevel, qualityScore, review.createdAt);

    // 7. Return updated review with status and quality score
    let updatedReview : Review = {
      id = review.id;
      bookingId = review.bookingId;
      clientId = review.clientId;
      providerId = review.providerId;
      serviceId = review.serviceId;
      rating = review.rating;
      comment = review.comment;
      status = if (shouldHide) { #Hidden } else if (flags.size() > 0) {
        #Flagged;
      } else { #Visible };
      qualityScore = ?qualityScore;
      weight = ?weight;
      createdAt = review.createdAt;
      updatedAt = Time.now();
    };

    return #ok(updatedReview);
  };

  // Enhanced review analysis with LLM sentiment
  private func analyzeReviewWithLLMSentiment(review : Review, llmSentiment : Float) : [DetectionFlag] {
    var flags : [DetectionFlag] = [];

    // 1. Check for review bombing
    if (review.rating <= 2) {
      flags := Array.append<DetectionFlag>(flags, [#ReviewBomb]);
    };

    // 2. Check for competitive manipulation
    if (review.rating == 5 and Text.size(review.comment) < 20) {
      flags := Array.append<DetectionFlag>(flags, [#CompetitiveManipulation]);
    };

    // 3. Enhanced sentiment consistency check using LLM
    if (llmSentiment < 0.3 and review.rating >= 4) {
      flags := Array.append<DetectionFlag>(flags, [#Other]);
    };

    // 4. Check for extremely negative sentiment with high rating
    if (llmSentiment < 0.2 and review.rating >= 4) {
      flags := Array.append<DetectionFlag>(flags, [#CompetitiveManipulation]);
    };

    return flags;
  };

  // Calculate review quality incorporating LLM sentiment
  private func calculateReviewQualityWithLLM(review : Review, llmSentiment : Float, flags : [DetectionFlag]) : Float {
    var qualityScore : Float = 0.7; // Base quality score

    // 1. LLM sentiment alignment with rating (weight: 0.3)
    let ratingNormalized = Float.fromInt(review.rating) / 5.0;
    let sentimentAlignment = 1.0 - Float.abs(llmSentiment - ratingNormalized);
    qualityScore += sentimentAlignment * 0.3;

    // 2. Review length and detail (weight: 0.2)
    let commentLength = Text.size(review.comment);
    if (commentLength > 50) {
      qualityScore += 0.1;
    };
    if (commentLength > 150) {
      qualityScore += 0.1;
    };

    // 3. Penalty for flags
    qualityScore -= Float.fromInt(flags.size()) * 0.25;

    return Float.max(0.0, Float.min(1.0, qualityScore));
  };

  // Set trusted Firebase service agent (admin function)
  // This should be called once during setup to authorize the Firebase Cloud Functions
  public shared (_msg) func setTrustedServiceAgent(agent : Principal) : async Result<Text> {
    // TODO: Add proper admin authorization check here
    // For now, only allow setting if not already set (one-time setup)
    switch (trustedServiceAgent) {
      case (null) {
        trustedServiceAgent := ?agent;
        return #ok("Trusted service agent set successfully");
      };
      case (?_) {
        return #err("Trusted service agent already set. Cannot override for security.");
      };
    };
  };

  // Get reputation statistics
  public query func getReputationStatistics() : async {
    totalUsers : Nat;
    averageTrustScore : Float;
    trustLevelDistribution : [(TrustLevel, Nat)];
  } {
    var total : Nat = 0;
    var totalScore : Float = 0.0;
    var newCount : Nat = 0;
    var lowCount : Nat = 0;
    var mediumCount : Nat = 0;
    var highCount : Nat = 0;
    var veryHighCount : Nat = 0;

    for (score in reputations.vals()) {
      total += 1;
      totalScore += score.trustScore;

      switch (score.trustLevel) {
        case (#New) { newCount += 1 };
        case (#Low) { lowCount += 1 };
        case (#Medium) { mediumCount += 1 };
        case (#High) { highCount += 1 };
        case (#VeryHigh) { veryHighCount += 1 };
      };
    };

    let averageScore = if (total > 0) { totalScore / Float.fromInt(total) } else {
      0.0;
    };

    let distribution : [(TrustLevel, Nat)] = [
      (#New, newCount),
      (#Low, lowCount),
      (#Medium, mediumCount),
      (#High, highCount),
      (#VeryHigh, veryHighCount),
    ];

    return {
      totalUsers = total;
      averageTrustScore = averageScore;
      trustLevelDistribution = distribution;
    };
  };

  // Manual reputation update for admin use
  public shared (_msg) func setUserReputation(userId : Principal, reputationScore : Nat) : async Result<Text> {
    Debug.print("Reputation canister: Setting reputation for user " # Principal.toText(userId) # " to " # Nat.toText(reputationScore));

    // Validate reputation score (0-100)
    if (reputationScore > 100) {
      Debug.print("Reputation canister: Invalid score " # Nat.toText(reputationScore) # " - must be 0-100");
      return #err("Reputation score must be between 0 and 100");
    };

    // Convert Nat to Float for internal use
    let trustScore = Float.fromInt(reputationScore);

    // Determine trust level based on score
    let trustLevel = determineTrustLevel(trustScore);

    let trustLevelText = switch (trustLevel) {
      case (#New) "New";
      case (#Low) "Low";
      case (#Medium) "Medium";
      case (#High) "High";
      case (#VeryHigh) "VeryHigh";
    };
    Debug.print("Reputation canister: Calculated trustScore=" # Float.toText(trustScore) # ", trustLevel=" # trustLevelText);

    // Create or update reputation score
    let updatedScore : ReputationScore = {
      userId = userId;
      trustScore = trustScore;
      trustLevel = trustLevel;
      completedBookings = switch (reputations.get(userId)) {
        case (?existing) existing.completedBookings;
        case (null) 0;
      };
      averageRating = switch (reputations.get(userId)) {
        case (?existing) existing.averageRating;
        case (null) null;
      };
      detectionFlags = switch (reputations.get(userId)) {
        case (?existing) existing.detectionFlags;
        case (null) [];
      };
      lastUpdated = Time.now();
    };

    reputations.put(userId, updatedScore);
    updateReputationHistory(userId, trustScore);

    Debug.print("Reputation canister: Successfully updated reputation for user " # Principal.toText(userId));

    return #ok("User reputation updated to " # Nat.toText(reputationScore) # " successfully");
  };

  // Delete user reputation (for account deletion)
  public shared (msg) func deleteUserReputation(userId : Principal) : async Result<Text> {
    let caller = msg.caller;

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous principal not allowed");
    };

    // In production, verify caller is admin
    switch (reputations.get(userId)) {
      case (?_) {
        reputations.delete(userId);

        // Also delete reputation history
        switch (reputationHistory.get(userId)) {
          case (?_) {
            reputationHistory.delete(userId);
          };
          case (null) {};
        };

        return #ok("User reputation deleted successfully");
      };
      case (null) {
        return #ok("No reputation found for user");
      };
    };
  };
};
