import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Result "mo:base/Result";

import Types "../types/shared";

persistent actor AdminCanister {
    // Type definitions
    type CommissionRule = Types.CommissionRule;
    type CommissionFormula = Types.CommissionFormula;
    type PaymentMethod = Types.PaymentMethod;
    type Result<T> = Types.Result<T>;

    // Role types - Simplified to only ADMIN
    public type UserRole = {
        #ADMIN;
    };

    public type UserRoleAssignment = {
        user_id: Principal;
        role: UserRole;
        scope: ?Text; // Optional scope (e.g., branch_id)
        assigned_by: Principal;
        assigned_at: Time.Time;
    };

    public type SystemSettings = {
        corporate_gcash_account: Text;
        settlement_deadline_hours: Nat32;
        max_commission_rate_bps: Nat; // Maximum allowed commission rate in basis points
        min_order_amount: Nat; // Minimum order amount in centavos
        max_order_amount: Nat; // Maximum order amount in centavos
        updated_by: Principal;
        updated_at: Time.Time;
    };

    public type CommissionRuleDraft = {
        id: ?Text; // null for new rules, provided for updates
        service_types: [Text];
        payment_methods: [PaymentMethod];
        formula: CommissionFormula;
        min_commission: ?Nat;
        max_commission: ?Nat;
        priority: Nat;
        effective_from: Time.Time;
        effective_to: ?Time.Time;
    };

    public type CommissionRuleFilter = {
        service_type: ?Text;
        active_only: ?Bool;
        payment_method: ?PaymentMethod;
    };

    // State variables
    private var ruleEntries : [(Text, CommissionRule)] = [];
    private transient var commissionRules = HashMap.HashMap<Text, CommissionRule>(10, Text.equal, Text.hash);

    private var roleEntries : [(Principal, UserRoleAssignment)] = [];
    private transient var userRoles = HashMap.HashMap<Principal, UserRoleAssignment>(10, Principal.equal, Principal.hash);

    private var settingsEntries : [(Text, SystemSettings)] = [];
    private transient var systemSettings = HashMap.HashMap<Text, SystemSettings>(1, Text.equal, Text.hash);

    // Counter for rule IDs
    private var ruleIdCounter : Nat = 0;

    // Canister references for intercanister calls
    private var remittanceCanisterId : ?Principal = null;
    private var mediaCanisterId : ?Principal = null;

    // Constants
    private transient let SETTINGS_KEY : Text = "system_settings";
    private transient let DEFAULT_SETTLEMENT_HOURS : Nat32 = 24;
    private transient let DEFAULT_GCASH_ACCOUNT : Text = "09123456789";
    private transient let MAX_COMMISSION_BPS : Nat = 1500; // 15% max
    private transient let MIN_ORDER_CENTAVOS : Nat = 100; // 1 PHP
    private transient let MAX_ORDER_CENTAVOS : Nat = 1_000_000_00; // 1M PHP

    // Helper functions
    private func generateRuleId() : Text {
        let now = Int.abs(Time.now());
        ruleIdCounter += 1;
        return "rule-" # Int.toText(now) # "-" # Nat.toText(ruleIdCounter);
    };

    private func isAuthorized(caller: Principal, requiredRole: UserRole) : Bool {
        switch (userRoles.get(caller)) {
            case (?assignment) {
                switch (assignment.role, requiredRole) {
                    case (#ADMIN, #ADMIN) true;
                }
            };
            case null false;
        }
    };

    private func validateCommissionRule(draft: CommissionRuleDraft) : Result<Text> {
        // Validate service types
        if (draft.service_types.size() == 0) {
            return #err("At least one service type is required");
        };

        // Validate payment methods
        if (draft.payment_methods.size() == 0) {
            return #err("At least one payment method is required");
        };

        // Validate formula based on type
        switch (draft.formula) {
            case (#Flat(amount)) {
                if (amount == 0 or amount > MAX_COMMISSION_BPS * MAX_ORDER_CENTAVOS / 10000) {
                    return #err("Invalid flat commission amount");
                };
            };
            case (#Percentage(rateBps)) {
                if (rateBps == 0 or rateBps > MAX_COMMISSION_BPS) {
                    return #err("Commission rate must be between 1 and " # Nat.toText(MAX_COMMISSION_BPS) # " basis points");
                };
            };
            case (#Tiered(tiers)) {
                if (tiers.size() == 0) {
                    return #err("Tiered commission requires at least one tier");
                };
                // Validate each tier
                for ((upTo, rateBps) in tiers.vals()) {
                    if (rateBps > MAX_COMMISSION_BPS) {
                        return #err("Tier commission rate exceeds maximum allowed");
                    };
                };
            };
            case (#Hybrid({base = _; rate_bps})) {
                if (rate_bps > MAX_COMMISSION_BPS) {
                    return #err("Hybrid commission rate exceeds maximum allowed");
                };
            };
        };

        // Validate commission caps
        switch (draft.min_commission, draft.max_commission) {
            case (?minCom, ?maxCom) {
                if (minCom >= maxCom) {
                    return #err("Minimum commission must be less than maximum commission");
                };
            };
            case (_, _) {}; // Other combinations are valid
        };

        // Validate effective dates
        if (draft.effective_from > Time.now() + (365 * 24 * 3600_000_000_000)) {
            return #err("Effective from date cannot be more than 1 year in the future");
        };

        switch (draft.effective_to) {
            case (?endTime) {
                if (endTime <= draft.effective_from) {
                    return #err("Effective to date must be after effective from date");
                };
            };
            case null {};
        };

        #ok("Validation passed")
    };

    // Initialize default settings and admin user
    private func initializeDefaults() {
        // Initialize default settings if not exists
        if (systemSettings.size() == 0) {
            let defaultSettings : SystemSettings = {
                corporate_gcash_account = DEFAULT_GCASH_ACCOUNT;
                settlement_deadline_hours = DEFAULT_SETTLEMENT_HOURS;
                max_commission_rate_bps = MAX_COMMISSION_BPS;
                min_order_amount = MIN_ORDER_CENTAVOS;
                max_order_amount = MAX_ORDER_CENTAVOS;
                updated_by = Principal.fromText("2vxsx-fae"); // Default admin
                updated_at = Time.now();
            };
            systemSettings.put(SETTINGS_KEY, defaultSettings);
        };

        // Initialize default admin role if no roles exist
        if (userRoles.size() == 0) {
            let defaultAdmin : UserRoleAssignment = {
                user_id = Principal.fromText("2vxsx-fae"); // Default admin user
                role = #ADMIN;
                scope = null;
                assigned_by = Principal.fromText("2vxsx-fae");
                assigned_at = Time.now();
            };
            userRoles.put(Principal.fromText("2vxsx-fae"), defaultAdmin);
        };
    };

    // Initialization
    system func preupgrade() {
        ruleEntries := Iter.toArray(commissionRules.entries());
        roleEntries := Iter.toArray(userRoles.entries());
        settingsEntries := Iter.toArray(systemSettings.entries());
    };

    system func postupgrade() {
        commissionRules := HashMap.fromIter<Text, CommissionRule>(ruleEntries.vals(), 10, Text.equal, Text.hash);
        ruleEntries := [];

        userRoles := HashMap.fromIter<Principal, UserRoleAssignment>(roleEntries.vals(), 10, Principal.equal, Principal.hash);
        roleEntries := [];

        systemSettings := HashMap.fromIter<Text, SystemSettings>(settingsEntries.vals(), 1, Text.equal, Text.hash);
        settingsEntries := [];
        settingsEntries := [];
        settingsEntries := [];

        // Initialize defaults
        initializeDefaults();
    };

    // Commission Rules Management

    // Create or update commission rules
    public shared(msg) func upsertCommissionRules(rules: [CommissionRuleDraft]) : async Result<[CommissionRule]> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can manage commission rules");
        };

        if (rules.size() == 0) {
            return #err("At least one rule is required");
        };

        var resultRules : [CommissionRule] = [];
        
        for (draft in rules.vals()) {
            // Validate the rule
            switch (validateCommissionRule(draft)) {
                case (#err(msg)) {
                    return #err("Rule validation failed: " # msg);
                };
                case (#ok(_)) {};
            };

            let ruleId = switch (draft.id) {
                case (?id) id; // Update existing rule
                case null generateRuleId(); // Create new rule
            };

            let version : Nat32 = switch (commissionRules.get(ruleId)) {
                case (?existingRule) existingRule.version + 1;
                case null 1;
            };

            let newRule : CommissionRule = {
                id = ruleId;
                version = version;
                service_types = draft.service_types;
                payment_methods = draft.payment_methods;
                formula = draft.formula;
                min_commission = draft.min_commission;
                max_commission = draft.max_commission;
                priority = draft.priority;
                effective_from = draft.effective_from;
                effective_to = draft.effective_to;
                is_active = false; // New rules are inactive by default
                created_at = Time.now();
                updated_at = Time.now();
            };

            commissionRules.put(ruleId, newRule);
            resultRules := Array.append<CommissionRule>(resultRules, [newRule]);
        };

        #ok(resultRules)
    };

    // Activate a specific commission rule version
    public shared(msg) func activateRule(ruleId: Text, version: Nat32) : async Result<Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can activate commission rules");
        };

        switch (commissionRules.get(ruleId)) {
            case (?rule) {
                if (rule.version == version) {
                    let updatedRule : CommissionRule = {
                        rule with
                        is_active = true;
                        updated_at = Time.now();
                    };
                    commissionRules.put(ruleId, updatedRule);
                    #ok("Rule " # ruleId # " v" # Nat32.toText(version) # " activated successfully")
                } else {
                    #err("Rule version mismatch. Found v" # Nat32.toText(rule.version) # " but requested v" # Nat32.toText(version))
                }
            };
            case null {
                #err("Commission rule not found: " # ruleId)
            };
        }
    };

    // Deactivate a commission rule
    public shared(msg) func deactivateRule(ruleId: Text) : async Result<Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can deactivate commission rules");
        };

        switch (commissionRules.get(ruleId)) {
            case (?rule) {
                let updatedRule : CommissionRule = {
                    rule with
                    is_active = false;
                    updated_at = Time.now();
                };
                commissionRules.put(ruleId, updatedRule);
                #ok("Rule " # ruleId # " deactivated successfully")
            };
            case null {
                #err("Commission rule not found: " # ruleId)
            };
        }
    };

    // List commission rules with filtering
    public query func listRules(filter: CommissionRuleFilter) : async [CommissionRule] {
        let allRules = Iter.toArray(commissionRules.vals());
        
        let filteredRules = Array.filter<CommissionRule>(allRules, func(rule: CommissionRule) : Bool {
            var matches = true;

            // Filter by active status
            switch (filter.active_only) {
                case (?activeOnly) {
                    if (activeOnly and not rule.is_active) {
                        matches := false;
                    };
                    if (not activeOnly and rule.is_active) {
                        matches := false;
                    };
                };
                case null {};
            };

            // Filter by service type
            switch (filter.service_type) {
                case (?serviceType) {
                    let serviceTypeExists = Array.find<Text>(rule.service_types, func(st: Text) : Bool {
                        st == serviceType
                    }) != null;
                    if (not serviceTypeExists) {
                        matches := false;
                    };
                };
                case null {};
            };

            // Filter by payment method
            switch (filter.payment_method) {
                case (?paymentMethod) {
                    let paymentMethodExists = Array.find<PaymentMethod>(rule.payment_methods, func(pm: PaymentMethod) : Bool {
                        switch (pm, paymentMethod) {
                            case (#CashOnHand, #CashOnHand) true;
                        }
                    }) != null;
                    if (not paymentMethodExists) {
                        matches := false;
                    };
                };
                case null {};
            };

            matches
        });

        // Sort by priority (ascending) and then by created date (descending)
        Array.sort<CommissionRule>(filteredRules, func(a: CommissionRule, b: CommissionRule) : {#less; #equal; #greater} {
            if (a.priority < b.priority) {
                #less
            } else if (a.priority > b.priority) {
                #greater
            } else {
                // Same priority, sort by created date descending
                if (a.created_at > b.created_at) #less
                else if (a.created_at < b.created_at) #greater
                else #equal
            }
        })
    };

    // Get specific commission rule
    public query func getRule(ruleId: Text) : async ?CommissionRule {
        commissionRules.get(ruleId)
    };

    // Role Management

    // Assign role to user
    public shared(msg) func assignRole(userId: Principal, role: UserRole, scope: ?Text) : async Result<Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can assign roles");
        };

        if (Principal.isAnonymous(userId)) {
            return #err("Cannot assign role to anonymous principal");
        };

        let assignment : UserRoleAssignment = {
            user_id = userId;
            role = role;
            scope = scope;
            assigned_by = caller;
            assigned_at = Time.now();
        };

        userRoles.put(userId, assignment);
        
        let roleText = switch (role) {
            case (#ADMIN) "ADMIN";
        };

        #ok("Role " # roleText # " assigned to user " # Principal.toText(userId))
    };

    // Remove user role
    public shared(msg) func removeRole(userId: Principal) : async Result<Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can remove roles");
        };

        switch (userRoles.remove(userId)) {
            case (?_) {
                #ok("Role removed from user " # Principal.toText(userId))
            };
            case null {
                #err("User has no assigned role: " # Principal.toText(userId))
            };
        }
    };

    // Get user role
    public query func getUserRole(userId: Principal) : async ?UserRoleAssignment {
        userRoles.get(userId)
    };

    // List all user roles (admin only)
    public shared(msg) func listUserRoles() : async Result<[UserRoleAssignment]> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can list all user roles");
        };

        let assignments = Iter.toArray(userRoles.vals());
        #ok(assignments)
    };

    // Check if user has specific role (used by other canisters)
    public query func hasRole(userId: Principal, role: UserRole) : async Bool {
        isAuthorized(userId, role)
    };

    // Settings Management

    // Update system settings
    public shared(msg) func setSettings(settings: {
        corporate_gcash_account: ?Text;
        settlement_deadline_hours: ?Nat32;
        max_commission_rate_bps: ?Nat;
        min_order_amount: ?Nat;
        max_order_amount: ?Nat;
    }) : async Result<Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can update system settings");
        };

        let currentSettings = switch (systemSettings.get(SETTINGS_KEY)) {
            case (?existing) existing;
            case null {
                // Create default settings if none exist
                {
                    corporate_gcash_account = DEFAULT_GCASH_ACCOUNT;
                    settlement_deadline_hours = DEFAULT_SETTLEMENT_HOURS;
                    max_commission_rate_bps = MAX_COMMISSION_BPS;
                    min_order_amount = MIN_ORDER_CENTAVOS;
                    max_order_amount = MAX_ORDER_CENTAVOS;
                    updated_by = caller;
                    updated_at = Time.now();
                }
            };
        };

        // Validate and update settings
        let updatedSettings : SystemSettings = {
            corporate_gcash_account = switch (settings.corporate_gcash_account) {
                case (?account) {
                    if (Text.size(account) < 11 or Text.size(account) > 13) {
                        return #err("GCash account must be 11-13 characters long");
                    };
                    account
                };
                case null currentSettings.corporate_gcash_account;
            };
            settlement_deadline_hours = switch (settings.settlement_deadline_hours) {
                case (?hours) {
                    if (hours < 1 or hours > 168) { // Max 7 days
                        return #err("Settlement deadline must be between 1 and 168 hours");
                    };
                    hours
                };
                case null currentSettings.settlement_deadline_hours;
            };
            max_commission_rate_bps = switch (settings.max_commission_rate_bps) {
                case (?rateBps) {
                    if (rateBps < 1 or rateBps > 2000) { // Max 20%
                        return #err("Maximum commission rate must be between 1 and 2000 basis points");
                    };
                    rateBps
                };
                case null currentSettings.max_commission_rate_bps;
            };
            min_order_amount = switch (settings.min_order_amount) {
                case (?amount) {
                    if (amount < 100) { // Min 1 PHP
                        return #err("Minimum order amount must be at least 100 centavos (1 PHP)");
                    };
                    amount
                };
                case null currentSettings.min_order_amount;
            };
            max_order_amount = switch (settings.max_order_amount) {
                case (?amount) {
                    if (amount > 1_000_000_00) { // Max 1M PHP
                        return #err("Maximum order amount cannot exceed 100,000,000 centavos (1M PHP)");
                    };
                    if (amount <= currentSettings.min_order_amount) {
                        return #err("Maximum order amount must be greater than minimum order amount");
                    };
                    amount
                };
                case null currentSettings.max_order_amount;
            };
            updated_by = caller;
            updated_at = Time.now();
        };

        systemSettings.put(SETTINGS_KEY, updatedSettings);
        #ok("System settings updated successfully")
    };

    // Get current system settings
    public query func getSettings() : async SystemSettings {
        switch (systemSettings.get(SETTINGS_KEY)) {
            case (?settings) settings;
            case null {
                // Return defaults if no settings exist
                {
                    corporate_gcash_account = DEFAULT_GCASH_ACCOUNT;
                    settlement_deadline_hours = DEFAULT_SETTLEMENT_HOURS;
                    max_commission_rate_bps = MAX_COMMISSION_BPS;
                    min_order_amount = MIN_ORDER_CENTAVOS;
                    max_order_amount = MAX_ORDER_CENTAVOS;
                    updated_by = Principal.fromText("2vxsx-fae");
                    updated_at = Time.now();
                }
            };
        }
    };

    // Analytics and Reporting

    // Get system statistics (admin only)
    public shared(msg) func getSystemStats() : async Result<{
        total_commission_rules: Nat;
        active_commission_rules: Nat;
        total_users_with_roles: Nat;
        admin_users: Nat;
    }> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can view system statistics");
        };

        let allRules = Iter.toArray(commissionRules.vals());
        let activeRules = Array.filter<CommissionRule>(allRules, func(rule: CommissionRule) : Bool {
            rule.is_active
        });

        let allAssignments = Iter.toArray(userRoles.vals());
        var adminCount = 0;

        for (assignment in allAssignments.vals()) {
            switch (assignment.role) {
                case (#ADMIN) adminCount += 1;
            };
        };

        #ok({
            total_commission_rules = allRules.size();
            active_commission_rules = activeRules.size();
            total_users_with_roles = allAssignments.size();
            admin_users = adminCount;
        })
    };

    // Canister Management

    // Set canister references for intercanister calls
    public shared(msg) func setCanisterReferences(remittance: ?Principal, media: ?Principal) : async Result<Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can set canister references");
        };

        remittanceCanisterId := remittance;
        mediaCanisterId := media;
        #ok("Canister references updated successfully")
    };

    // Payment Validation Functions

    // Validate remittance payment (called by admins)
    public shared(msg) func validatePayment(orderId: Text, approved: Bool, reason: ?Text) : async Result<Text> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can validate payments");
        };

        switch (remittanceCanisterId) {
            case (?canisterId) {
                let remittanceActor = actor(Principal.toText(canisterId)) : actor {
                    validatePaymentByAdmin: (Text, Bool, ?Text, Principal) -> async Result<Text>;
                };
                
                try {
                    await remittanceActor.validatePaymentByAdmin(orderId, approved, reason, caller)
                } catch (_) {
                    #err("Failed to communicate with remittance canister")
                }
            };
            case null {
                #err("Remittance canister not configured")
            };
        }
    };

    // Get pending payment validations
    public shared(msg) func getPendingValidations() : async Result<[Types.RemittanceOrder]> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can view pending validations");
        };

        switch (remittanceCanisterId) {
            case (?canisterId) {
                let remittanceActor = actor(Principal.toText(canisterId)) : actor {
                    getOrdersByStatus: (Types.RemittanceOrderStatus) -> async [Types.RemittanceOrder];
                };
                
                try {
                    let pendingOrders = await remittanceActor.getOrdersByStatus(#PaymentSubmitted);
                    #ok(pendingOrders)
                } catch (_) {
                    #err("Failed to communicate with remittance canister")
                }
            };
            case null {
                #err("Remittance canister not configured")
            };
        }
    };

    // Get remittance media items for validation
    public shared(msg) func getRemittanceMediaItems(mediaIds: [Text]) : async Result<[Types.MediaItem]> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can access remittance media items");
        };

        switch (mediaCanisterId) {
            case (?canisterId) {
                let mediaActor = actor(Principal.toText(canisterId)) : actor {
                    getRemittanceMediaItems: ([Text]) -> async Types.Result<[Types.MediaItem]>;
                };
                
                try {
                    await mediaActor.getRemittanceMediaItems(mediaIds)
                } catch (_) {
                    #err("Failed to communicate with media canister")
                }
            };
            case null {
                #err("Media canister not configured")
            };
        }
    };

    // Get remittance order with media items for admin validation
    public shared(msg) func getRemittanceOrderWithMedia(orderId: Text) : async Result<{
        order: Types.RemittanceOrder;
        mediaItems: [Types.MediaItem];
    }> {
        let caller = msg.caller;

        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        if (not isAuthorized(caller, #ADMIN)) {
            return #err("Only ADMIN users can access remittance order details");
        };

        switch (remittanceCanisterId, mediaCanisterId) {
            case (?remittanceId, ?mediaId) {
                let remittanceActor = actor(Principal.toText(remittanceId)) : actor {
                    getOrder: (Text) -> async ?Types.RemittanceOrder;
                };
                
                let mediaActor = actor(Principal.toText(mediaId)) : actor {
                    getRemittanceMediaItems: ([Text]) -> async Types.Result<[Types.MediaItem]>;
                };
                
                try {
                    // Get the remittance order
                    let orderOpt = await remittanceActor.getOrder(orderId);
                    
                    switch (orderOpt) {
                        case (?order) {
                            // Get the media items for the payment proofs
                            let mediaResult = await mediaActor.getRemittanceMediaItems(order.payment_proof_media_ids);
                            
                            switch (mediaResult) {
                                case (#ok(mediaItems)) {
                                    #ok({
                                        order = order;
                                        mediaItems = mediaItems;
                                    })
                                };
                                case (#err(msg)) {
                                    #err("Failed to get media items: " # msg)
                                };
                            };
                        };
                        case null {
                            #err("Remittance order not found: " # orderId)
                        };
                    };
                } catch (_) {
                    #err("Failed to communicate with remittance or media canister")
                }
            };
            case (null, _) {
                #err("Remittance canister not configured")
            };
            case (_, null) {
                #err("Media canister not configured")
            };
        }
    };

    // Initialize on first deployment
    initializeDefaults();
}
