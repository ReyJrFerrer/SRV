import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Bool "mo:base/Bool";
import Result "mo:base/Result";
import Debug "mo:base/Debug";

import Types "../types/shared";
import StaticData "../utils/staticData";

persistent actor ReviewCanister {
    // Type definitions
    type Review = Types.Review;
    type ReviewStatus = Types.ReviewStatus;
    type Result<T> = Types.Result<T>;

    // State variables
    private var reviewEntries : [(Text, Review)] = [];
    private transient var reviews = HashMap.HashMap<Text, Review>(10, Text.equal, Text.hash);
    
    // Canister references
    private transient var bookingCanisterId : ?Principal = null;
    private transient var serviceCanisterId : ?Principal = null;
    private transient var reputationCanisterId : ?Principal = null;
    private transient var authCanisterId : ?Principal = null;

    // Constants
    private transient let REVIEW_WINDOW_DAYS : Nat = 30;
    private transient let MAX_COMMENT_LENGTH : Nat = 500;
    private transient let MIN_RATING : Nat = 1;
    private transient let MAX_RATING : Nat = 5;

    // Helper functions
    private func generateId() : Text {
        let now = Int.abs(Time.now());
        let random = Int.abs(Time.now()) % 10000;
        return Int.toText(now) # "-" # Int.toText(random);
    };

    // Initialize static reviews - only on first deployment
    private func initializeStaticReviews() {
        // Only initialize if reviews HashMap is empty to avoid duplicates
        if (reviews.size() == 0) {
            // Add reviews to HashMap from shared static data
            for ((id, review) in StaticData.getSTATIC_REVIEWS().vals()) {
                reviews.put(id, review);
            };
            Debug.print("Static reviews initialized successfully. Total reviews: " # Nat.toText(reviews.size()));
        } else {
            Debug.print("Reviews already exist, skipping static initialization. Current count: " # Nat.toText(reviews.size()));
        };
    };

    initializeStaticReviews();

    // Pre-upgrade hook
    system func preupgrade() {
        reviewEntries := Iter.toArray(reviews.entries());
        reviews := HashMap.fromIter<Text, Review>(reviewEntries.vals(), 0, Text.equal, Text.hash);
        initializeStaticReviews();
    };

    // Post-upgrade hook
    system func postupgrade() {
        reviews := HashMap.fromIter<Text, Review>(reviewEntries.vals(), 0, Text.equal, Text.hash);
        initializeStaticReviews();
    };

    // Helper functions
    private func isValidRating(rating : Nat) : Bool {
        return rating >= MIN_RATING and rating <= MAX_RATING;
    };

    private func isWithinReviewWindow(createdAt : Time.Time) : Bool {
        let now = Time.now();
        let windowInNanos = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1_000_000_000;
        return (now - createdAt) <= windowInNanos;
    };

    private func calculateQualityScore(review : Review) : Float {
        // Basic quality score calculation based on comment length and rating
        let commentLength = Float.fromInt(Text.size(review.comment));
        let maxLength = Float.fromInt(MAX_COMMENT_LENGTH);
        let lengthScore = commentLength / maxLength;
        let ratingScore = Float.fromInt(review.rating) / Float.fromInt(MAX_RATING);
        return (lengthScore + ratingScore) / 2.0;
    };

    // Public functions
    
    // Submit a review for a booking
    public shared(msg) func submitReview(
        bookingId : Text,
        rating : Nat,
        comment : Text
    ) : async Result<Review> {
        let caller = msg.caller;
        
        // Input validation
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };
        
        if (not isValidRating(rating)) {
            return #err("Invalid rating. Must be between " # Nat.toText(MIN_RATING) # " and " # Nat.toText(MAX_RATING));
        };
        
        // Comment validation removed - comments are now optional
        
        // Check if booking exists and is eligible for review
        switch (bookingCanisterId) {
            case (?canisterId) {
                let bookingCanister = actor(Principal.toText(canisterId)) : actor {
                    isEligibleForReview : (Text, Principal) -> async Result<Bool>;
                    getBooking : (Text) -> async Result<Types.Booking>;
                };
                
                switch (await bookingCanister.isEligibleForReview(bookingId, caller)) {
                    case (#ok(true)) {
                        // Get booking details
                        switch (await bookingCanister.getBooking(bookingId)) {
                            case (#ok(booking)) {
                                // Get completion time from booking record instead of separate call
                                switch (booking.completedDate) {
                                    case (?completionTime) {
                                        if (not isWithinReviewWindow(completionTime)) {
                                            return #err("Review window has expired. Reviews must be submitted within " # Nat.toText(REVIEW_WINDOW_DAYS) # " days of service completion");
                                        };
                                        
                                        // Check if review already exists
                                        let existingReviews = Array.filter<Review>(
                                            Iter.toArray(reviews.vals()),
                                            func (review : Review) : Bool {
                                                return review.bookingId == bookingId and review.clientId == caller;
                                            }
                                        );
                                        
                                        if (existingReviews.size() > 0) {
                                            return #err("Review already exists for this booking");
                                        };
                                        
                                        let reviewId = generateId();
                                        let now = Time.now();
                                        
                                        let newReview : Review = {
                                            id = reviewId;
                                            bookingId = bookingId;
                                            clientId = caller;
                                            providerId = booking.providerId;
                                            serviceId = booking.serviceId;
                                            rating = rating;
                                            comment = comment;
                                            createdAt = now;
                                            updatedAt = now;
                                            status = #Visible;
                                            qualityScore = ?calculateQualityScore({
                                                id = reviewId;
                                                bookingId = bookingId;
                                                clientId = caller;
                                                providerId = booking.providerId;
                                                serviceId = booking.serviceId;
                                                rating = rating;
                                                comment = comment;
                                                createdAt = now;
                                                updatedAt = now;
                                                status = #Visible;
                                                qualityScore = null;
                                            });
                                        };
                                        
                                        reviews.put(reviewId, newReview);
                                        
                                        // Update service rating
                                        switch (serviceCanisterId) {
                                            case (?serviceId) {
                                                let serviceCanister = actor(Principal.toText(serviceId)) : actor {
                                                    updateServiceRating : (Text, Float, Nat) -> async Result<Types.Service>;
                                                };
                                                switch (await serviceCanister.updateServiceRating(booking.serviceId, Float.fromInt(rating), 1)) {
                                                    case (#ok(_)) {
                                                        Debug.print("Service rating updated successfully");
                                                    };
                                                    case (#err(msg)) {
                                                        Debug.print("Failed to update service rating: " # msg);
                                                    };
                                                };
                                            };
                                            case (null) {};
                                        };
                                        
                                        // Notify reputation canister with LLM-enhanced processing
                                        switch (reputationCanisterId) {
                                            case (?reputationId) {
                                                let reputationCanister = actor(Principal.toText(reputationId)) : actor {
                                                    processReviewWithLLM : (Review) -> async Result<Review>;  // ✅ Use LLM-enhanced method
                                                };
                                                switch (await reputationCanister.processReviewWithLLM(newReview)) {
                                                    case (#ok(_)) {
                                                        Debug.print("LLM-enhanced review processing completed successfully");
                                                        // You could use the processed review's status and quality score here
                                                    };
                                                    case (#err(msg)) {
                                                        Debug.print("LLM-enhanced review processing failed: " # msg);
                                                    };
                                                };
                                            };
                                            case (null) {};
                                        };
                                        
                                        return #ok(newReview);
                                    };
                                    case (null) {
                                        return #err("Booking is not completed yet. Cannot submit review until service is completed.");
                                    };
                                };
                            };
                            case (#err(msg)) {
                                return #err("Failed to get booking details: " # msg);
                            };
                        };
                    };
                    case (#ok(false)) {
                        return #err("Booking is not eligible for review");
                    };
                    case (#err(msg)) {
                        return #err(msg);
                    };
                };
            };
            case (null) {
                return #err("Booking canister reference not set");
            };
        };
    };

    // Get review by ID
    public query func getReview(reviewId : Text) : async Result<Review> {
        switch (reviews.get(reviewId)) {
            case (?review) {
                if (review.status == #Hidden) {
                    return #err("Review has been hidden");
                };
                return #ok(review);
            };
            case (null) {
                return #err("Review not found");
            };
        };
    };

    // Get reviews for a booking
    public query func getBookingReviews(bookingId : Text) : async [Review] {
        let bookingReviews = Array.filter<Review>(
            Iter.toArray(reviews.vals()),
            func (review : Review) : Bool {
                return review.bookingId == bookingId and review.status == #Visible;
            }
        );
        
        return bookingReviews;
    };

    // Get reviews by a user
    public query func getUserReviews(userId : Principal) : async [Review] {
        let userReviews = Array.filter<Review>(
            Iter.toArray(reviews.vals()),
            func (review : Review) : Bool {
                return review.clientId == userId and review.status == #Visible;
            }
        );
        
        return userReviews;
    };

    // Update a review
    public shared(msg) func updateReview(
        reviewId : Text,
        rating : Nat,
        comment : Text
    ) : async Result<Review> {
        let caller = msg.caller;
        
        // Input validation
        if (not isValidRating(rating)) {
            return #err("Invalid rating. Must be between " # Nat.toText(MIN_RATING) # " and " # Nat.toText(MAX_RATING));
        };
        
        // Comment validation removed - comments are now optional
        
        switch (reviews.get(reviewId)) {
            case (?existingReview) {
                if (existingReview.clientId != caller) {
                    return #err("Not authorized to update this review");
                };
                
                if (existingReview.status != #Visible) {
                    return #err("Cannot update a " # debug_show(existingReview.status) # " review");
                };
                
                let updatedReview : Review = {
                    id = existingReview.id;
                    bookingId = existingReview.bookingId;
                    clientId = existingReview.clientId;
                    providerId = existingReview.providerId;
                    serviceId = existingReview.serviceId;
                    rating = rating;
                    comment = comment;
                    createdAt = existingReview.createdAt;
                    updatedAt = Time.now();
                    status = #Visible;
                    qualityScore = ?calculateQualityScore({
                        id = existingReview.id;
                        bookingId = existingReview.bookingId;
                        clientId = existingReview.clientId;
                        providerId = existingReview.providerId;
                        serviceId = existingReview.serviceId;
                        rating = rating;
                        comment = comment;
                        createdAt = existingReview.createdAt;
                        updatedAt = Time.now();
                        status = #Visible;
                        qualityScore = null;
                    });
                };
                
                reviews.put(reviewId, updatedReview);
                
                // Update service rating
                switch (serviceCanisterId) {
                    case (?serviceId) {
                        let serviceCanister = actor(Principal.toText(serviceId)) : actor {
                            updateServiceRating : (Text, Float, Nat) -> async Result<Types.Service>;
                        };
                        switch (await serviceCanister.updateServiceRating(existingReview.serviceId, Float.fromInt(rating), 1)) {
                            case (#ok(_)) {
                                Debug.print("Service rating updated successfully");
                            };
                            case (#err(msg)) {
                                Debug.print("Failed to update service rating: " # msg);
                            };
                        };
                    };
                    case (null) {};
                };
                
                // Notify reputation canister with LLM-enhanced processing
                switch (reputationCanisterId) {
                    case (?reputationId) {
                        let reputationCanister = actor(Principal.toText(reputationId)) : actor {
                            processReviewWithLLM : (Review) -> async Result<Review>;  // ✅ Use LLM-enhanced method
                        };
                        switch (await reputationCanister.processReviewWithLLM(updatedReview)) {
                            case (#ok(_)) {
                                Debug.print("LLM-enhanced review processing completed successfully");
                                // You could use the processed review's status and quality score here
                            };
                            case (#err(msg)) {
                                Debug.print("LLM-enhanced review processing failed: " # msg);
                            };
                        };
                    };
                    case (null) {};
                };
                
                return #ok(updatedReview);
            };
            case (null) {
                return #err("Review not found");
            };
        };
    };

    // Delete a review
    public shared(msg) func deleteReview(reviewId : Text) : async Result<()> {
        let caller = msg.caller;
        
        switch (reviews.get(reviewId)) {
            case (?existingReview) {
                if (existingReview.clientId != caller) {
                    return #err("Not authorized to delete this review");
                };
                
                if (existingReview.status == #Hidden) {
                    return #err("Review is already hidden");
                };
                
                let updatedReview : Review = {
                    id = existingReview.id;
                    bookingId = existingReview.bookingId;
                    clientId = existingReview.clientId;
                    providerId = existingReview.providerId;
                    serviceId = existingReview.serviceId;
                    rating = existingReview.rating;
                    comment = existingReview.comment;
                    createdAt = existingReview.createdAt;
                    updatedAt = Time.now();
                    status = #Hidden;
                    qualityScore = existingReview.qualityScore;
                };
                
                reviews.put(reviewId, updatedReview);
                return #ok();
            };
            case (null) {
                return #err("Review not found");
            };
        };
    };

    // Delete all reviews for a user (for account deletion)
    public shared(msg) func deleteUserReviews(userId : Principal) : async Result<Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };
        
        // In production, verify caller is admin
        var deletedCount : Nat = 0;
        
        // Get all reviews by or about this user
        let allReviews = Iter.toArray(reviews.entries());
        for ((reviewId, review) in allReviews.vals()) {
            if (review.clientId == userId or review.providerId == userId) {
                reviews.delete(reviewId);
                deletedCount += 1;
            };
        };
        
        return #ok("Deleted " # Nat.toText(deletedCount) # " reviews");
    };

    // Calculate average rating for a provider
    public query func calculateProviderRating(providerId : Principal) : async Result<Float> {
        let providerReviews = Array.filter<Review>(
            Iter.toArray(reviews.vals()),
            func (review : Review) : Bool {
                return review.providerId == providerId and review.status == #Visible;
            }
        );
        
        if (providerReviews.size() == 0) {
            return #err("No reviews found for this provider");
        };
        
        var totalRating : Nat = 0;
        for (review in providerReviews.vals()) {
            totalRating += review.rating;
        };
        
        let averageRating = Float.fromInt(Int.abs(totalRating)) / Float.fromInt(providerReviews.size());
        return #ok(averageRating);
    };
    
    // Calculate average rating for a service
    public query func calculateServiceRating(serviceId : Text) : async Result<Float> {
        let serviceReviews = Array.filter<Review>(
            Iter.toArray(reviews.vals()),
            func (review : Review) : Bool {
                return review.serviceId == serviceId and review.status == #Visible;
            }
        );
        
        if (serviceReviews.size() == 0) {
            return #err("No reviews found for this service");
        };
        
        var totalRating : Nat = 0;
        for (review in serviceReviews.vals()) {
            totalRating += review.rating;
        };
        
        let averageRating = Float.fromInt(Int.abs(totalRating)) / Float.fromInt(serviceReviews.size());
        return #ok(averageRating);
    };

    // Calculate user average rating
    public query func calculateUserAverageRating(userId : Principal) : async Result<Float> {
        let userReviews = Array.filter<Review>(
            Iter.toArray(reviews.vals()),
            func (review : Review) : Bool {
                return review.clientId == userId and review.status == #Visible;
            }
        );
        
        if (userReviews.size() == 0) {
            return #err("No reviews found for this user");
        };
        
        var totalRating : Nat = 0;
        for (review in userReviews.vals()) {
            totalRating += review.rating;
        };
        
        let averageRating = Float.fromInt(Int.abs(totalRating)) / Float.fromInt(userReviews.size());
        return #ok(averageRating);
    };

    // Get all reviews (for admin or analytics purposes)
    public query func getAllReviews() : async [Review] {
        return Iter.toArray(reviews.vals());
    };

    // Get review statistics
    public query func getReviewStatistics() : async {
        totalReviews : Nat;
        activeReviews : Nat;
        hiddenReviews : Nat;
        flaggedReviews : Nat;
        deletedReviews : Nat;
    } {
        var total : Nat = 0;
        var active : Nat = 0;
        var hidden : Nat = 0;
        var flagged : Nat = 0;
        var _deleted : Nat = 0;
        
        for (review in reviews.vals()) {
            total += 1;
            switch (review.status) {
                case (#Visible) { active += 1; };
                case (#Hidden) { hidden += 1; };
                case (#Flagged) { flagged += 1; };
                case (#Deleted) { _deleted += 1; };
            };
        };
        
        return {
            totalReviews = total;
            activeReviews = active;
            hiddenReviews = hidden;
            flaggedReviews = flagged;
            deletedReviews = _deleted;
        };
    };

    // Set canister references (admin function)
    public shared(_msg) func setCanisterReferences(
        booking : Principal,
        service : Principal,
        reputation : Principal,
        auth : Principal
    ) : async Result<Text> {
        // In real implementation, need to check if caller has admin rights
        bookingCanisterId := ?booking;
        serviceCanisterId := ?service;
        reputationCanisterId := ?reputation;
        authCanisterId := ?auth;
        
        return #ok("Canister references set successfully");
    };
    
    // Manual initialization function for static reviews (admin function)
    public shared(_msg) func initializeStaticReviewsManually() : async Result<Text> {
        // In real implementation, need to check if caller has admin rights
        let staticReviews = StaticData.getSTATIC_REVIEWS();
        var addedCount : Nat = 0;
        
        for ((id, review) in staticReviews.vals()) {
            // Only add if review doesn't already exist
            switch (reviews.get(id)) {
                case (null) {
                    reviews.put(id, review);
                    addedCount += 1;
                };
                case (?_) {
                    // Review already exists, skip
                };
            };
        };
        
        return #ok("Successfully initialized " # Nat.toText(addedCount) # " static reviews. Total reviews: " # Nat.toText(reviews.size()));
    };
}