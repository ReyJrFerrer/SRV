import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Option "mo:base/Option";
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
    
    // Canister references
    private transient var authCanisterId : ?Principal = null;
    private transient var bookingCanisterId : ?Principal = null;
    private transient var reviewCanisterId : ?Principal = null;
    private transient var serviceCanisterId : ?Principal = null;
    private transient var llmCanisterId : ?Principal = null;

    // Constants for reputation calculation
    private transient let BASE_SCORE : Float = 50.0;
    private transient let MAX_BOOKING_POINTS : Float = 20.0;
    // private let MAX_RATING_POINTS : Float = 20.0;
    private transient let MAX_AGE_POINTS : Float = 10.0;
    private transient let MIN_TRUST_SCORE : Float = 0.0;
    private transient let MAX_TRUST_SCORE : Float = 100.0;
    private transient let TRUST_LEVEL_THRESHOLDS : [(TrustLevel, Float)] = [
        (#Low, 20.0),
        (#Medium, 50.0),
        (#High, 80.0),
        (#VeryHigh, 100.0)
    ];

    // New constants for enhanced scoring
    private let RECENCY_WEIGHT : Float = 0.3;
    private let CONSISTENCY_BONUS : Float = 5.0;
    // private let EVIDENCE_QUALITY_WEIGHT : Float = 0.2;
    // private let REVIEW_SENTIMENT_WEIGHT : Float = 0.15;
    private let ACTIVITY_FREQUENCY_WEIGHT : Float = 0.1;

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

    // Helper functions
    private func calculateTrustScore(
        completedBookings : Nat,
        averageRating : ?Float,
        accountAge : Time.Time,
        flags : [DetectionFlag]
    ) : Float {
        var score : Float = BASE_SCORE;
        
        // 1. Booking Activity Score (max 20 points)
        let bookingPoints = Float.min(MAX_BOOKING_POINTS, Float.fromInt(completedBookings));
        score += bookingPoints;
        
        // 2. Rating Quality Score (max 20 points)
        switch (averageRating) {
            case (null) {};
            case (?rating) {
                // Higher weight for ratings above 4.0
                if (rating >= 4.0) {
                    score += (rating - 1.0) * 6.0; // Maps 1-5 to 0-24
                } else {
                    score += (rating - 1.0) * 4.0; // Maps 1-5 to 0-16
                };
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
        flags : [DetectionFlag]
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
                if (rating >= 4.5) {
                    score += 25.0; // Excellent service
                } else if (rating >= 4.0) {
                    score += 20.0; // Very good service
                } else if (rating >= 3.5) {
                    score += 15.0; // Good service
                } else if (rating >= 3.0) {
                    score += 10.0; // Average service
                } else {
                    score += 5.0; // Below average but still positive
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
        if (ageInDays <= 30.0) { // Last 30 days
            return 15.0;
        } else if (ageInDays <= 90.0) { // Last 90 days
            return 10.0;
        } else if (ageInDays <= 180.0) { // Last 180 days
            return 5.0;
        };
        
        return 0.0;
    };

    private func calculateActivityFrequency(completedBookings : Nat, accountAge : Time.Time) : Float {
        if (completedBookings == 0) return 0.0;
        
        let ageInDays = Float.fromInt(Time.now() - accountAge) / (24.0 * 60.0 * 60.0 * 1_000_000_000.0);
        let bookingsPerMonth = Float.fromInt(completedBookings) / (ageInDays / 30.0);
        
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

    // Enhanced evidence quality evaluation
    // private func evaluateEvidenceQuality(evidence : Evidence) : Float {
    //     var qualityScore : Float = 0.75; // Base quality score
        
    //     // 1. Description length and quality
    //     if (Text.size(evidence.description) > 100) {
    //         qualityScore += 0.1;
    //     };
        
    //     // 2. File evidence
    //     if (evidence.fileUrls.size() > 0) {
    //         qualityScore += 0.1;
    //         // Bonus for multiple files
    //         if (evidence.fileUrls.size() > 1) {
    //             qualityScore += 0.05;
    //         };
    //     };
        
    //     // 3. Keyword analysis
    //     let description = Text.toLowercase(evidence.description);
    //     if (Text.contains(description, #text "proof") or 
    //         Text.contains(description, #text "evidence") or 
    //         Text.contains(description, #text "photo")) {
    //         qualityScore += 0.05;
    //     };
        
    //     // 4. Timeliness
    //     let ageInHours = Float.fromInt(Time.now() - evidence.createdAt) / (60.0 * 60.0 * 1_000_000_000.0);
    //     if (ageInHours <= 24.0) { // Within 24 hours
    //         qualityScore += 0.1;
    //     };
        
    //     return Float.min(1.0, qualityScore);
    // };

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
    public func updateUserReputation(userId : Principal) : async Result<ReputationScore> {
        switch (reputations.get(userId)) {
            case (null) {
                return #err("User reputation not found");
            };
            case (?existingScore) {
                // Get completed bookings from booking canister
                let bookingCanister = actor(Principal.toText(Option.unwrap(bookingCanisterId))) : actor {
                    getProviderCompletedBookings : (Principal) -> async [Booking];
                };
                let completedBookings = await bookingCanister.getProviderCompletedBookings(userId);
                
                // Get ratings from review canister
                let reviewCanister = actor(Principal.toText(Option.unwrap(reviewCanisterId))) : actor {
                    calculateUserAverageRating : (Principal) -> async Result<Float>;
                };
                let averageRating = switch (await reviewCanister.calculateUserAverageRating(userId)) {
                    case (#ok(rating)) ?rating;
                    case (#err(_)) null;
                };
                
                // Get account age from auth canister
                let authCanister = actor(Principal.toText(Option.unwrap(authCanisterId))) : actor {
                    getProfile : (Principal) -> async Result<{ createdAt : Time.Time }>;
                };
                let accountAge = switch (await authCanister.getProfile(userId)) {
                    case (#ok(profile)) profile.createdAt;
                    case (#err(_)) existingScore.lastUpdated;
                };
                
                let newTrustScore = calculateTrustScore(
                    completedBookings.size(),
                    averageRating,
                    accountAge,
                    existingScore.detectionFlags
                );
                
                let newTrustLevel = determineTrustLevel(newTrustScore);
                
                let updatedScore : ReputationScore = {
                    userId = existingScore.userId;
                    trustScore = newTrustScore;
                    trustLevel = newTrustLevel;
                    completedBookings = completedBookings.size();
                    averageRating = averageRating;
                    detectionFlags = existingScore.detectionFlags;
                    lastUpdated = Time.now();
                };
                
                reputations.put(userId, updatedScore);
                updateReputationHistory(userId, newTrustScore);
                
                return #ok(updatedScore);
            };
        };
    };

    // Enhanced reputation update specifically for service providers
    public func updateProviderReputation(providerId : Principal) : async Result<ReputationScore> {
        switch (reputations.get(providerId)) {
            case (null) {
                return #err("Provider reputation not found");
            };
            case (?existingScore) {
                // Get completed bookings from booking canister
                let bookingCanister = actor(Principal.toText(Option.unwrap(bookingCanisterId))) : actor {
                    getProviderCompletedBookings : (Principal) -> async [Booking];
                };
                let completedBookings = await bookingCanister.getProviderCompletedBookings(providerId);
                
                // Get ratings from review canister
                let reviewCanister = actor(Principal.toText(Option.unwrap(reviewCanisterId))) : actor {
                    calculateUserAverageRating : (Principal) -> async Result<Float>;
                };
                let averageRating = switch (await reviewCanister.calculateUserAverageRating(providerId)) {
                    case (#ok(rating)) ?rating;
                    case (#err(_)) null;
                };
                
                // Get account age from auth canister
                let authCanister = actor(Principal.toText(Option.unwrap(authCanisterId))) : actor {
                    getProfile : (Principal) -> async Result<{ createdAt : Time.Time }>;
                };
                let accountAge = switch (await authCanister.getProfile(providerId)) {
                    case (#ok(profile)) profile.createdAt;
                    case (#err(_)) existingScore.lastUpdated;
                };
                
                let newTrustScore = calculateProviderTrustScore(
                    completedBookings.size(),
                    averageRating,
                    accountAge,
                    existingScore.detectionFlags
                );
                
                let newTrustLevel = determineTrustLevel(newTrustScore);
                
                let updatedScore : ReputationScore = {
                    userId = existingScore.userId;
                    trustScore = newTrustScore;
                    trustLevel = newTrustLevel;
                    completedBookings = completedBookings.size();
                    averageRating = averageRating;
                    detectionFlags = existingScore.detectionFlags;
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
    
    // Initialize reputation for a new user
    public func initializeReputation(userId : Principal, creationTime : Time.Time) : async Result<ReputationScore> {
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
    public shared(msg) func getMyReputationScore() : async Result<ReputationScore> {
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
    public func processReview(review : Review) : async Result<Review> {
        // 1. Analyze review for flags
        let flags = analyzeReview(review);
        
        // 2. Calculate quality score (0.0 - 1.0)
        let qualityScore : Float = Float.max(0.0, Float.min(1.0, 1.0 - (Float.fromInt(flags.size()) * 0.25)));
        
        // 3. Determine if review should be hidden
        let shouldHide = qualityScore < 0.3 or flags.size() > 2;
        
        // 4. Update provider reputation
        // ignore await updateUserReputation(review.providerId);
        
        // 5. Update client reputation (reviewer)
        ignore await updateUserReputation(review.clientId);
        
        // 6. Return updated review with status and quality score
        let updatedReview : Review = {
            id = review.id;
            bookingId = review.bookingId;
            clientId = review.clientId;
            providerId = review.providerId;
            serviceId = review.serviceId;
            rating = review.rating;
            comment = review.comment;
            status = if (shouldHide) { #Hidden } else if (flags.size() > 0) { #Flagged } else { #Visible };
            qualityScore = ?qualityScore;
            createdAt = review.createdAt;
            updatedAt = Time.now();
        };
        
        return #ok(updatedReview);
    };
    
    // Process evidence submission
    // public func processEvidence(evidence : Evidence) : async Result<Evidence> {
    //     // 1. Evaluate evidence quality
    //     let qualityScore = evaluateEvidenceQuality(evidence);
        
    //     // 2. Update evidence with quality score
    //     let updatedEvidence : Evidence = {
    //         id = evidence.id;
    //         bookingId = evidence.bookingId;
    //         submitterId = evidence.submitterId;
    //         description = evidence.description;
    //         fileUrls = evidence.fileUrls;
    //         qualityScore = ?qualityScore;
    //         createdAt = evidence.createdAt;
    //     };
        
    //     // 3. Update submitter reputation
    //     ignore await updateUserReputation(evidence.submitterId);
        
    //     return #ok(updatedEvidence);
    // };
    
    // Get reputation score with history for a user
    public query func getReputationScoreWithHistory(userId : Principal) : async Result<{
        score : ReputationScore;
        history : [(Time.Time, Float)];
    }> {
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

    // Process a new review with LLM sentiment analysis
    public func processReviewWithLLM(review : Review) : async Result<Review> {
        // 1. Analyze sentiment with LLM
        let llmSentimentScore = await analyzeSentimentWithLLM(review);
        
        // 2. Analyze review for flags (enhanced with LLM sentiment)
        let flags = analyzeReviewWithLLMSentiment(review, llmSentimentScore);
        
        // 3. Calculate quality score incorporating LLM sentiment
        let qualityScore : Float = calculateReviewQualityWithLLM(review, llmSentimentScore, flags);
        
        // 4. Determine if review should be hidden
        let shouldHide = qualityScore < 0.3 or flags.size() > 2;
        
        // 5. Update provider reputation
        // ignore await updateUserReputation(review.providerId);
        
        // 6. Update client reputation (reviewer)
        ignore await updateUserReputation(review.clientId);
        
        // 7. Return updated review with status and quality score
        let updatedReview : Review = {
            id = review.id;
            bookingId = review.bookingId;
            clientId = review.clientId;
            providerId = review.providerId;
            serviceId = review.serviceId;
            rating = review.rating;
            comment = review.comment;
            status = if (shouldHide) { #Hidden } else if (flags.size() > 0) { #Flagged } else { #Visible };
            qualityScore = ?qualityScore;
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
    
    // Set canister references including LLM (admin function)
    public shared(_msg) func setCanisterReferences(
        auth : Principal,
        booking : Principal,
        review : Principal,
        service : Principal
    ) : async Result<Text> {
        // In real implementation, need to check if caller has admin rights
        authCanisterId := ?auth;
        bookingCanisterId := ?booking;
        reviewCanisterId := ?review;
        serviceCanisterId := ?service;
        // Set LLM canister ID from dfx.json
        llmCanisterId := ?Principal.fromText("w36hm-eqaaa-aaaal-qr76a-cai");
        
        return #ok("Canister references set successfully");
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
        
        let averageScore = if (total > 0) { totalScore / Float.fromInt(total) } else { 0.0 };
        
        let distribution : [(TrustLevel, Nat)] = [
            (#New, newCount),
            (#Low, lowCount),
            (#Medium, mediumCount),
            (#High, highCount),
            (#VeryHigh, veryHighCount)
        ];
        
        return {
            totalUsers = total;
            averageTrustScore = averageScore;
            trustLevelDistribution = distribution;
        };
    };

    // Manual reputation update for admin use
    public shared(msg) func setUserReputation(userId: Principal, reputationScore: Nat) : async Result<Text> {
        let caller = msg.caller;

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
}