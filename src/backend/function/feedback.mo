import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Types "../types/shared";

persistent actor FeedbackCanister {
    // Type definitions
    type AppFeedback = Types.AppFeedback;
    type FeedbackStats = Types.FeedbackStats;
    type Result<T> = Types.Result<T>;
    type Profile = Types.Profile;

    // State variables
    private var feedbackEntries : [(Text, AppFeedback)] = [];
    private transient var feedbacks = HashMap.HashMap<Text, AppFeedback>(10, Text.equal, Text.hash);
    private transient var nextFeedbackId : Nat = 1;

    // Canister references
    private transient var authCanisterId : ?Principal = null;

    // Constants
    private transient let MIN_RATING : Nat = 1;
    private transient let MAX_RATING : Nat = 5;
    private transient let MAX_COMMENT_LENGTH : Nat = 1000;

    // Private helper functions
    private func generateFeedbackId() : Text {
        let id = "feedback_" # Nat.toText(nextFeedbackId);
        nextFeedbackId += 1;
        id
    };

    private func validateRating(rating : Nat) : Bool {
        rating >= MIN_RATING and rating <= MAX_RATING
    };

    private func validateComment(comment : ?Text) : Bool {
        switch (comment) {
            case (?c) {
                c.size() <= MAX_COMMENT_LENGTH
            };
            case (null) {
                true
            };
        }
    };

    // Initialization functions
    system func preupgrade() {
        feedbackEntries := Iter.toArray(feedbacks.entries());
    };

    system func postupgrade() {
        feedbacks := HashMap.fromIter<Text, AppFeedback>(feedbackEntries.vals(), 10, Text.equal, Text.hash);
        feedbackEntries := [];
        
        // Update nextFeedbackId to be greater than any existing ID
        var maxId : Nat = 0;
        for ((id, _) in feedbacks.entries()) {
            // Extract number from "feedback_X" format
            let idParts = Text.split(id, #char '_');
            switch (idParts.next()) {
                case (?_prefix) {
                    switch (idParts.next()) {
                        case (?numberText) {
                            switch (textToNat(numberText)) {
                                case (?num) {
                                    if (num > maxId) {
                                        maxId := num;
                                    };
                                };
                                case (null) {};
                            };
                        };
                        case (null) {};
                    };
                };
                case (null) {};
            };
        };
        nextFeedbackId := maxId + 1;
    };

    // Helper function to convert text to nat
    private func textToNat(text : Text) : ?Nat {
        var result : Nat = 0;
        for (char in text.chars()) {
            switch (char) {
                case ('0') result := result * 10 + 0;
                case ('1') result := result * 10 + 1;
                case ('2') result := result * 10 + 2;
                case ('3') result := result * 10 + 3;
                case ('4') result := result * 10 + 4;
                case ('5') result := result * 10 + 5;
                case ('6') result := result * 10 + 6;
                case ('7') result := result * 10 + 7;
                case ('8') result := result * 10 + 8;
                case ('9') result := result * 10 + 9;
                case (_) return null;
            };
        };
        ?result
    };

    // Set canister references
    public shared(_msg) func setCanisterReferences(
        auth : ?Principal
    ) : async Result<Text> {
        // In real implementation, need to check if caller has admin rights
        authCanisterId := auth;
        return #ok("Canister references set successfully");
    };

    // Public functions

    // Submit feedback
    public shared(msg) func submitFeedback(
        rating : Nat,
        comment : ?Text
    ) : async Result<AppFeedback> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };
        
        // Validate input
        if (not validateRating(rating)) {
            return #err("Invalid rating. Must be between " # Nat.toText(MIN_RATING) # " and " # Nat.toText(MAX_RATING));
        };
        
        if (not validateComment(comment)) {
            return #err("Comment too long. Maximum " # Nat.toText(MAX_COMMENT_LENGTH) # " characters");
        };

        // Get user profile from auth canister
        switch (authCanisterId) {
            case (?authId) {
                let authCanister = actor(Principal.toText(authId)) : actor {
                    getProfile : (Principal) -> async Result<Profile>;
                };
                
                let profileResult = await authCanister.getProfile(caller);
                switch (profileResult) {
                    case (#ok(profile)) {
                        let feedbackId = generateFeedbackId();
                        let newFeedback : AppFeedback = {
                            id = feedbackId;
                            userId = caller;
                            userName = profile.name;
                            userPhone = profile.phone;
                            rating = rating;
                            comment = comment;
                            createdAt = Time.now();
                        };
                        
                        feedbacks.put(feedbackId, newFeedback);
                        return #ok(newFeedback);
                    };
                    case (#err(error)) {
                        return #err("Failed to get user profile: " # error);
                    };
                };
            };
            case (null) {
                return #err("Auth canister not configured");
            };
        };
    };

    // Get all feedback (admin function)
    public query func getAllFeedback() : async [AppFeedback] {
        // In real implementation, should check admin permissions
        let feedbackArray = Iter.toArray(feedbacks.vals());
        
        // Sort by creation time (newest first)
        Array.sort<AppFeedback>(feedbackArray, func(a, b) {
            if (a.createdAt > b.createdAt) { #less }
            else if (a.createdAt < b.createdAt) { #greater }
            else { #equal }
        })
    };

    // Get feedback by user
    public shared query(msg) func getMyFeedback() : async [AppFeedback] {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return [];
        };
        
        let userFeedback = Array.filter<AppFeedback>(
            Iter.toArray(feedbacks.vals()),
            func (feedback : AppFeedback) : Bool {
                Principal.equal(feedback.userId, caller)
            }
        );
        
        // Sort by creation time (newest first)
        Array.sort<AppFeedback>(userFeedback, func(a, b) {
            if (a.createdAt > b.createdAt) { #less }
            else if (a.createdAt < b.createdAt) { #greater }
            else { #equal }
        })
    };

    // Get feedback statistics
    public query func getFeedbackStats() : async FeedbackStats {
        let allFeedback = Iter.toArray(feedbacks.vals());
        let totalFeedback = allFeedback.size();
        
        if (totalFeedback == 0) {
            return {
                totalFeedback = 0;
                averageRating = 0.0;
                ratingDistribution = [];
                totalWithComments = 0;
                latestFeedback = null;
            };
        };
        
        // Calculate average rating
        var totalRating : Nat = 0;
        var commentsCount : Nat = 0;
        var ratingCounts : [var Nat] = Array.init<Nat>(6, 0); // Index 0 unused, 1-5 for ratings
        
        for (feedback in allFeedback.vals()) {
            totalRating += feedback.rating;
            
            // Count rating distribution
            ratingCounts[feedback.rating] += 1;
            
            // Count comments
            switch (feedback.comment) {
                case (?_comment) {
                    commentsCount += 1;
                };
                case (null) {};
            };
        };
        
        let averageRating = Float.fromInt(totalRating) / Float.fromInt(totalFeedback);
        
        // Create rating distribution array
        var distribution : [(Nat, Nat)] = [];
        for (rating in Iter.range(1, 5)) {
            distribution := Array.append(distribution, [(rating, ratingCounts[rating])]);
        };
        
        // Get latest feedback
        let sortedFeedback = Array.sort<AppFeedback>(allFeedback, func(a, b) {
            if (a.createdAt > b.createdAt) { #less }
            else if (a.createdAt < b.createdAt) { #greater }
            else { #equal }
        });
        
        let latestFeedback = if (sortedFeedback.size() > 0) {
            ?sortedFeedback[0]
        } else {
            null
        };
        
        return {
            totalFeedback = totalFeedback;
            averageRating = averageRating;
            ratingDistribution = distribution;
            totalWithComments = commentsCount;
            latestFeedback = latestFeedback;
        };
    };

    // Get feedback by ID
    public query func getFeedbackById(feedbackId : Text) : async Result<AppFeedback> {
        switch (feedbacks.get(feedbackId)) {
            case (?feedback) {
                return #ok(feedback);
            };
            case (null) {
                return #err("Feedback not found");
            };
        };
    };

    // Get recent feedback (limited number)
    public query func getRecentFeedback(limit : Nat) : async [AppFeedback] {
        let allFeedback = Iter.toArray(feedbacks.vals());
        
        // Sort by creation time (newest first)
        let sortedFeedback = Array.sort<AppFeedback>(allFeedback, func(a, b) {
            if (a.createdAt > b.createdAt) { #less }
            else if (a.createdAt < b.createdAt) { #greater }
            else { #equal }
        });
        
        // Take only the requested number of items
        if (sortedFeedback.size() <= limit) {
            sortedFeedback
        } else {
            Array.tabulate<AppFeedback>(limit, func(i) = sortedFeedback[i])
        }
    };
}