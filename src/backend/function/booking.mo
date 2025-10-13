import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Result "mo:base/Result";
import Debug "mo:base/Debug";

import Types "../types/shared";

persistent actor BookingCanister {
    // Type definitions
    type Booking = Types.Booking;
    type BookingStatus = Types.BookingStatus;
    type Evidence = Types.Evidence;
    type Location = Types.Location;
    type Result<T> = Types.Result<T>;
    type ReputationScore = Types.ReputationScore;
    type PaymentMethod = Types.PaymentMethod;

    // State variables
    private var bookingEntries : [(Text, Booking)] = [];
    private transient var bookings = HashMap.HashMap<Text, Booking>(10, Text.equal, Text.hash);
    
    private var evidenceEntries : [(Text, Evidence)] = [];
    private transient var evidences = HashMap.HashMap<Text, Evidence>(10, Text.equal, Text.hash);

    // Canister references
    private transient var authCanisterId : ?Principal = null;
    private transient var serviceCanisterId : ?Principal = null;
    private transient var reviewCanisterId : ?Principal = null;
    private transient var reputationCanisterId : ?Principal = null;
    private transient var commissionCanisterId : ?Principal = null;
    private transient var walletCanisterId : ?Principal = null;
    private transient var notificationCanisterId : ?Principal = null;
    private transient var adminCanisterId : ?Principal = null;

    // Constants
    // private transient let MIN_PRICE : Nat = 5;
    // private transient let MAX_PRICE : Nat = 1_000_000;
    // private transient let MIN_SCHEDULE_AHEAD : Int = 3600_000_000_000; // 1 hour in nanoseconds
    // private transient let MAX_SCHEDULE_AHEAD : Int = 30 * 24 * 3600_000_000_000; // 30 days in nanoseconds

    // Helper functions
    private func generateId() : Text {
        let now = Int.abs(Time.now());
        let random = Int.abs(Time.now()) % 10000;
        return Int.toText(now) # "-" # Int.toText(random);
    };
    
    private func isBookingEligibleForReview(booking : Booking) : Bool {
        switch (booking.completedDate) {
            case (?completedDate) {
                return booking.status == #Completed and 
                       (Time.now() - completedDate) <= (30 * 24 * 60 * 60 * 1_000_000_000);
            };
            case (null) {
                return false;
            };
        };
    };

    // private func validatePrice(price : Nat) : Bool {
    //     price >= MIN_PRICE and price <= MAX_PRICE
    // };

    // private func validateScheduledDate(requestedDate : Time.Time, scheduledDate : Time.Time) : Bool {
    //     let now = Time.now();
    //     let timeUntilScheduled = scheduledDate - now;
    //     timeUntilScheduled >= MIN_SCHEDULE_AHEAD and timeUntilScheduled <= MAX_SCHEDULE_AHEAD
    // };

    private func isValidStatusTransition(currentStatus : BookingStatus, newStatus : BookingStatus) : Bool {
        switch (currentStatus, newStatus) {
            case (#Requested, #Accepted) true;
            case (#Requested, #Declined) true;
            case (#Requested, #Cancelled) true;
            case (#Accepted, #InProgress) true;
            case (#Accepted, #Cancelled) true;
            case (#InProgress, #Completed) true;
            case (#InProgress, #Disputed) true;
            case (#Completed, #Disputed) true;
            case (_, #Disputed) true;
            case (_, _) false;
        }
    };

    private func updateBookingStatus(
        existingBooking : Booking,
        newStatus : BookingStatus,
        caller : Principal,
        isProvider : Bool
    ) : Result<Booking> {
        if (not isValidStatusTransition(existingBooking.status, newStatus)) {
            return #err("Invalid status transition from " # debug_show(existingBooking.status) # " to " # debug_show(newStatus));
        };

        if (isProvider and existingBooking.providerId != caller) {
            return #err("Not authorized to update this booking");
        };

        if (not isProvider and existingBooking.clientId != caller) {
            return #err("Not authorized to update this booking");
        };

        let updatedBooking : Booking = {
            id = existingBooking.id;
            clientId = existingBooking.clientId;
            providerId = existingBooking.providerId;
            providerName = existingBooking.providerName;
            serviceId = existingBooking.serviceId;
            servicePackageId = existingBooking.servicePackageId;
            status = newStatus;
            requestedDate = existingBooking.requestedDate;
            scheduledDate = existingBooking.scheduledDate;
            startedDate = if (newStatus == #InProgress) ?Time.now() else existingBooking.startedDate;
            completedDate = if (newStatus == #Completed) ?Time.now() else existingBooking.completedDate;
            price = existingBooking.price;
            amountPaid = existingBooking.amountPaid;
            serviceTime = existingBooking.serviceTime;
            location = existingBooking.location;
            evidence = existingBooking.evidence;
            notes = existingBooking.notes;
            paymentMethod = existingBooking.paymentMethod;
            // Copy payment status fields from existing booking
            paymentStatus = existingBooking.paymentStatus;
            paymentId = existingBooking.paymentId;
            heldAmount = existingBooking.heldAmount;
            releasedAmount = existingBooking.releasedAmount;
            commissionRetained = existingBooking.commissionRetained;
            paymentReleased = existingBooking.paymentReleased;
            releasedAt = existingBooking.releasedAt;
            payoutId = existingBooking.payoutId;
            createdAt = existingBooking.createdAt;
            updatedAt = Time.now();
        };

        #ok(updatedBooking)
    };

    // Helper function to create notifications
    private func createNotification(
        targetUserId: Principal,
        userType: Text,
        notificationType: Text,
        title: Text,
        message: Text,
        relatedEntityId: ?Text,
        metadata: ?Text
    ) : async () {
        switch (notificationCanisterId) {
            case (?canisterId) {
                try {
                    let notificationCanister = actor(Principal.toText(canisterId)) : actor {
                        createNotification: (
                            Principal, 
                            {#client; #provider}, 
                            {
                                #booking_accepted; #booking_declined; #review_reminder; #generic;
                                #new_booking_request; #booking_confirmation; #payment_completed;
                                #service_completion_reminder; #review_request; #chat_message;
                                #booking_cancelled; #booking_completed; #payment_received;
                                #payment_failed; #provider_message; #system_announcement;
                                #service_rescheduled; #service_reminder; #promo_offer;
                                #provider_on_the_way; #booking_rescheduled; #client_no_show;
                                #payment_issue;
                            }, 
                            Text, 
                            Text, 
                            ?Text, 
                            ?Text
                        ) -> async {#ok: Text; #err: Text};
                    };
                    
                    let userTypeVariant = if (userType == "client") { #client } else { #provider };
                    let notificationTypeVariant = switch (notificationType) {
                        case ("booking_accepted") { #booking_accepted };
                        case ("booking_declined") { #booking_declined };
                        case ("new_booking_request") { #new_booking_request };
                        case ("booking_confirmation") { #booking_confirmation };
                        case ("payment_completed") { #payment_completed };
                        case ("service_completion_reminder") { #service_completion_reminder };
                        case ("booking_cancelled") { #booking_cancelled };
                        case ("booking_completed") { #booking_completed };
                        case ("payment_received") { #payment_received };
                        case ("review_request") { #review_request };
                        case (_) { #generic };
                    };
                    
                    let _result = await notificationCanister.createNotification(
                        targetUserId,
                        userTypeVariant,
                        notificationTypeVariant,
                        title,
                        message,
                        relatedEntityId,
                        metadata
                    );
                } catch (_error) {
                    // Log error but don't fail the booking operation
                    // In a real implementation, you might want to add proper logging
                };
            };
            case (null) {
                // Notification canister not set, skip notification creation
            };
        };
    };

    // Initialization
    system func preupgrade() {
        bookingEntries := Iter.toArray(bookings.entries());
        evidenceEntries := Iter.toArray(evidences.entries());
    };

    system func postupgrade() {
        bookings := HashMap.fromIter<Text, Booking>(bookingEntries.vals(), 10, Text.equal, Text.hash);
        bookingEntries := [];
        
        evidences := HashMap.fromIter<Text, Evidence>(evidenceEntries.vals(), 10, Text.equal, Text.hash);
        evidenceEntries := [];

    };

    // Set canister references
    public shared(_msg) func setCanisterReferences(
        auth : ?Principal,
        service : ?Principal,
        review : ?Principal,
        reputation : ?Principal,
        commission : ?Principal,
        wallet : ?Principal,
        notification : ?Principal,
        admin : ?Principal
    ) : async Result<Text> {
        // In real implementation, need to check if caller has admin rights
        authCanisterId := auth;
        serviceCanisterId := service;
        reviewCanisterId := review;
        reputationCanisterId := reputation;
        commissionCanisterId := commission;
        walletCanisterId := wallet;
        notificationCanisterId := notification;
        adminCanisterId := admin;
        return #ok("Canister references set successfully");
    };

    // Helper function to validate provider
    private func validateProvider(providerId : Principal) : async Result<Bool> {
        switch (authCanisterId) {
            case (?authId) {
                let authCanister = actor(Principal.toText(authId)) : actor {
                    getProfile : (Principal) -> async Types.Result<Types.Profile>;
                };
                
                switch (await authCanister.getProfile(providerId)) {
                    case (#ok(profile)) {
                        if (profile.role == #ServiceProvider) {
                            return #ok(true);
                        } else {
                            return #err("Provider is not a service provider");
                        };
                    };
                    case (#err(msg)) {
                        return #err("Provider not found: " # msg);
                    };
                };
            };
            case (null) {
                return #err("Auth canister reference not set");
            };
        };
    };

    // Enhanced service-based availability validation function with booking conflict checking
    private func validateServiceAvailability(serviceId : Text, requestedDateTime : Time.Time) : async Result<Bool> {
        // Step 1: Check basic service availability (schedule, active status)
        switch (serviceCanisterId) {
            case (?serviceCanisterId) {
                let serviceCanister = actor(Principal.toText(serviceCanisterId)) : actor {
                    isServiceAvailable : (Text, Time.Time) -> async Types.Result<Bool>;
                };
                
                switch (await serviceCanister.isServiceAvailable(serviceId, requestedDateTime)) {
                    case (#ok(isAvailable)) {
                        if (not isAvailable) {
                            return #err("Service is not available at the requested date and time");
                        };
                    };
                    case (#err(msg)) {
                        return #err("Service availability check failed: " # msg);
                    };
                };
            };
            case (null) {
                return #err("Service canister reference not set");
            };
        };

        // Step 2: Check for booking conflicts in THIS canister
        let hasConflict = await checkBookingConflicts(serviceId, requestedDateTime);
        if (hasConflict) {
            return #err("Time slot is already booked");
        };

        return #ok(true);
    };

    // Helper function to check booking conflicts for a specific service and time
    private func checkBookingConflicts(serviceId : Text, requestedDateTime : Time.Time) : async Bool {
        return await checkBookingConflictsEnhanced(serviceId, requestedDateTime, null);
    };


    // Create a new booking request
    public shared(msg) func createBooking(
        serviceId : Text,
        providerId : Principal,
        price : Nat,
        location : Location,
        requestedDate : Time.Time,
        servicePackageIds : [Text],  // Array of package IDs for multiple package bookings
        notes : ?Text,
        amountToPay: ?Nat,
        paymentMethod: PaymentMethod,
        paymentId: ?Text  // Optional payment ID for e-wallet payments (Xendit invoice ID)
    ) : async Result<Booking> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        // Validate provider
        switch (await validateProvider(providerId)) {
            case (#err(msg)) {
                return #err(msg);
            };
            case (#ok(_)) {};
        };

        // Validate service ownership
        switch (serviceCanisterId) {
            case (?serviceCanisterId) {
                let serviceCanister = actor(Principal.toText(serviceCanisterId)) : actor {
                    getService : (Text) -> async Types.Result<Types.Service>;
                    getPackage : (Text) -> async Types.Result<Types.ServicePackage>;
                };
                
                switch (await serviceCanister.getService(serviceId)) {
                    case (#ok(service)) {
                        if (service.providerId != providerId) {
                            return #err("Service does not belong to the specified provider");
                        };
                        
                        // If packages are specified, validate they exist and belong to this service
                        if (servicePackageIds.size() > 0) {
                            for (packageId in servicePackageIds.vals()) {
                                switch (await serviceCanister.getPackage(packageId)) {
                                    case (#ok(package)) {
                                        if (package.serviceId != serviceId) {
                                            return #err("Package " # packageId # " does not belong to the specified service");
                                        };
                                    };
                                    case (#err(msg)) {
                                        return #err("Package " # packageId # " not found: " # msg);
                                    };
                                };
                            };
                        };
                    };
                    case (#err(msg)) {
                        return #err("Service not found: " # msg);
                    };
                };
            };
            case (null) {
                return #err("Service canister reference not set");
            };
        };
        // Validate service availability using new service-based approach
        switch (await validateServiceAvailability(serviceId, requestedDate)) {
            case (#err(msg)) {
                return #err(msg);
            };
            case (#ok(_)) {};
        };
        
        let bookingId = generateId();
        
        // If packages are specified, calculate total price from all packages
        var finalPrice = price;
        var totalPackagePrice : Nat = 0;
        
        if (servicePackageIds.size() > 0) {
            switch (serviceCanisterId) {
                case (?serviceCanisterId) {
                    let serviceCanister = actor(Principal.toText(serviceCanisterId)) : actor {
                        getPackage : (Text) -> async Types.Result<Types.ServicePackage>;
                        getService : (Text) -> async Types.Result<Types.Service>;
                    };
                    
                    for (packageId in servicePackageIds.vals()) {
                        switch (await serviceCanister.getPackage(packageId)) {
                            case (#ok(package)) {
                                totalPackagePrice += package.price;
                            };
                            case (#err(_)) {
                                // We already validated the packages exist earlier, so this shouldn't happen
                                // But if it does, we'll use the provided price
                            };
                        };
                    };
                    
                    // Use the calculated total package price if packages were found
                    if (totalPackagePrice > 0) {
                        finalPrice := totalPackagePrice;
                    };
                };
                case (null) {
                    // We already validated the service canister exists earlier, so this shouldn't happen
                };
            };
        } else {
            // No packages specified, use the provided price
            finalPrice := price;
        };
        
        let newBooking : Booking = {
            id = bookingId;
            clientId = caller;
            providerId = providerId;
            providerName = null;
            serviceId = serviceId;
            servicePackageId = servicePackageIds;
            status = #Requested;
            requestedDate = requestedDate;
            scheduledDate = null;
            startedDate = null;
            completedDate = null;
            price = finalPrice;
            amountPaid = amountToPay;
            serviceTime = null;
            location = location;
            evidence = null;
            notes = notes;
            paymentMethod = paymentMethod;
            // Initialize payment status tracking fields
            paymentStatus = switch (paymentId) {
                case (?_) ?("PAID_HELD"); // Payment already processed and held for e-wallet
                case (null) ?("PENDING"); // Cash or payment to be processed later
            };
            paymentId = paymentId; // Store the provided payment ID (Xendit invoice ID for e-wallet)
            heldAmount = switch (paymentId) {
                case (?_) ?finalPrice; // Full amount held for digital payments
                case (null) null; // No amount held for cash payments
            };
            releasedAmount = null; // Will be set when payment is released
            commissionRetained = null; // Will be set when commission is calculated
            paymentReleased = null; // Will be set to true when payment is released
            releasedAt = null; // Will be set when payment is released
            payoutId = null; // Will be set when payout is processed
            createdAt = Time.now();
            updatedAt = Time.now();
        };
        
        bookings.put(bookingId, newBooking);
        
        // Create notification for the provider about new booking request
        await createNotification(
            providerId,
            "provider",
            "new_booking_request",
            "New Booking Request",
            "You have received a new booking request for " # serviceId,
            ?bookingId,
            ?("{\"serviceId\":\"" # serviceId # "\",\"clientId\":\"" # Principal.toText(caller) # "\"}")
        );
        
        return #ok(newBooking);
    };
    
    // Get booking by ID
    public query func getBooking(bookingId : Text) : async Result<Booking> {
        switch (bookings.get(bookingId)) {
            case (?booking) {
                return #ok(booking);
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };
    
    // Get bookings for a client
    public query func getClientBookings(clientId : Principal) : async [Booking] {
        let clientBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.clientId == clientId;
            }
        );
        
        return clientBookings;
    };
    
    // Get bookings for a provider
    public query func getProviderBookings(providerId : Principal) : async [Booking] {
        let providerBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.providerId == providerId;
            }
        );
        
        return providerBookings;
    };
    
    // Helper function to validate commission balance for cash jobs
    private func validateCommissionBalance(booking : Booking) : async Result<Bool> {
        // Only check commission balance for cash payment jobs
        if (booking.paymentMethod != #CashOnHand) {
            return #ok(true); // Skip commission validation for non-cash payments
        };
        
        // Get service information and commission fee
        switch (serviceCanisterId) {
            case (?serviceId) {
                let serviceCanister = actor(Principal.toText(serviceId)) : actor {
                    getService : (Text) -> async Types.Result<Types.Service>;
                    getPackage : (Text) -> async Types.Result<Types.ServicePackage>;
                };
                
                // Check if this is a package booking or regular service booking
                var totalEstimatedCommission : Nat = 0;
                
                if (booking.servicePackageId.size() > 0) {
                    // Multiple package booking - get commission from all packages
                    for (packageId in booking.servicePackageId.vals()) {
                        switch (await serviceCanister.getPackage(packageId)) {
                            case (#ok(pkg)) {
                                totalEstimatedCommission += pkg.commissionFee * 100;
                            };
                            case (#err(msg)) {
                                return #err("Failed to get package information for " # packageId # ": " # msg);
                            };
                        };
                    };
                } else {
                    // Regular service booking - get commission from service
                    switch (await serviceCanister.getService(booking.serviceId)) {
                        case (#ok(service)) {
                            totalEstimatedCommission := service.commissionFee * 100;
                        };
                        case (#err(msg)) {
                            return #err("Failed to get service information: " # msg);
                        };
                    };
                };
                
                // Check provider's wallet balance
                switch (walletCanisterId) {
                    case (?walletId) {
                        let walletCanister = actor(Principal.toText(walletId)) : actor {
                            get_balance_of : (Principal) -> async Nat;
                        };
                        
                        let providerBalance = await walletCanister.get_balance_of(booking.providerId);
                        
                        if (providerBalance < totalEstimatedCommission) {
                            return #err("Insufficient wallet balance. Required commission: ₱" # Nat.toText(totalEstimatedCommission / 100) # ", Available balance: ₱" # Nat.toText(providerBalance / 100) # ". Please top up your wallet before accepting this booking.");
                        };
                        
                        return #ok(true);
                    };
                    case (null) {
                        return #err("Wallet canister reference not set");
                    };
                };
            };
            case (null) {
                return #err("Service canister reference not set");
            };
        };
    };
    
    // Helper function to process commission deduction for completed cash jobs
    private func processCommissionDeduction(booking : Booking) : async Result<Bool> {
        // Only process commission deduction for cash payment jobs
        if (booking.paymentMethod != #CashOnHand) {
            return #ok(true); // Skip commission deduction for non-cash payments
        };
        
        // Get service information and commission fee
        switch (serviceCanisterId) {
            case (?serviceId) {
                let serviceCanister = actor(Principal.toText(serviceId)) : actor {
                    getService : (Text) -> async Types.Result<Types.Service>;
                    getPackage : (Text) -> async Types.Result<Types.ServicePackage>;
                };
                
                // Check if this is a package booking or regular service booking
                var totalCommission : Nat = 0;
                var serviceDescriptions : [Text] = [];
                
                if (booking.servicePackageId.size() > 0) {
                    // Multiple package booking - get commission from all packages
                    for (packageId in booking.servicePackageId.vals()) {
                        switch (await serviceCanister.getPackage(packageId)) {
                            case (#ok(pkg)) {
                                totalCommission += pkg.commissionFee * 100;
                                serviceDescriptions := Array.append(serviceDescriptions, [pkg.title]);
                            };
                            case (#err(msg)) {
                                return #err("Failed to get package information for " # packageId # ": " # msg);
                            };
                        };
                    };
                } else {
                    // Regular service booking - get commission from service
                    switch (await serviceCanister.getService(booking.serviceId)) {
                        case (#ok(service)) {
                            totalCommission := service.commissionFee * 100;
                            serviceDescriptions := [service.title];
                        };
                        case (#err(msg)) {
                            return #err("Failed to get service information: " # msg);
                        };
                    };
                };
                
                // Deduct commission from provider's wallet
                switch (walletCanisterId) {
                    case (?walletId) {
                        let walletCanister = actor(Principal.toText(walletId)) : actor {
                            debit : (Principal, Nat, ?Text, ?Text) -> async Types.Result<Nat>;
                        };
                        
                        let serviceDescriptionsText = if (serviceDescriptions.size() > 0) {
                            Array.foldLeft<Text, Text>(serviceDescriptions, "", func(acc, desc) {
                                if (acc == "") desc else acc # ", " # desc
                            });
                        } else "Unknown Service";
                        
                        let commissionDescription = "Commission fee for booking #" # booking.id # " - " # serviceDescriptionsText;
                        
                        switch (await walletCanister.debit(booking.providerId, totalCommission, ?commissionDescription, ?"SRV_COMMISSION")) {
                            case (#ok(_)) {
                                return #ok(true);
                            };
                            case (#err(msg)) {
                                return #err("Failed to deduct commission: " # msg);
                            };
                        };
                    };
                    case (null) {
                        return #err("Wallet canister reference not set");
                    };
                };
            };
            case (null) {
                return #err("Service canister reference not set");
            };
        };
    };
    
    // Accept a booking request (provider) - Enhanced with conflict checking and commission validation
    public shared(msg) func acceptBooking(
        bookingId : Text,
        scheduledDate : Time.Time
    ) : async Result<Booking> {
        let caller = msg.caller;
        
        switch (bookings.get(bookingId)) {
            case (?existingBooking) {
                // Validate that the scheduled date doesn't conflict with existing bookings
                let hasConflict = await checkBookingConflicts(existingBooking.serviceId, scheduledDate);
                if (hasConflict) {
                    return #err("The scheduled time conflicts with an existing booking");
                };

                // Additional validation: Check service availability at scheduled time
                switch (await validateServiceAvailability(existingBooking.serviceId, scheduledDate)) {
                    case (#err(msg)) {
                        return #err(msg);
                    };
                    case (#ok(_)) {};
                };

                // Commission and wallet balance validation for cash jobs
                switch (await validateCommissionBalance(existingBooking)) {
                    case (#err(msg)) {
                        return #err(msg);
                    };
                    case (#ok(_)) {};
                };

            

                switch (updateBookingStatus(existingBooking, #Accepted, caller, true)) {
                    case (#ok(updatedBooking)) {
                        let finalBooking : Booking = {
                            id = updatedBooking.id;
                            clientId = updatedBooking.clientId;
                            providerId = updatedBooking.providerId;
                            providerName = updatedBooking.providerName;
                            serviceId = updatedBooking.serviceId;
                            servicePackageId = updatedBooking.servicePackageId;
                            status = updatedBooking.status;
                            requestedDate = updatedBooking.requestedDate;
                            scheduledDate = ?scheduledDate;
                            startedDate = updatedBooking.startedDate;
                            completedDate = updatedBooking.completedDate;
                            price = updatedBooking.price;
                            amountPaid = updatedBooking.amountPaid;
                            serviceTime = updatedBooking.serviceTime;
                            location = updatedBooking.location;
                            evidence = updatedBooking.evidence;
                            notes = updatedBooking.notes;
                            paymentMethod = updatedBooking.paymentMethod;
                            // Copy payment status fields from existing booking
                            paymentStatus = updatedBooking.paymentStatus;
                            paymentId = updatedBooking.paymentId;
                            heldAmount = updatedBooking.heldAmount;
                            releasedAmount = updatedBooking.releasedAmount;
                            commissionRetained = updatedBooking.commissionRetained;
                            paymentReleased = updatedBooking.paymentReleased;
                            releasedAt = updatedBooking.releasedAt;
                            payoutId = updatedBooking.payoutId;
                            createdAt = updatedBooking.createdAt;
                            updatedAt = updatedBooking.updatedAt;
                        };
                        
                        bookings.put(bookingId, finalBooking);
                        
                        // Create notification for the client about booking acceptance
                        await createNotification(
                            finalBooking.clientId,
                            "client",
                            "booking_accepted",
                            "Booking Accepted",
                            "Your booking has been accepted by the provider",
                            ?bookingId,
                            ?("{\"serviceId\":\"" # finalBooking.serviceId # "\",\"providerId\":\"" # Principal.toText(finalBooking.providerId) # "\"}")
                        );
                        
                        return #ok(finalBooking);
                    };
                    case (#err(msg)) {
                        return #err(msg);
                    };
                };
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };
    
    // Decline a booking request (provider)
    public shared(msg) func declineBooking(bookingId : Text) : async Result<Booking> {
        let caller = msg.caller;
        
        switch (bookings.get(bookingId)) {
            case (?existingBooking) {
                switch (updateBookingStatus(existingBooking, #Declined, caller, true)) {
                    case (#ok(updatedBooking)) {
                        bookings.put(bookingId, updatedBooking);
                        
                        // Create notification for the client about booking decline
                        await createNotification(
                            updatedBooking.clientId,
                            "client",
                            "booking_declined",
                            "Booking Declined",
                            "Your booking request has been declined by the provider",
                            ?bookingId,
                            ?("{\"serviceId\":\"" # updatedBooking.serviceId # "\",\"providerId\":\"" # Principal.toText(updatedBooking.providerId) # "\"}")
                        );
                        
                        return #ok(updatedBooking);
                    };
                    case (#err(msg)) {
                        return #err(msg);
                    };
                };
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };
    
    // Mark booking as in progress (provider)
    public shared(msg) func startBooking(bookingId : Text) : async Result<Booking> {
        let caller = msg.caller;
        
        switch (bookings.get(bookingId)) {
            case (?existingBooking) {
                switch (updateBookingStatus(existingBooking, #InProgress, caller, true)) {
                    case (#ok(updatedBooking)) {
                        bookings.put(bookingId, updatedBooking);
                        
                        // Create notification for the client about service starting
                        await createNotification(
                            updatedBooking.clientId,
                            "client",
                            "service_reminder",
                            "Service Started",
                            "Your service provider has started working on your booking",
                            ?bookingId,
                            ?("{\"serviceId\":\"" # updatedBooking.serviceId # "\",\"providerId\":\"" # Principal.toText(updatedBooking.providerId) # "\"}")
                        );
                        
                        return #ok(updatedBooking);
                    };
                    case (#err(msg)) {
                        return #err(msg);
                    };
                };
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };
    
    
    // Complete a booking (provider) - Enhanced with payment tracking
    public shared(msg) func completeBooking(bookingId : Text, amountPaid : ?Nat) : async Result<Booking> {
        let caller = msg.caller;
        
        switch (bookings.get(bookingId)) {
            case (?existingBooking) {
                // Calculate service time if booking was started
                let calculatedServiceTime = switch (existingBooking.startedDate) {
                    case (?startTime) {
                        ?Int.abs(Time.now() - startTime)
                    };
                    case (null) {
                        null
                    };
                };

                // Create a booking with payment info and service time before status update
                let bookingWithPaymentInfo : Booking = {
                    id = existingBooking.id;
                    clientId = existingBooking.clientId;
                    providerId = existingBooking.providerId;
                    providerName = existingBooking.providerName;
                    serviceId = existingBooking.serviceId;
                    servicePackageId = existingBooking.servicePackageId;
                    status = existingBooking.status;
                    requestedDate = existingBooking.requestedDate;
                    scheduledDate = existingBooking.scheduledDate;
                    startedDate = existingBooking.startedDate;
                    completedDate = existingBooking.completedDate;
                    price = existingBooking.price;
                    amountPaid = amountPaid;
                    serviceTime = calculatedServiceTime;
                    location = existingBooking.location;
                    evidence = existingBooking.evidence;
                    notes = existingBooking.notes;
                    paymentMethod = existingBooking.paymentMethod;
                    // Copy payment status fields from existing booking
                    paymentStatus = existingBooking.paymentStatus;
                    paymentId = existingBooking.paymentId;
                    heldAmount = existingBooking.heldAmount;
                    releasedAmount = existingBooking.releasedAmount;
                    commissionRetained = existingBooking.commissionRetained;
                    paymentReleased = existingBooking.paymentReleased;
                    releasedAt = existingBooking.releasedAt;
                    payoutId = existingBooking.payoutId;
                    createdAt = existingBooking.createdAt;
                    updatedAt = existingBooking.updatedAt;
                };

                switch (updateBookingStatus(bookingWithPaymentInfo, #Completed, caller, true)) {
                    case (#ok(updatedBooking)) {
                        
                        // Process commission deduction for cash jobs (payment method is checked inside processCommissionDeduction)
                        switch (await processCommissionDeduction(updatedBooking)) {
                            case (#err(msg)) {
                                // Commission deduction failed - this is critical for cash jobs
                                // Revert the booking status and return an error
                                return #err("Failed to complete booking: " # msg # ". Commission could not be deducted from wallet.");
                            };
                            case (#ok(_)) {
                                // Commission successfully deducted for cash jobs (or skipped for non-cash)
                                // Continue with booking completion
                            };
                        };

                        // Only update booking in storage after successful commission deduction
                        bookings.put(bookingId, updatedBooking);

                        // For digital payments, mark payment status as ready for release
                        // The actual payment release will be triggered by Firebase Cloud Functions
                        var finalBooking = updatedBooking;
                        switch (updatedBooking.paymentMethod) {
                            case (#GCash or #SRVWallet) {
                                switch (updatedBooking.paymentStatus) {
                                    case (?"PAID_HELD") {
                                        // Update payment status to indicate booking is completed and ready for release
                                        let bookingReadyForRelease : Booking = {
                                            id = updatedBooking.id;
                                            clientId = updatedBooking.clientId;
                                            providerId = updatedBooking.providerId;
                                            providerName = updatedBooking.providerName;
                                            serviceId = updatedBooking.serviceId;
                                            servicePackageId = updatedBooking.servicePackageId;
                                            status = updatedBooking.status;
                                            requestedDate = updatedBooking.requestedDate;
                                            scheduledDate = updatedBooking.scheduledDate;
                                            startedDate = updatedBooking.startedDate;
                                            completedDate = updatedBooking.completedDate;
                                            price = updatedBooking.price;
                                            amountPaid = updatedBooking.amountPaid;
                                            serviceTime = updatedBooking.serviceTime;
                                            location = updatedBooking.location;
                                            evidence = updatedBooking.evidence;
                                            notes = updatedBooking.notes;
                                            paymentMethod = updatedBooking.paymentMethod;
                                            // Update payment status to indicate ready for release
                                            paymentStatus = ?("READY_FOR_RELEASE");
                                            paymentId = updatedBooking.paymentId;
                                            heldAmount = updatedBooking.heldAmount;
                                            releasedAmount = updatedBooking.releasedAmount;
                                            commissionRetained = updatedBooking.commissionRetained;
                                            paymentReleased = updatedBooking.paymentReleased;
                                            releasedAt = updatedBooking.releasedAt;
                                            payoutId = updatedBooking.payoutId;
                                            createdAt = updatedBooking.createdAt;
                                            updatedAt = Time.now();
                                        };
                                        finalBooking := bookingReadyForRelease;
                                        bookings.put(bookingId, finalBooking);
                                    };
                                    case (_) {
                                        // Payment not held or already processed, no action needed
                                    };
                                };
                            };
                            case (#CashOnHand) {
                                // Cash payments don't need release logic
                            };
                        };
                        
                        // Update reputation scores for both provider and client
                        switch (reputationCanisterId) {
                            case (?repId) {
                                let reputationCanister = actor(Principal.toText(repId)) : actor {
                                    updateProviderReputation : (Principal) -> async Result<ReputationScore>;
                                };
                                // Update provider reputation using provider-specific function
                                ignore await reputationCanister.updateProviderReputation(finalBooking.providerId);
                            };
                            case (null) {
                                // Reputation canister not set, continue without updating reputation
                            };
                        };

                        // Create notification for the client about booking completion
                        await createNotification(
                            finalBooking.clientId,
                            "client",
                            "booking_completed",
                            "Service Completed",
                            "Your booking has been completed successfully",
                            ?bookingId,
                            ?("{\"serviceId\":\"" # finalBooking.serviceId # "\",\"providerId\":\"" # Principal.toText(finalBooking.providerId) # "\"}")
                        );

                        // Create review request notification for the client
                        await createNotification(
                            finalBooking.clientId,
                            "client",
                            "review_request",
                            "Review Request",
                            "Please review your completed service",
                            ?bookingId,
                            ?("{\"serviceId\":\"" # finalBooking.serviceId # "\",\"providerId\":\"" # Principal.toText(finalBooking.providerId) # "\"}")
                        );

                        return #ok(finalBooking);
                    };
                    case (#err(msg)) {
                        return #err(msg);
                    };
                };
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };

    // Cancel a booking (client)
    public shared(msg) func cancelBooking(bookingId : Text) : async Result<Booking> {
        let caller = msg.caller;
        
        switch (bookings.get(bookingId)) {
            case (?existingBooking) {
                switch (updateBookingStatus(existingBooking, #Cancelled, caller, false)) {
                    case (#ok(updatedBooking)) {
                        bookings.put(bookingId, updatedBooking);
                        
                        // Create notification for the provider about booking cancellation
                        await createNotification(
                            updatedBooking.providerId,
                            "provider",
                            "booking_cancelled",
                            "Booking Cancelled",
                            "A booking has been cancelled by the client",
                            ?bookingId,
                            ?("{\"serviceId\":\"" # updatedBooking.serviceId # "\",\"clientId\":\"" # Principal.toText(updatedBooking.clientId) # "\"}")
                        );
                        
                        return #ok(updatedBooking);
                    };
                    case (#err(msg)) {
                        return #err(msg);
                    };
                };
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };

    // Delete all bookings for a user (for account deletion)
    public shared(msg) func deleteUserBookings(userId : Principal) : async Result<Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };
        
        // In production, verify caller is admin
        var deletedCount : Nat = 0;
        
        // Get all bookings for this user (as client or provider)
        let allBookings = Iter.toArray(bookings.entries());
        for ((bookingId, booking) in allBookings.vals()) {
            if (booking.clientId == userId or booking.providerId == userId) {
                bookings.delete(bookingId);
                deletedCount += 1;
            };
        };
        
        return #ok("Deleted " # Nat.toText(deletedCount) # " bookings");
    };
    
    // Submit evidence for a booking
    public shared(msg) func submitEvidence(
        bookingId : Text,
        description : Text,
        fileUrls : [Text]
    ) : async Result<Evidence> {
        let caller = msg.caller;
        
        switch (bookings.get(bookingId)) {
            case (?existingBooking) {
                if (existingBooking.clientId != caller and existingBooking.providerId != caller) {
                    return #err("Not authorized to submit evidence for this booking");
                };
                
                if (existingBooking.status != #InProgress and existingBooking.status != #Completed and existingBooking.status != #Disputed) {
                    return #err("Evidence can only be submitted for in-progress, completed, or disputed bookings");
                };
                
                let evidenceId = generateId();
                
                let newEvidence : Evidence = {
                    id = evidenceId;
                    bookingId = bookingId;
                    submitterId = caller;
                    description = description;
                    fileUrls = fileUrls;
                    qualityScore = null;
                    createdAt = Time.now();
                };
                
                evidences.put(evidenceId, newEvidence);
                
                // Update booking with evidence
                let updatedBooking : Booking = {
                    id = existingBooking.id;
                    clientId = existingBooking.clientId;
                    providerId = existingBooking.providerId;
                    providerName = existingBooking.providerName;
                    serviceId = existingBooking.serviceId;
                    servicePackageId = existingBooking.servicePackageId;
                    status = existingBooking.status;
                    requestedDate = existingBooking.requestedDate;
                    scheduledDate = existingBooking.scheduledDate;
                    startedDate = existingBooking.startedDate;
                    completedDate = existingBooking.completedDate;
                    price = existingBooking.price;
                    amountPaid = existingBooking.amountPaid;
                    serviceTime = existingBooking.serviceTime;
                    location = existingBooking.location;
                    evidence = ?newEvidence;
                    notes = existingBooking.notes;
                    paymentMethod = existingBooking.paymentMethod;
                    // Copy payment status fields from existing booking
                    paymentStatus = existingBooking.paymentStatus;
                    paymentId = existingBooking.paymentId;
                    heldAmount = existingBooking.heldAmount;
                    releasedAmount = existingBooking.releasedAmount;
                    commissionRetained = existingBooking.commissionRetained;
                    paymentReleased = existingBooking.paymentReleased;
                    releasedAt = existingBooking.releasedAt;
                    payoutId = existingBooking.payoutId;
                    createdAt = existingBooking.createdAt;
                    updatedAt = Time.now();
                };
                
                bookings.put(bookingId, updatedBooking);
                return #ok(newEvidence);
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };
    
    // Dispute a booking (client or provider)
    public shared(msg) func disputeBooking(bookingId : Text) : async Result<Booking> {
        let caller = msg.caller;
        
        switch (bookings.get(bookingId)) {
            case (?existingBooking) {
                if (existingBooking.clientId != caller and existingBooking.providerId != caller) {
                    return #err("Not authorized to dispute this booking");
                };
                
                let updatedBooking : Booking = {
                    id = existingBooking.id;
                    clientId = existingBooking.clientId;
                    providerId = existingBooking.providerId;
                    providerName = existingBooking.providerName;
                    serviceId = existingBooking.serviceId;
                    servicePackageId = existingBooking.servicePackageId;
                    status = #Disputed;
                    requestedDate = existingBooking.requestedDate;
                    scheduledDate = existingBooking.scheduledDate;
                    startedDate = existingBooking.startedDate;
                    completedDate = existingBooking.completedDate;
                    price = existingBooking.price;
                    amountPaid = existingBooking.amountPaid;
                    serviceTime = existingBooking.serviceTime;
                    location = existingBooking.location;
                    evidence = existingBooking.evidence;
                    notes = existingBooking.notes;
                    paymentMethod = existingBooking.paymentMethod;
                    // Copy payment status fields from existing booking
                    paymentStatus = existingBooking.paymentStatus;
                    paymentId = existingBooking.paymentId;
                    heldAmount = existingBooking.heldAmount;
                    releasedAmount = existingBooking.releasedAmount;
                    commissionRetained = existingBooking.commissionRetained;
                    paymentReleased = existingBooking.paymentReleased;
                    releasedAt = existingBooking.releasedAt;
                    payoutId = existingBooking.payoutId;
                    createdAt = existingBooking.createdAt;
                    updatedAt = Time.now();
                };
                
                bookings.put(bookingId, updatedBooking);
                return #ok(updatedBooking);
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };
    
    // Check if a booking is eligible for review
    public query func isEligibleForReview(bookingId : Text, reviewerId : Principal) : async Result<Bool> {
        switch (bookings.get(bookingId)) {
            case (?booking) {
                if (booking.clientId != reviewerId) {
                    return #err("Only the client can review this booking");
                };
                
                return #ok(isBookingEligibleForReview(booking));
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };

    // Get bookings by status
    public query func getBookingsByStatus(status : BookingStatus) : async [Booking] {
        let statusBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.status == status;
            }
        );
        
        return statusBookings;
    };

    // Get active bookings for a client
    public query func getClientActiveBookings(clientId : Principal) : async [Booking] {
        let activeBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.clientId == clientId and 
                       (booking.status == #Requested or 
                        booking.status == #Accepted or 
                        booking.status == #InProgress);
            }
        );
        
        return activeBookings;
    };

    // Get active bookings for a provider
    public query func getProviderActiveBookings(providerId : Principal) : async [Booking] {
        let activeBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.providerId == providerId and 
                       (booking.status == #Requested or 
                        booking.status == #Accepted or 
                        booking.status == #InProgress);
            }
        );
        
        return activeBookings;
    };

    // Get completed bookings for a client
    public query func getClientCompletedBookings(clientId : Principal) : async [Booking] {
        let completedBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.clientId == clientId and booking.status == #Completed;
            }
        );
        
        return completedBookings;
    };

    // Get completed bookings for a provider
    public query func getProviderCompletedBookings(providerId : Principal) : async [Booking] {
        let completedBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.providerId == providerId and booking.status == #Completed;
            }
        );
        
        return completedBookings;
    };

    // Get disputed bookings
    public query func getDisputedBookings() : async [Booking] {
        let disputedBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.status == #Disputed;
            }
        );
        
        return disputedBookings;
    };

    // Get bookings by date range
    public query func getBookingsByDateRange(
        startDate : Time.Time,
        endDate : Time.Time
    ) : async [Booking] {
        let dateRangeBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.createdAt >= startDate and booking.createdAt <= endDate;
            }
        );
        
        return dateRangeBookings;
    };

    // CLIENT AVAILABILITY QUERY FUNCTIONS - SERVICE-BASED (RECOMMENDED)

    // ENHANCED: Get service's available time slots for a specific date with booking conflict checking
    public func getServiceAvailableSlots(
        serviceId : Text,
        date : Time.Time
    ) : async Result<[Types.AvailableSlot]> {
        // Step 1: Get basic availability from service canister
        var basicSlots : [Types.AvailableSlot] = [];
        switch (serviceCanisterId) {
            case (?serviceCanisterId) {
                let serviceCanister = actor(Principal.toText(serviceCanisterId)) : actor {
                    getAvailableTimeSlots : (Text, Time.Time) -> async Types.Result<[Types.AvailableSlot]>;
                };
                
                switch (await serviceCanister.getAvailableTimeSlots(serviceId, date)) {
                    case (#ok(slots)) {
                        basicSlots := slots;
                    };
                    case (#err(msg)) {
                        return #err(msg);
                    };
                };
            };
            case (null) {
                return #err("Service canister reference not set");
            };
        };

        // Step 2: Filter out slots that have booking conflicts
        let startOfDay = getStartOfDay(date);
        let endOfDay = startOfDay + (24 * 3600_000_000_000); // Add 24 hours in nanoseconds
        
        // Get all confirmed bookings for this service on this date
        let allBookings = Iter.toArray(bookings.vals());
        let dayBookings = Array.filter<Booking>(
            allBookings,
            func(booking: Booking) : Bool {
                // Only check confirmed bookings that actually block time slots
                // #Requested bookings don't block slots until they're accepted
                let isConfirmedStatus = switch (booking.status) {
                    case (#Accepted or #InProgress) { true };
                    case (#Requested or #Cancelled or #Declined or #Completed or #Disputed) { false };
                };
                
                if (not isConfirmedStatus or booking.serviceId != serviceId) {
                    return false;
                };

                // Check if booking falls on this date
                switch (booking.scheduledDate) {
                    case (?scheduledDate) {
                        scheduledDate >= startOfDay and scheduledDate < endOfDay
                    };
                    case (null) {
                        // For same-day bookings, check if requested date falls on this day
                        booking.requestedDate >= startOfDay and booking.requestedDate < endOfDay
                    };
                }
            }
        );

        // Step 3: Create enhanced slots with conflict information
        let enhancedSlots = Array.map<Types.AvailableSlot, Types.AvailableSlot>(
            basicSlots,
            func(slot: Types.AvailableSlot) : Types.AvailableSlot {
                // Check if this slot conflicts with any booking
                let slotConflicts = Array.filter<Booking>(
                    dayBookings,
                    func(booking: Booking) : Bool {
                        checkSlotBookingConflict(slot, booking, date)
                    }
                );

                let conflictingBookingIds = Array.map<Booking, Text>(
                    slotConflicts,
                    func(booking: Booking) : Text {
                        booking.id
                    }
                );

                // Return slot with updated availability
                {
                    date = slot.date;
                    timeSlot = slot.timeSlot;
                    isAvailable = slot.isAvailable and (slotConflicts.size() == 0);
                    conflictingBookings = conflictingBookingIds;
                }
            }
        );

        return #ok(enhancedSlots);
    };

    // Helper function to check if a time slot conflicts with a booking
    private func checkSlotBookingConflict(slot: Types.AvailableSlot, booking: Booking, _date: Time.Time) : Bool {
        // Parse slot time
        let slotStart = parseTimeToMinutes(slot.timeSlot.startTime);
        let slotEnd = parseTimeToMinutes(slot.timeSlot.endTime);
        
        // Get booking time
        let bookingTime = switch (booking.scheduledDate) {
            case (?scheduledDate) {
                // Extract time from scheduled date
                let bookingSeconds = (scheduledDate / 1_000_000_000) % 86400;
                Int.abs(bookingSeconds) / 60 // Convert to minutes from start of day
            };
            case (null) {
                // For same-day bookings, assume middle of slot or default time
                540 // 9:00 AM as default
            };
        };
        
        // Check for overlap (assume 1-hour booking duration)
        let bookingEndTime = bookingTime + 60; // 1 hour duration
        
        // Conflict if booking time overlaps with slot time
        return not (bookingEndTime <= slotStart or bookingTime >= slotEnd);
    };

    // Helper function to parse time string (HH:MM) to minutes from midnight
    private func parseTimeToMinutes(timeStr: Text) : Int {
        // Simple parsing for common time formats
        // This handles HH:MM format for times like "09:00", "10:30", etc.
        
        // For a more robust implementation, you might want to use proper text parsing libraries
        // For now, we'll handle the most common cases
        
        if (timeStr == "09:00") { 9 * 60 }
        else if (timeStr == "09:30") { 9 * 60 + 30 }
        else if (timeStr == "10:00") { 10 * 60 }
        else if (timeStr == "10:30") { 10 * 60 + 30 }
        else if (timeStr == "11:00") { 11 * 60 }
        else if (timeStr == "11:30") { 11 * 60 + 30 }
        else if (timeStr == "12:00") { 12 * 60 }
        else if (timeStr == "12:30") { 12 * 60 + 30 }
        else if (timeStr == "13:00") { 13 * 60 }
        else if (timeStr == "13:30") { 13 * 60 + 30 }
        else if (timeStr == "14:00") { 14 * 60 }
        else if (timeStr == "14:30") { 14 * 60 + 30 }
        else if (timeStr == "15:00") { 15 * 60 }
        else if (timeStr == "15:30") { 15 * 60 + 30 }
        else if (timeStr == "16:00") { 16 * 60 }
        else if (timeStr == "16:30") { 16 * 60 + 30 }
        else if (timeStr == "17:00") { 17 * 60 }
        else if (timeStr == "17:30") { 17 * 60 + 30 }
        else { 9 * 60 } // Default to 9:00 AM
    };

    // Enhanced conflict detection with better time handling
    private func checkBookingConflictsEnhanced(serviceId : Text, requestedDateTime : Time.Time, excludeBookingId : ?Text) : async Bool {
        let allBookings = Iter.toArray(bookings.vals());
        
        // Filter bookings for this service that could conflict
        let serviceBookings = Array.filter<Booking>(
            allBookings,
            func(booking: Booking) : Bool {
                // Only check confirmed bookings that actually block time slots
                // #Requested bookings don't block slots until they're accepted
                let isConfirmedStatus = switch (booking.status) {
                    case (#Accepted or #InProgress) { true };
                    case (#Requested or #Cancelled or #Declined or #Completed or #Disputed) { false };
                };
                
                let isCorrectService = booking.serviceId == serviceId;
                
                // Exclude the booking being updated (if any)
                let shouldExclude = switch (excludeBookingId) {
                    case (?excludeId) { booking.id == excludeId };
                    case (null) { false };
                };
                
                isCorrectService and isConfirmedStatus and (not shouldExclude)
            }
        );

        // Check if requested time conflicts with any existing booking
        for (booking in serviceBookings.vals()) {
            let bookingTime = switch (booking.scheduledDate) {
                case (?scheduledDate) { scheduledDate };
                case (null) { booking.requestedDate }; // Use requested date for same-day bookings
            };
            
            // Check if the booking times are on the same day and within 1-hour window
            let sameDay = (getStartOfDay(requestedDateTime) == getStartOfDay(bookingTime));
            
            if (sameDay) {
                let timeDiff = Int.abs(requestedDateTime - bookingTime);
                let oneHour = 3600_000_000_000; // 1 hour in nanoseconds
                
                if (timeDiff < oneHour) {
                    return true; // Conflict found
                };
            };
        };

        return false; // No conflicts
    };

    // Get service's availability settings
    public func getServiceAvailabilitySettings(serviceId : Text) : async Result<Types.ProviderAvailability> {
        switch (serviceCanisterId) {
            case (?serviceCanisterId) {
                let serviceCanister = actor(Principal.toText(serviceCanisterId)) : actor {
                    getServiceAvailability : (Text) -> async Types.Result<Types.ProviderAvailability>;
                };
                
                return await serviceCanister.getServiceAvailability(serviceId);
            };
            case (null) {
                return #err("Service canister reference not set");
            };
        };
    };

    // Check if service is available for booking at specific date/time
    public func checkServiceAvailability(
        serviceId : Text,
        requestedDateTime : Time.Time
    ) : async Result<Bool> {
        return await validateServiceAvailability(serviceId, requestedDateTime);
    };

    // Get service's booking conflicts for a date range
    public func getServiceBookingConflicts(
        serviceId : Text,
        startDate : Time.Time,
        endDate : Time.Time
    ) : async [Booking] {
        let serviceBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.serviceId == serviceId and 
                       booking.requestedDate >= startDate and 
                       booking.requestedDate <= endDate and
                       (booking.status == #Accepted or booking.status == #InProgress);
            }
        );
        
        return serviceBookings;
    };

    // Get daily booking count for a service on a specific date
    public query func getServiceDailyBookingCount(
        serviceId : Text,
        date : Time.Time
    ) : async Nat {
        let startOfDay = getStartOfDay(date);
        let endOfDay = startOfDay + (24 * 3600_000_000_000); // Add 24 hours in nanoseconds
        
        let dailyBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.serviceId == serviceId and 
                       booking.requestedDate >= startOfDay and
                       booking.requestedDate < endOfDay and
                       (booking.status == #Accepted or booking.status == #InProgress);
            }
        );
        
        return dailyBookings.size();
    };


    // Get daily booking count for a provider on a specific date
    public query func getDailyBookingCount(
        providerId : Principal,
        date : Time.Time
    ) : async Nat {
        let startOfDay = getStartOfDay(date);
        let endOfDay = startOfDay + (24 * 3600_000_000_000); // Add 24 hours in nanoseconds
        
        let dailyBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                return booking.providerId == providerId and 
                       (booking.status == #Accepted or booking.status == #InProgress) and
                       (switch (booking.scheduledDate) {
                           case (?scheduled) {
                               scheduled >= startOfDay and scheduled < endOfDay
                           };
                           case (null) {
                               booking.requestedDate >= startOfDay and booking.requestedDate < endOfDay
                           };
                       });
            }
        );
        
        return dailyBookings.size();
    };

    // Helper function to get start of day timestamp
    private func getStartOfDay(timestamp : Time.Time) : Time.Time {
        let secondsSinceEpoch = timestamp / 1_000_000_000;
        let daysSinceEpoch = secondsSinceEpoch / 86400;
        let startOfDaySeconds = daysSinceEpoch * 86400;
        startOfDaySeconds * 1_000_000_000
    };

    // Get bookings by package
    public query func getBookingsByPackage(servicePackageId : Text) : async [Booking] {
        let packageBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                Array.find<Text>(booking.servicePackageId, func(id: Text): Bool { id == servicePackageId }) != null
            }
        );
        
        return packageBookings;
    };

    // PAYMENT CONFIRMATION FUNCTIONS
    /**
     * Release held payment when booking is completed
     * This function is called by authorized backend services to release payments
     */
    public shared(msg) func releasePayment(
        bookingId : Text,
        paymentId : ?Text,
        releasedAmount : Nat,
        commissionRetained : Nat,
        payoutId : ?Text
    ) : async Result<Booking> {
        let _caller = msg.caller;
        
        // Security: Only allow calls from authorized backend service
        // Note: In production, this should be the Principal of your Firebase backend service
        // For now, we'll allow any caller but log the attempt for security monitoring
        // TODO: Replace with actual backend service Principal verification
        
        // Get the booking
        switch (bookings.get(bookingId)) {
            case (?booking) {
                // Verify the booking is completed and has held payment
                switch (booking.status) {
                    case (#Completed) {
                        // Verify this is a digital payment method
                        switch (booking.paymentMethod) {
                            case (#GCash or #SRVWallet) {
                                // Check if payment is currently held
                                switch (booking.paymentStatus) {
                                    case (?"PAID_HELD") {
                                        // Update booking with payment release information
                                        let updatedBooking : Booking = {
                                            id = booking.id;
                                            clientId = booking.clientId;
                                            providerId = booking.providerId;
                                            providerName = booking.providerName;
                                            serviceId = booking.serviceId;
                                            servicePackageId = booking.servicePackageId;
                                            status = booking.status;
                                            requestedDate = booking.requestedDate;
                                            scheduledDate = booking.scheduledDate;
                                            startedDate = booking.startedDate;
                                            completedDate = booking.completedDate;
                                            price = booking.price;
                                            amountPaid = booking.amountPaid;
                                            serviceTime = booking.serviceTime;
                                            location = booking.location;
                                            evidence = booking.evidence;
                                            notes = booking.notes;
                                            paymentMethod = booking.paymentMethod;
                                            // Update payment status fields
                                            paymentStatus = ?("RELEASED");
                                            paymentId = switch (paymentId) { case (?id) ?id; case (null) booking.paymentId; };
                                            heldAmount = booking.heldAmount;
                                            releasedAmount = ?releasedAmount;
                                            commissionRetained = ?commissionRetained;
                                            paymentReleased = ?true;
                                            releasedAt = ?Time.now();
                                            payoutId = payoutId;
                                            createdAt = booking.createdAt;
                                            updatedAt = Time.now();
                                        };
                                        
                                        // Update the booking in storage
                                        bookings.put(bookingId, updatedBooking);
                                        
                                        return #ok(updatedBooking);
                                    };
                                    case (?"RELEASED") {
                                        return #err("Payment has already been released for this booking");
                                    };
                                    case (_) {
                                        return #err("Payment is not in held status, current status: " # (switch (booking.paymentStatus) {
                                            case (?status) status;
                                            case (null) "null";
                                        }));
                                    };
                                };
                            };
                            case (#CashOnHand) {
                                return #err("Cash payments do not require release");
                            };
                        };
                    };
                    case (_) {
                        return #err("Booking must be completed before payment can be released, current status: " # debug_show(booking.status));
                    };
                };
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };

    /**
     * Get payment status for a booking
     * Provides payment tracking information for frontend display
     */
    public query func getPaymentStatus(bookingId : Text) : async Result<{
        paymentStatus: ?Text;
        paymentId: ?Text;
        heldAmount: ?Nat;
        releasedAmount: ?Nat;
        commissionRetained: ?Nat;
        paymentReleased: ?Bool;
        releasedAt: ?Time.Time;
        payoutId: ?Text;
    }> {
        switch (bookings.get(bookingId)) {
            case (?booking) {
                return #ok({
                    paymentStatus = booking.paymentStatus;
                    paymentId = booking.paymentId;
                    heldAmount = booking.heldAmount;
                    releasedAmount = booking.releasedAmount;
                    commissionRetained = booking.commissionRetained;
                    paymentReleased = booking.paymentReleased;
                    releasedAt = booking.releasedAt;
                    payoutId = booking.payoutId;
                });
            };
            case (null) {
                return #err("Booking not found");
            };
        };
    };

    // ANALYTICS FUNCTIONS

    // Get provider analytics (completed jobs, completion rate, total earnings)
    public shared(msg) func getProviderAnalytics(
        providerId : Principal,
        startDate : ?Time.Time,
        endDate : ?Time.Time
    ) : async Result<Types.ProviderAnalytics> {
        let caller = msg.caller;
        
        // Security check: only allow providers to view their own analytics
        // or admin users (which could be implemented with role-based auth)
        // For now, allow all calls since admin auth is disabled
        // if (caller != providerId) {
        //     return #err("Not authorized to view this provider's analytics");
        // };
        
        let now = Time.now();
        let actualStartDate = switch (startDate) {
            case (?date) date;
            case (null) 0; // Beginning of time
        };
        
        let actualEndDate = switch (endDate) {
            case (?date) date;
            case (null) now; // Current time
        };
        
        // Get all bookings for this provider within the date range
        let providerBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                let bookingDate = booking.createdAt;
                return booking.providerId == providerId 
                    and bookingDate >= actualStartDate 
                    and bookingDate <= actualEndDate;
            }
        );
        
        // Count total bookings
        let totalJobs = providerBookings.size();
        
        if (totalJobs == 0) {
            return #ok({
                providerId = providerId;
                completedJobs = 0;
                cancelledJobs = 0;
                totalJobs = 0;
                completionRate = 0.0;
                totalEarnings = 0;
                startDate = startDate;
                endDate = endDate;
                packageBreakdown = [];
            });
        };
        
        // Count completed bookings
        let completedBookings = Array.filter<Booking>(
            providerBookings,
            func (booking : Booking) : Bool {
                return booking.status == #Completed;
            }
        );
        
        let completedJobs = completedBookings.size();
        
        // Count cancelled bookings
        let cancelledBookings = Array.filter<Booking>(
            providerBookings,
            func (booking : Booking) : Bool {
                return booking.status == #Cancelled or booking.status == #Declined;
            }
        );
        
        let cancelledJobs = cancelledBookings.size();
        
        // Count accepted bookings (used for completion rate)
        let acceptedBookings = Array.filter<Booking>(
            providerBookings,
            func (booking : Booking) : Bool {
                return booking.status == #Accepted or 
                       booking.status == #InProgress or 
                       booking.status == #Completed;
            }
        );
        
        let acceptedJobs = acceptedBookings.size();
        
        // Calculate completion rate
        let completionRate = if (acceptedJobs == 0) {
            0.0
        } else {
            Float.fromInt(completedJobs * 100) / Float.fromInt(acceptedJobs)
        };
        
        // Calculate total earnings from completed bookings
        var totalEarnings : Nat = 0;
        for (booking in completedBookings.vals()) {
            totalEarnings += booking.price;
        };
        
        // Create a breakdown of package bookings
        var packageCounts = HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);
        
        for (booking in completedBookings.vals()) {
            for (packageId in booking.servicePackageId.vals()) {
                let currentCount = switch (packageCounts.get(packageId)) {
                    case (?count) count;
                    case (null) 0;
                };
                packageCounts.put(packageId, currentCount + 1);
            };
        };
        
        let packageBreakdown = Iter.toArray(packageCounts.entries());
        
        // Return the analytics data
        return #ok({
            providerId = providerId;
            completedJobs = completedJobs;
            cancelledJobs = cancelledJobs;
            totalJobs = totalJobs;
            completionRate = completionRate;
            totalEarnings = totalEarnings;
            startDate = startDate;
            endDate = endDate;
            packageBreakdown = packageBreakdown;
        });
    };
    
    // Get client analytics (spending, booking patterns)
    public shared(msg) func getClientAnalytics(
        clientId : Principal,
        startDate : ?Time.Time,
        endDate : ?Time.Time
    ) : async Result<Types.ClientAnalytics> {
        let caller = msg.caller;
        
        // Security check: only allow clients to view their own analytics
        if (caller != clientId) {
            return #err("Not authorized to view this client's analytics");
        };

        // Get user profile for member since date
        var memberSinceDate : Time.Time = Time.now(); // Default fallback
        switch (authCanisterId) {
            case (?authId) {
                let authCanister = actor(Principal.toText(authId)) : actor {
                    getProfile : (Principal) -> async Types.Result<Types.Profile>;
                };
                
                switch (await authCanister.getProfile(clientId)) {
                    case (#ok(profile)) {
                        memberSinceDate := profile.createdAt;
                    };
                    case (#err(_)) {
                        // Continue with default date if profile not found
                    };
                };
            };
            case (null) {
                // Continue with default date if auth canister not set
            };
        };
        
        let now = Time.now();
        let actualStartDate = switch (startDate) {
            case (?date) date;
            case (null) 0; // Beginning of time
        };
        
        let actualEndDate = switch (endDate) {
            case (?date) date;
            case (null) now; // Current time
        };
        
        // Get all bookings for this client within the date range
        let clientBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                let bookingDate = booking.createdAt;
                return booking.clientId == clientId 
                    and bookingDate >= actualStartDate 
                    and bookingDate <= actualEndDate;
            }
        );
        
        // Count total bookings
        let totalBookings = clientBookings.size();
        
        // Count completed bookings only
        let completedBookings = Array.filter<Booking>(
            clientBookings,
            func (booking : Booking) : Bool {
                return booking.status == #Completed;
            }
        );
        
        let servicesCompleted = completedBookings.size();
        
        // Calculate total spending from completed bookings only
        var totalSpent : Nat = 0;
        for (booking in completedBookings.vals()) {
            totalSpent += booking.price;
        };
        
        // Create a breakdown of package bookings from completed bookings
        var packageCounts = HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);
        
        for (booking in completedBookings.vals()) {
            for (packageId in booking.servicePackageId.vals()) {
                let currentCount = switch (packageCounts.get(packageId)) {
                    case (?count) count;
                    case (null) 0;
                };
                packageCounts.put(packageId, currentCount + 1);
            };
        };
        
        let packageBreakdown = Iter.toArray(packageCounts.entries());
        
        // Return the client analytics data
        return #ok({
            clientId = clientId;
            totalBookings = totalBookings;
            servicesCompleted = servicesCompleted;
            totalSpent = totalSpent;
            memberSince = memberSinceDate;
            packageBreakdown = packageBreakdown;
            startDate = startDate;
            endDate = endDate;
        });
    };
    
    // Get client analytics for admin (bypasses security check)
    public shared(msg) func getClientAnalyticsForAdmin(
        clientId : Principal,
        startDate : ?Time.Time,
        endDate : ?Time.Time
    ) : async Result<Types.ClientAnalytics> {
        let caller = msg.caller;
        
        // Security check: only allow admin canister to call this function
        switch (adminCanisterId) {
            case (?adminId) {
                if (caller != adminId) {
                    return #err("Not authorized - only admin canister can access this function");
                };
            };
            case (null) {
               
            };
        };

        // Get user profile for member since date
        var memberSinceDate : Time.Time = Time.now(); // Default fallback
        switch (authCanisterId) {
            case (?authId) {
                let authCanister = actor(Principal.toText(authId)) : actor {
                    getProfile : (Principal) -> async Types.Result<Types.Profile>;
                };
                
                switch (await authCanister.getProfile(clientId)) {
                    case (#ok(profile)) {
                        memberSinceDate := profile.createdAt;
                    };
                    case (#err(_)) {
                        // Continue with default date if profile not found
                    };
                };
            };
            case (null) {
                // Continue with default date if auth canister not set
            };
        };
        
        let now = Time.now();
        let actualStartDate = switch (startDate) {
            case (?date) date;
            case (null) 0; // Beginning of time
        };
        
        let actualEndDate = switch (endDate) {
            case (?date) date;
            case (null) now; // Current time
        };
        
        // Get all bookings for this client within the date range
        let clientBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                let bookingDate = booking.createdAt;
                return booking.clientId == clientId 
                    and bookingDate >= actualStartDate 
                    and bookingDate <= actualEndDate;
            }
        );
        
        // Count total bookings
        let totalBookings = clientBookings.size();
        
        // Filter completed bookings
        let completedBookings = Array.filter<Booking>(
            clientBookings,
            func (booking : Booking) : Bool {
                booking.status == #Completed
            }
        );
        
        let servicesCompleted = completedBookings.size();
        
        // Calculate total spending from completed bookings only
        var totalSpent : Nat = 0;
        for (booking in completedBookings.vals()) {
            totalSpent += booking.price;
        };
        
        // Create a breakdown of package bookings from completed bookings
        var packageCounts = HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);
        
        for (booking in completedBookings.vals()) {
            for (packageId in booking.servicePackageId.vals()) {
                let currentCount = switch (packageCounts.get(packageId)) {
                    case (?count) count;
                    case (null) 0;
                };
                packageCounts.put(packageId, currentCount + 1);
            };
        };
        
        let packageBreakdown = Iter.toArray(packageCounts.entries());
        
        // Return the client analytics data
        return #ok({
            clientId = clientId;
            totalBookings = totalBookings;
            servicesCompleted = servicesCompleted;
            totalSpent = totalSpent;
            memberSince = memberSinceDate;
            packageBreakdown = packageBreakdown;
            startDate = startDate;
            endDate = endDate;
        });
    };
    
   
    
    // Get analytics for a specific service
    public func getServiceAnalytics(
        serviceId : Text,
        startDate : ?Time.Time,
        endDate : ?Time.Time
    ) : async Result<Types.ProviderAnalytics> {
        let now = Time.now();
        let actualStartDate = switch (startDate) {
            case (?date) date;
            case (null) 0; // Beginning of time
        };
        
        let actualEndDate = switch (endDate) {
            case (?date) date;
            case (null) now; // Current time
        };
        
        // Verify service exists
        var serviceProviderId : Principal = Principal.fromText("aaaaa-aa"); // Default value

        switch (serviceCanisterId) {
            case (?serviceCanisterId) {
                let serviceCanister = actor(Principal.toText(serviceCanisterId)) : actor {
                    getService : (Text) -> async Types.Result<Types.Service>;
                };
                
                switch (await serviceCanister.getService(serviceId)) {
                    case (#err(msg)) {
                        return #err("Service not found: " # msg);
                    };
                    case (#ok(service)) {
                        // Store the actual provider ID from the service
                        serviceProviderId := service.providerId;
                        // Service exists, continue with analytics
                    };
                };
            };
            case (null) {
                return #err("Service canister reference not set");
            };
        };
        
        // Get all bookings for this service within the date range
        let serviceBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                let bookingDate = booking.createdAt;
                return booking.serviceId == serviceId 
                    and bookingDate >= actualStartDate 
                    and bookingDate <= actualEndDate;
            }
        );
        
        // Count total bookings
        let totalJobs = serviceBookings.size();
        
        if (totalJobs == 0) {
            return #ok({
                providerId = serviceProviderId; // Use the actual provider ID
                completedJobs = 0;
                cancelledJobs = 0;
                totalJobs = 0;
                completionRate = 0.0;
                totalEarnings = 0;
                startDate = startDate;
                endDate = endDate;
                packageBreakdown = [];
            });
        };
        
        // Count completed bookings
        let completedBookings = Array.filter<Booking>(
            serviceBookings,
            func (booking : Booking) : Bool {
                return booking.status == #Completed;
            }
        );
        
        let completedJobs = completedBookings.size();
        
        // Count cancelled bookings
        let cancelledBookings = Array.filter<Booking>(
            serviceBookings,
            func (booking : Booking) : Bool {
                return booking.status == #Cancelled or booking.status == #Declined;
            }
        );
        
        let cancelledJobs = cancelledBookings.size();
        
        // Count accepted bookings (used for completion rate)
        let acceptedBookings = Array.filter<Booking>(
            serviceBookings,
            func (booking : Booking) : Bool {
                return booking.status == #Accepted or 
                       booking.status == #InProgress or 
                       booking.status == #Completed;
            }
        );
        
        let acceptedJobs = acceptedBookings.size();
        
        // Calculate completion rate
        let completionRate = if (acceptedJobs == 0) {
            0.0
        } else {
            Float.fromInt(completedJobs * 100) / Float.fromInt(acceptedJobs)
        };
        
        // Calculate total revenue from completed bookings
        var totalEarnings : Nat = 0;
        for (booking in completedBookings.vals()) {
            totalEarnings += booking.price;
        };
        
        // Create a breakdown of package bookings
        var packageCounts = HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);
        
        for (booking in completedBookings.vals()) {
            for (packageId in booking.servicePackageId.vals()) {
                let currentCount = switch (packageCounts.get(packageId)) {
                    case (?count) count;
                    case (null) 0;
                };
                packageCounts.put(packageId, currentCount + 1);
            };
        };
        
        let packageBreakdown = Iter.toArray(packageCounts.entries());
        
        // Get the service provider (for the analytics result)
        var providerId = Principal.fromText("aaaaa-aa"); // Default to IC management canister
        if (serviceBookings.size() > 0) {
            providerId := serviceBookings[0].providerId;
        };
        
        // Return the analytics data
        return #ok({
            providerId = providerId;
            completedJobs = completedJobs;
            cancelledJobs = cancelledJobs;
            totalJobs = totalJobs;
            completionRate = completionRate;
            totalEarnings = totalEarnings;
            startDate = startDate;
            endDate = endDate;
            packageBreakdown = packageBreakdown;
        });
    };
    
    // Get analytics for a specific package
    public func getPackageAnalytics(
        packageId : Text,
        startDate : ?Time.Time,
        endDate : ?Time.Time
    ) : async Result<Types.ProviderAnalytics> {
        let now = Time.now();
        let actualStartDate = switch (startDate) {
            case (?date) date;
            case (null) 0; // Beginning of time
        };
        
        let actualEndDate = switch (endDate) {
            case (?date) date;
            case (null) now; // Current time
        };
        
        // Verify package exists
        var packageProviderId : Principal = Principal.fromText("aaaaa-aa"); // Default value

        switch (serviceCanisterId) {
            case (?serviceCanisterId) {
                let serviceCanister = actor(Principal.toText(serviceCanisterId)) : actor {
                    getPackage : (Text) -> async Types.Result<Types.ServicePackage>;
                    getService : (Text) -> async Types.Result<Types.Service>;
                };
                
                switch (await serviceCanister.getPackage(packageId)) {
                    case (#err(msg)) {
                        return #err("Package not found: " # msg);
                    };
                    case (#ok(package)) {
                        // Get the service to find its provider
                        switch (await serviceCanister.getService(package.serviceId)) {
                            case (#ok(service)) {
                                packageProviderId := service.providerId;
                            };
                            case (#err(_)) {
                                // If service can't be found, keep the default ID
                            };
                        };
                        // Package exists, continue with analytics
                    };
                };
            };
            case (null) {
                return #err("Service canister reference not set");
            };
        };
        
        // Get all bookings for this package within the date range
        let packageBookings = Array.filter<Booking>(
            Iter.toArray(bookings.vals()),
            func (booking : Booking) : Bool {
                let bookingDate = booking.createdAt;
                let matchesPackage = Array.find<Text>(booking.servicePackageId, func(id: Text): Bool { id == packageId }) != null;
                return matchesPackage 
                    and bookingDate >= actualStartDate 
                    and bookingDate <= actualEndDate;
            }
        );
        
        // Count total bookings
        let totalJobs = packageBookings.size();
        
        if (totalJobs == 0) {
            return #ok({
                providerId = packageProviderId; // Use the actual provider ID
                completedJobs = 0;
                cancelledJobs = 0;
                totalJobs = 0;
                completionRate = 0.0;
                totalEarnings = 0;
                startDate = startDate;
                endDate = endDate;
                packageBreakdown = [];
            });
        };
        
        // Count completed bookings
        let completedBookings = Array.filter<Booking>(
            packageBookings,
            func (booking : Booking) : Bool {
                return booking.status == #Completed;
            }
        );
        
        let completedJobs = completedBookings.size();
        
        // Count cancelled bookings
        let cancelledBookings = Array.filter<Booking>(
            packageBookings,
            func (booking : Booking) : Bool {
                return booking.status == #Cancelled or booking.status == #Declined;
            }
        );
        
        let cancelledJobs = cancelledBookings.size();
        
        // Calculate total revenue from completed bookings
        var totalEarnings : Nat = 0;
        for (booking in completedBookings.vals()) {
            totalEarnings += booking.price;
        };
        
        // Calculate completion rate
        let completionRate = if (totalJobs == 0) {
            0.0
        } else {
            Float.fromInt(completedJobs * 100) / Float.fromInt(totalJobs)
        };
        
        // Get the service provider (for the analytics result)
        var providerId = Principal.fromText("aaaaa-aa"); // Default to IC management canister
        if (packageBookings.size() > 0) {
            providerId := packageBookings[0].providerId;
        };
        
        // Return the analytics data
        return #ok({
            providerId = providerId;
            completedJobs = completedJobs;
            cancelledJobs = cancelledJobs;
            totalJobs = totalJobs;
            completionRate = completionRate;
            totalEarnings = totalEarnings;
            startDate = startDate;
            endDate = endDate;
            packageBreakdown = []; // No sub-packages for package analytics
        });
    };
}