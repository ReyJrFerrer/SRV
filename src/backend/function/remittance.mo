import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Result "mo:base/Result";

import Types "../types/shared";

persistent actor RemittanceCanister {
    // Type definitions
    type RemittanceOrder = Types.RemittanceOrder;
    type RemittanceOrderStatus = Types.RemittanceOrderStatus;
    type CommissionRule = Types.CommissionRule;
    type CommissionFormula = Types.CommissionFormula;
    type CommissionQuote = Types.CommissionQuote;
    type PaymentMethod = Types.PaymentMethod;
    type SettlementInstruction = Types.SettlementInstruction;
    type RemittanceOrderFilter = Types.RemittanceOrderFilter;
    type PageRequest = Types.PageRequest;
    type RemittanceOrderPage = Types.RemittanceOrderPage;
    type MediaValidationSummary = Types.MediaValidationSummary;
    type Result<T> = Types.Result<T>;

    // State variables
    private var orderEntries : [(Text, RemittanceOrder)] = [];
    private transient var orders = HashMap.HashMap<Text, RemittanceOrder>(10, Text.equal, Text.hash);
    
    private var ruleEntries : [(Text, CommissionRule)] = [];
    private transient var commissionRules = HashMap.HashMap<Text, CommissionRule>(10, Text.equal, Text.hash);

    // Canister references
    private var authCanisterId : ?Principal = null;
    private var mediaCanisterId : ?Principal = null;
    private var bookingCanisterId : ?Principal = null;
    private var serviceCanisterId : ?Principal = null;
    private var adminCanisterId : ?Principal = null;

    // Settings
    private var corporateGCashAccount : Text = "09123456789";
    private var settlementDeadlineHours : Nat32 = 24;

    // Counter for ensuring unique IDs
    private var idCounter : Nat = 0;

    // Constants
    private let MIN_AMOUNT : Nat = 100; // 1 PHP minimum in centavos
    private let MAX_AMOUNT : Nat = 1_000_000_00; // 1M PHP maximum in centavos
    private let DEFAULT_COMMISSION_RATE : Nat = 300; // 3% in basis points

    // Helper functions
    private func generateOrderId() : Text {
        let now = Int.abs(Time.now());
        idCounter += 1;
        return "RMT-" # Int.toText(now) # "-" # Nat.toText(idCounter);
    };

    private func generateReferenceNumber(orderId: Text) : Text {
        let now = Time.now() / 1_000_000_000; // Convert to seconds
        let date = Int.abs(now) % 100000000; // Get last 8 digits for date
        
        // Take first 4 chars of order ID or full text if shorter
        let orderChars = Text.toArray(orderId);
        let takeCount = Nat.min(orderChars.size(), 4);
        let orderSuffix = Text.fromArray(Array.tabulate<Char>(takeCount, func(i: Nat): Char { orderChars[i] }));
        
        let checksum = (Int.abs(now) % 97) + 1; // Simple checksum
        
        "SRV" # Int.toText(date) # orderSuffix # Int.toText(checksum)
    };

    private func calculateCommission(amount: Nat, rule: CommissionRule) : Nat {
        switch (rule.formula) {
            case (#Flat(flatAmount)) {
                flatAmount
            };
            case (#Percentage(rateBps)) {
                // Convert basis points to percentage: rateBps / 10000 * amount
                (amount * rateBps) / 10000
            };
            case (#Tiered(tiers)) {
                // Find appropriate tier
                for ((upTo, rateBps) in tiers.vals()) {
                    if (amount <= upTo) {
                        return (amount * rateBps) / 10000;
                    };
                };
                // If no tier found, use last tier rate
                if (tiers.size() > 0) {
                    let lastTier = tiers[tiers.size() - 1];
                    (amount * lastTier.1) / 10000
                } else {
                    DEFAULT_COMMISSION_RATE * amount / 10000
                }
            };
            case (#Hybrid({base = _; rate_bps})) {
                rate_bps + ((amount * rate_bps) / 10000)
            };
        }
    };

    private func applyCommissionCaps(commission: Nat, rule: CommissionRule) : Nat {
        var finalCommission = commission;
        
        // Apply minimum cap
        switch (rule.min_commission) {
            case (?min) {
                if (finalCommission < min) {
                    finalCommission := min;
                };
            };
            case null {};
        };
        
        // Apply maximum cap
        switch (rule.max_commission) {
            case (?max) {
                if (finalCommission > max) {
                    finalCommission := max;
                };
            };
            case null {};
        };
        
        finalCommission
    };

    private func findBestCommissionRule(serviceType: Text, paymentMethod: PaymentMethod) : ?CommissionRule {
        let allRules = Iter.toArray(commissionRules.vals());
        let activeRules = Array.filter<CommissionRule>(allRules, func(rule: CommissionRule) : Bool {
            rule.is_active and Time.now() >= rule.effective_from and
            (switch (rule.effective_to) {
                case (?endTime) Time.now() <= endTime;
                case null true;
            })
        });

        let matchingRules = Array.filter<CommissionRule>(activeRules, func(rule: CommissionRule) : Bool {
            // Check if service type matches
            let serviceTypeMatches = Array.find<Text>(rule.service_types, func(st: Text) : Bool { st == serviceType }) != null;
            
            // Check if payment method matches
            let paymentMethodMatches = Array.find<PaymentMethod>(rule.payment_methods, func(pm: PaymentMethod) : Bool {
                switch (pm, paymentMethod) {
                    case (#CashOnHand, #CashOnHand) true;
                }
            }) != null;
            
            serviceTypeMatches and paymentMethodMatches
        });

        // Sort by priority and return the first one
        let sortedRules = Array.sort<CommissionRule>(matchingRules, func(a: CommissionRule, b: CommissionRule) : {#less; #equal; #greater} {
            if (a.priority < b.priority) #less
            else if (a.priority > b.priority) #greater  
            else #equal
        });

        if (sortedRules.size() > 0) {
            ?sortedRules[0]
        } else {
            null
        }
    };

    private func validateMediaProofs(mediaIds: [Text]) : async Result<[MediaValidationSummary]> {
        if (mediaIds.size() == 0) {
            return #err("At least one proof media is required");
        };

        switch (mediaCanisterId) {
            case (?canisterId) {
                let mediaActor = actor(Principal.toText(canisterId)) : actor {
                    validateMediaItems: ([Text]) -> async Result<[MediaValidationSummary]>;
                };
                
                try {
                    await mediaActor.validateMediaItems(mediaIds)
                } catch (_) {
                    #err("Failed to validate media proofs")
                }
            };
            case null {
                // If media canister not configured, create mock validation summaries
                let mockSummaries = Array.map<Text, MediaValidationSummary>(mediaIds, func(id: Text) : MediaValidationSummary {
                    {
                        media_id = id;
                        sha256 = null;
                        mime_type = "image/jpeg"; // Default assumption
                        size_bytes = 1000000; // 1MB default
                        uploaded_at = Time.now();
                        extracted_timestamp = null;
                        is_valid_type = true;
                        is_within_size_limit = true;
                        has_text_content = null;
                        validation_flags = [];
                    }
                });
                #ok(mockSummaries)
            };
        }
    };

    private func isValidStatusTransition(currentStatus: RemittanceOrderStatus, newStatus: RemittanceOrderStatus) : Bool {
        switch (currentStatus, newStatus) {
            case (#AwaitingPayment, #PaymentSubmitted) true;
            case (#AwaitingPayment, #Cancelled) true;
            case (#PaymentSubmitted, #PaymentValidated) true;
            case (#PaymentSubmitted, #Cancelled) true;
            case (#PaymentValidated, #Settled) true;
            case (#PaymentValidated, #Cancelled) true;
            case (_, _) false;
        }
    };

    // Initialize static commission rules
    private func initializeStaticCommissionRules() {
        // Default commission rule
        let defaultRule : CommissionRule = {
            id = "rule-default-commission";
            version = 1;
            service_types = ["cat-001", "cat-002", "cat-003", "cat-004", "cat-005", "cat-006", "cat-007", "cat-008", "cat-009"];
            payment_methods = [#CashOnHand];
            formula = #Percentage(DEFAULT_COMMISSION_RATE); // 3%
            min_commission = ?500; // 5 PHP minimum
            max_commission = ?10000_00; // 100 PHP maximum  
            priority = 100;
            effective_from = 1640995200000000000; // 2022-01-01
            effective_to = null;
            is_active = true;
            created_at = Time.now();
            updated_at = Time.now();
        };
        
        commissionRules.put(defaultRule.id, defaultRule);

        // Premium service higher commission rule
        let premiumRule : CommissionRule = {
            id = "rule-premium-services";
            version = 1;
            service_types = ["cat-005", "cat-007", "cat-009"]; // Beauty, Massage, Photography
            payment_methods = [#CashOnHand];
            formula = #Percentage(500); // 5%
            min_commission = ?1000; // 10 PHP minimum
            max_commission = ?15000_00; // 150 PHP maximum
            priority = 50; // Higher priority than default
            effective_from = 1640995200000000000;
            effective_to = null;
            is_active = true;
            created_at = Time.now();
            updated_at = Time.now();
        };
        
        commissionRules.put(premiumRule.id, premiumRule);
    };

    // Initialization
    system func preupgrade() {
        orderEntries := Iter.toArray(orders.entries());
        ruleEntries := Iter.toArray(commissionRules.entries());
    };

    system func postupgrade() {
        orders := HashMap.fromIter<Text, RemittanceOrder>(orderEntries.vals(), 10, Text.equal, Text.hash);
        orderEntries := [];
        
        commissionRules := HashMap.fromIter<Text, CommissionRule>(ruleEntries.vals(), 10, Text.equal, Text.hash);
        ruleEntries := [];

        // Initialize static rules if empty
        if (commissionRules.size() == 0) {
            initializeStaticCommissionRules();
        };
    };

    // Set canister references
    public shared(_msg) func setCanisterReferences(
        auth: ?Principal,
        media: ?Principal,
        booking: ?Principal,
        service: ?Principal,
        admin: ?Principal
    ) : async Result<Text> {
        // In real implementation, should check admin rights
        authCanisterId := auth;
        mediaCanisterId := media;
        bookingCanisterId := booking;
        serviceCanisterId := service;
        adminCanisterId := admin;
        #ok("Canister references set successfully")
    };

    // Quote commission for an amount and service type
    public query func quoteCommission(
        amount: Nat,
        serviceType: Text, 
        paymentMethod: PaymentMethod,
        _timestamp: Time.Time
    ) : async Result<CommissionQuote> {
        if (amount < MIN_AMOUNT or amount > MAX_AMOUNT) {
            return #err("Amount must be between " # Nat.toText(MIN_AMOUNT) # " and " # Nat.toText(MAX_AMOUNT) # " centavos");
        };

        switch (findBestCommissionRule(serviceType, paymentMethod)) {
            case (?rule) {
                let baseCommission = calculateCommission(amount, rule);
                let finalCommission = applyCommissionCaps(baseCommission, rule);
                let netProceeds = Int.abs(amount - finalCommission);
                let effectiveRate = if (amount > 0) { 
                    let commissionInt = Int.abs(finalCommission);
                    let amountInt = Int.abs(amount);
                    if (amountInt > 0) {
                        Float.fromInt(commissionInt * 10000 / amountInt) / 100.0
                    } else {
                        0.0
                    }
                } else { 
                    0.0 
                };

                #ok({
                    rule_id = rule.id;
                    rule_version = rule.version;
                    commission = finalCommission;
                    net = netProceeds;
                    effective_rate = effectiveRate;
                })
            };
            case null {
                #err("No commission rule found for service type: " # serviceType)
            };
        }
    };

    // Create a new remittance order
    public shared(msg) func createOrder(input: {
        service_provider_id: Principal;
        amount: Nat;
        service_type: Text;
        service_id: ?Text;
        booking_id: ?Text;
    }) : async Result<RemittanceOrder> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous caller not allowed");
        };

        // Validate amount
        if (input.amount < MIN_AMOUNT or input.amount > MAX_AMOUNT) {
            return #err("Amount must be between " # Nat.toText(MIN_AMOUNT) # " and " # Nat.toText(MAX_AMOUNT) # " centavos");
        };

        // Get commission quote
        let paymentMethod = #CashOnHand;
        let quoteResult = await quoteCommission(input.amount, input.service_type, paymentMethod, Time.now());
        
        let quote = switch (quoteResult) {
            case (#ok(q)) q;
            case (#err(e)) return #err("Commission calculation failed: " # e);
        };

        let orderId = generateOrderId();
        let now = Time.now();
        
        let newOrder : RemittanceOrder = {
            id = orderId;
            service_provider_id = input.service_provider_id;
            amount_php_centavos = input.amount;
            service_type = input.service_type;
            service_id = input.service_id;
            booking_id = input.booking_id;
            payment_method = paymentMethod;
            status = #AwaitingPayment;
            commission_rule_id = quote.rule_id;
            commission_version = quote.rule_version;
            commission_amount = quote.commission;
            payment_proof_media_ids = [];
            validated_by = null;
            validated_at = null;
            created_at = now;
            payment_submitted_at = null;
            settled_at = null;
            updated_at = now;
        };

        orders.put(orderId, newOrder);
        #ok(newOrder)
    };

    // Service provider submits payment proof
    public shared(msg) func submitPaymentProof(
        orderId: Text,
        proofMediaIds: [Text] // media IDs for GCash payment screenshots
    ) : async Result<RemittanceOrder> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        switch (orders.get(orderId)) {
            case (?order) {
                // Check if caller is the service provider
                if (order.service_provider_id != caller) {
                    return #err("Only the service provider can submit payment proof");
                };

                // Check status transition
                if (not isValidStatusTransition(order.status, #PaymentSubmitted)) {
                    return #err("Cannot submit payment proof in current status");
                };

                // Validate proofs
                switch (await validateMediaProofs(proofMediaIds)) {
                    case (#ok(validations)) {
                        // Check if all proofs are valid
                        let allValid = Array.foldLeft<MediaValidationSummary, Bool>(validations, true, func(acc, validation) {
                            acc and validation.is_valid_type and validation.is_within_size_limit
                        });

                        if (not allValid) {
                            return #err("One or more proof media files are invalid");
                        };

                        let updatedOrder : RemittanceOrder = {
                            order with
                            status = #PaymentSubmitted;
                            payment_proof_media_ids = proofMediaIds;
                            payment_submitted_at = ?Time.now();
                            updated_at = Time.now();
                        };

                        orders.put(orderId, updatedOrder);
                        #ok(updatedOrder)
                    };
                    case (#err(msg)) {
                        #err("Media validation failed: " # msg)
                    };
                }
            };
            case null {
                #err("Order not found: " # orderId)
            };
        }
    };

    // Generate settlement instruction for service provider
    public query func generateSettlementInstruction(orderId: Text) : async Result<SettlementInstruction> {
        switch (orders.get(orderId)) {
            case (?order) {
                if (order.status != #AwaitingPayment) {
                    return #err("Settlement instruction only available for orders awaiting payment");
                };

                let referenceNumber = generateReferenceNumber(orderId);
                let expiresAt = Time.now() + (Int.abs(Nat32.toNat(settlementDeadlineHours)) * 3600_000_000_000);
                
                #ok({
                    corporate_gcash_account = corporateGCashAccount;
                    commission_amount = order.commission_amount;
                    reference_number = referenceNumber;
                    instructions = "Please send " # Nat.toText(order.commission_amount / 100) # " PHP to GCash account " # corporateGCashAccount # " with reference: " # referenceNumber # ". Then upload the payment screenshot.";
                    expires_at = expiresAt;
                })
            };
            case null {
                #err("Order not found: " # orderId)
            };
        }
    };

    // Admin validates payment (called by admin canister)
    public shared(msg) func validatePaymentByAdmin(
        orderId: Text,
        approved: Bool,
        _reason: ?Text,
        adminId: Principal
    ) : async Result<Text> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        // Check if call is from admin canister
        switch (adminCanisterId) {
            case (?adminCanister) {
                if (caller != adminCanister) {
                    return #err("Only admin canister can validate payments");
                };
            };
            case null {
                return #err("Admin canister not configured");
            };
        };

        switch (orders.get(orderId)) {
            case (?order) {
                if (order.status != #PaymentSubmitted) {
                    return #err("Order is not in PaymentSubmitted status");
                };

                let newStatus = if (approved) { #PaymentValidated } else { #Cancelled };
                
                let updatedOrder : RemittanceOrder = {
                    order with
                    status = newStatus;
                    validated_by = ?adminId;
                    validated_at = ?Time.now();
                    updated_at = Time.now();
                };

                orders.put(orderId, updatedOrder);

                // If approved, auto-settle
                if (approved) {
                    let settledOrder : RemittanceOrder = {
                        updatedOrder with
                        status = #Settled;
                        settled_at = ?Time.now();
                        updated_at = Time.now();
                    };
                    orders.put(orderId, settledOrder);
                };

                if (approved) {
                    #ok("Payment validated and order settled")
                } else {
                    #ok("Payment rejected and order cancelled")
                }
            };
            case null {
                #err("Order not found: " # orderId)
            };
        }
    };

    // Get order by ID
    public query func getOrder(orderId: Text) : async ?RemittanceOrder {
        orders.get(orderId)
    };

    // Query orders with filtering and pagination
    public query func queryOrders(
        filter: RemittanceOrderFilter,
        page: PageRequest
    ) : async RemittanceOrderPage {
        let allOrders = Iter.toArray(orders.vals());
        
        // Apply filters
        var filteredOrders = allOrders;
        
        // Filter by status
        switch (filter.status) {
            case (?statuses) {
                filteredOrders := Array.filter<RemittanceOrder>(filteredOrders, func(order: RemittanceOrder) : Bool {
                    Array.find<RemittanceOrderStatus>(statuses, func(status: RemittanceOrderStatus) : Bool {
                        switch (status, order.status) {
                            case (#AwaitingPayment, #AwaitingPayment) true;
                            case (#PaymentSubmitted, #PaymentSubmitted) true;
                            case (#PaymentValidated, #PaymentValidated) true;
                            case (#Settled, #Settled) true;
                            case (#Cancelled, #Cancelled) true;
                            case (_, _) false;
                        }
                    }) != null
                });
            };
            case null {};
        };
        
        // Filter by service provider
        switch (filter.service_provider_id) {
            case (?providerId) {
                filteredOrders := Array.filter<RemittanceOrder>(filteredOrders, func(order: RemittanceOrder) : Bool {
                    order.service_provider_id == providerId
                });
            };
            case null {};
        };

        // Filter by date range
        switch (filter.from_date) {
            case (?fromDate) {
                filteredOrders := Array.filter<RemittanceOrder>(filteredOrders, func(order: RemittanceOrder) : Bool {
                    order.created_at >= fromDate
                });
            };
            case null {};
        };
        
        switch (filter.to_date) {
            case (?toDate) {
                filteredOrders := Array.filter<RemittanceOrder>(filteredOrders, func(order: RemittanceOrder) : Bool {
                    order.created_at <= toDate
                });
            };
            case null {};
        };

        // Sort by created_at descending (newest first)
        let sortedOrders = Array.sort<RemittanceOrder>(filteredOrders, func(a: RemittanceOrder, b: RemittanceOrder) : {#less; #equal; #greater} {
            if (a.created_at > b.created_at) #less
            else if (a.created_at < b.created_at) #greater
            else #equal
        });

        // Apply pagination
        let startIndex = switch (page.cursor) {
            case (?cursor) {
                // Find index of cursor order ID
                switch (Array.indexOf<RemittanceOrder>(
                    { id = cursor; service_provider_id = Principal.fromText("2vxsx-fae"); amount_php_centavos = 0; service_type = ""; service_id = null; booking_id = null; payment_method = #CashOnHand; status = #AwaitingPayment; commission_rule_id = ""; commission_version = 1; commission_amount = 0; payment_proof_media_ids = []; validated_by = null; validated_at = null; created_at = 0; payment_submitted_at = null; settled_at = null; updated_at = 0 }, 
                    sortedOrders, 
                    func(a: RemittanceOrder, b: RemittanceOrder) : Bool { a.id == b.id }
                )) {
                    case (?index) index + 1;
                    case null 0;
                }
            };
            case null 0;
        };

        let pageSize = Nat32.toNat(page.size);
        let endIndex = Nat.min(startIndex + pageSize, sortedOrders.size());
        
        let pageItems = if (startIndex < sortedOrders.size()) {
            Array.tabulate<RemittanceOrder>(endIndex - startIndex, func(i: Nat) : RemittanceOrder {
                sortedOrders[startIndex + i]
            })
        } else {
            []
        };

        let nextCursor = if (endIndex < sortedOrders.size()) {
            ?sortedOrders[endIndex - 1].id
        } else {
            null
        };

        {
            items = pageItems;
            next_cursor = nextCursor;
            total_count = ?sortedOrders.size();
        }
    };

    // Get orders by service provider
    public query func getProviderOrders(providerId: Principal) : async [RemittanceOrder] {
        let allOrders = Iter.toArray(orders.vals());
        Array.filter<RemittanceOrder>(allOrders, func(order: RemittanceOrder) : Bool {
            order.service_provider_id == providerId
        })
    };

    // Get provider dashboard with balance and deadline info
    public query func getProviderDashboard(providerId: Principal) : async {
        outstanding_balance: Nat;
        pending_orders: Nat;
        overdue_orders: Nat;
        next_deadline: ?Time.Time;
        orders_awaiting_payment: [RemittanceOrder];
        orders_pending_validation: [RemittanceOrder];
        total_commission_paid: Nat;
        total_orders_completed: Nat;
    } {
        let providerOrders = Array.filter<RemittanceOrder>(Iter.toArray(orders.vals()), func(order: RemittanceOrder) : Bool {
            order.service_provider_id == providerId
        });

        let awaitingPaymentOrders = Array.filter<RemittanceOrder>(providerOrders, func(order: RemittanceOrder) : Bool {
            order.status == #AwaitingPayment
        });

        let pendingValidationOrders = Array.filter<RemittanceOrder>(providerOrders, func(order: RemittanceOrder) : Bool {
            order.status == #PaymentSubmitted
        });

        let settledOrders = Array.filter<RemittanceOrder>(providerOrders, func(order: RemittanceOrder) : Bool {
            order.status == #Settled
        });

        // Calculate outstanding balance (sum of commission amounts for orders awaiting payment)
        let outstandingBalance = Array.foldLeft<RemittanceOrder, Nat>(awaitingPaymentOrders, 0, func(acc: Nat, order: RemittanceOrder) : Nat {
            acc + order.commission_amount
        });

        // Calculate total commission paid
        let totalCommissionPaid = Array.foldLeft<RemittanceOrder, Nat>(settledOrders, 0, func(acc: Nat, order: RemittanceOrder) : Nat {
            acc + order.commission_amount
        });

        // Find overdue orders (created more than settlementDeadlineHours ago)
        let currentTime = Time.now();
        let deadlineNanos = Int.abs(Nat32.toNat(settlementDeadlineHours)) * 3600_000_000_000;
        
        let overdueOrders = Array.filter<RemittanceOrder>(awaitingPaymentOrders, func(order: RemittanceOrder) : Bool {
            (currentTime - order.created_at) > deadlineNanos
        });

        // Find next deadline (earliest order creation time + deadline hours)
        var nextDeadline : ?Time.Time = null;
        for (order in awaitingPaymentOrders.vals()) {
            let orderDeadline = order.created_at + deadlineNanos;
            switch (nextDeadline) {
                case (null) {
                    if (orderDeadline > currentTime) { // Only future deadlines
                        nextDeadline := ?orderDeadline;
                    };
                };
                case (?existing) {
                    if (orderDeadline > currentTime and orderDeadline < existing) {
                        nextDeadline := ?orderDeadline;
                    };
                };
            };
        };

        {
            outstanding_balance = outstandingBalance;
            pending_orders = awaitingPaymentOrders.size() + pendingValidationOrders.size();
            overdue_orders = overdueOrders.size();
            next_deadline = nextDeadline;
            orders_awaiting_payment = awaitingPaymentOrders;
            orders_pending_validation = pendingValidationOrders;
            total_commission_paid = totalCommissionPaid;
            total_orders_completed = settledOrders.size();
        }
    };

    // Get orders by status
    public query func getOrdersByStatus(status: RemittanceOrderStatus) : async [RemittanceOrder] {
        let allOrders = Iter.toArray(orders.vals());
        Array.filter<RemittanceOrder>(allOrders, func(order: RemittanceOrder) : Bool {
            switch (status, order.status) {
                case (#AwaitingPayment, #AwaitingPayment) true;
                case (#PaymentSubmitted, #PaymentSubmitted) true;
                case (#PaymentValidated, #PaymentValidated) true;
                case (#Settled, #Settled) true;
                case (#Cancelled, #Cancelled) true;
                case (_, _) false;
            }
        })
    };

    // Cancel an order (admin or service provider only)
    public shared(msg) func cancelOrder(orderId: Text) : async Result<RemittanceOrder> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        switch (orders.get(orderId)) {
            case (?order) {
                // Check if caller has permission (service provider or admin through admin canister)
                let isAdmin = switch (adminCanisterId) { 
                    case (?admin) caller == admin; 
                    case null false; 
                };
                
                if (order.service_provider_id != caller and not isAdmin) {
                    return #err("Only the service provider or admin can cancel orders");
                };

                // Check if order can be cancelled
                if (order.status == #Settled) {
                    return #err("Cannot cancel settled orders");
                };

                if (not isValidStatusTransition(order.status, #Cancelled)) {
                    return #err("Invalid status transition to Cancelled");
                };

                let updatedOrder : RemittanceOrder = {
                    order with
                    status = #Cancelled;
                    updated_at = Time.now();
                };

                orders.put(orderId, updatedOrder);
                #ok(updatedOrder)
            };
            case null {
                #err("Order not found: " # orderId)
            };
        }
    };

    // Get all commission rules (for admin interface)
    public query func getAllCommissionRules() : async [CommissionRule] {
        Iter.toArray(commissionRules.vals())
    };

    // Add commission rule (called by admin canister)
    public shared(msg) func addCommissionRule(rule: CommissionRule) : async Result<CommissionRule> {
        let caller = msg.caller;
        
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        // Check if call is from admin canister
        switch (adminCanisterId) {
            case (?adminCanister) {
                if (caller != adminCanister) {
                    return #err("Only admin canister can add commission rules");
                };
            };
            case null {
                return #err("Admin canister not configured");
            };
        };
        
        commissionRules.put(rule.id, rule);
        #ok(rule)
    };

    // Get analytics for service provider
    public query func getProviderAnalytics(
        providerId: Principal,
        fromDate: ?Time.Time,
        toDate: ?Time.Time
    ) : async {
        total_orders: Nat;
        settled_orders: Nat;
        pending_orders: Nat;
        total_commission_paid: Nat;
        total_service_amount: Nat;
        average_order_value: Nat;
    } {
        let providerOrders = Array.filter<RemittanceOrder>(Iter.toArray(orders.vals()), func(order: RemittanceOrder) : Bool {
            var inDateRange = true;
            
            switch (fromDate) {
                case (?from) inDateRange := inDateRange and order.created_at >= from;
                case null {};
            };
            
            switch (toDate) {
                case (?to) inDateRange := inDateRange and order.created_at <= to;
                case null {};
            };
            
            order.service_provider_id == providerId and inDateRange
        });

        let totalOrders = providerOrders.size();
        let settledOrders = Array.filter<RemittanceOrder>(providerOrders, func(order: RemittanceOrder) : Bool {
            order.status == #Settled
        }).size();
        
        let pendingOrders = Array.filter<RemittanceOrder>(providerOrders, func(order: RemittanceOrder) : Bool {
            order.status == #AwaitingPayment or order.status == #PaymentSubmitted or order.status == #PaymentValidated
        }).size();

        let totalCommissionPaid = Array.foldLeft<RemittanceOrder, Nat>(providerOrders, 0, func(acc: Nat, order: RemittanceOrder) : Nat {
            if (order.status == #Settled) {
                acc + order.commission_amount
            } else {
                acc
            }
        });

        let totalServiceAmount = Array.foldLeft<RemittanceOrder, Nat>(providerOrders, 0, func(acc: Nat, order: RemittanceOrder) : Nat {
            if (order.status == #Settled) {
                acc + order.amount_php_centavos
            } else {
                acc
            }
        });

        let averageOrderValue = if (settledOrders > 0) {
            totalServiceAmount / settledOrders
        } else {
            0
        };

        {
            total_orders = totalOrders;
            settled_orders = settledOrders;
            pending_orders = pendingOrders;
            total_commission_paid = totalCommissionPaid;
            total_service_amount = totalServiceAmount;
            average_order_value = averageOrderValue;
        }
    };

    // Initialize static commission rules
    initializeStaticCommissionRules();
}
