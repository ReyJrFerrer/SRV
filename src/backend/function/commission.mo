import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Int "mo:base/Int";

import Types "../types/shared";

persistent actor Commission {
    // Type definitions
    type Result<T> = Types.Result<T>;
    
    // Commission tier definitions
    public type CommissionTier = {
        #TierA; // Premium services - Gadget Technicians, Automobile Repairs, Photographer
        #TierB; // Standard services - Home Repairs, Tutoring, Beauty Services, Massage Services
        #TierC; // Basic services - Cleaning Services, Delivery and Errands
    };

    // Fee structure configuration for each tier
    public type FeeStructure = {
        baseFee: Nat;           // Minimum commission fee
        breakpoints: [Nat];     // Value breakpoints
        rates: [Float];         // Commission rates for each bracket
    };

    // Dynamic fee structures for each tier
    private let tierAStructure : FeeStructure = {
        baseFee = 50;           // ₱50 minimum commission
        breakpoints = [500, 2000, 8000, 20000]; // ₱500, ₱2K, ₱8K, ₱20K
        rates = [0.10, 0.08, 0.07, 0.06, 0.05]; // 10%, 8%, 7%, 6%, 5%
    };

    private let tierBStructure : FeeStructure = {
        baseFee = 35;           // ₱35 minimum commission
        breakpoints = [300, 1500, 6000, 15000]; // ₱300, ₱1.5K, ₱6K, ₱15K
        rates = [0.08, 0.06, 0.05, 0.04, 0.03]; // 8%, 6%, 5%, 4%, 3%
    };

    private let tierCStructure : FeeStructure = {
        baseFee = 25;           // ₱25 minimum commission
        breakpoints = [200, 1000, 4000, 12000]; // ₱200, ₱1K, ₱4K, ₱12K
        rates = [0.06, 0.04, 0.035, 0.025, 0.02]; // 6%, 4%, 3.5%, 2.5%, 2%
    };

    // Category to tier mapping
    private func getCategoryTier(category: Text) : CommissionTier {
        switch (category) {
            case ("Gadget Technicians" or "Automobile Repairs" or "Photographer") { #TierA };
            case ("Home Repairs" or "Tutoring" or "Beauty Services" or "Massage Services") { #TierB };
            case ("Cleaning Services" or "Delivery and Errands") { #TierC };
            case (_) { #TierB }; // Default to Tier B for unknown categories
        }
    };

    // Get fee structure for a given tier
    private func getFeeStructure(tier: CommissionTier) : FeeStructure {
        switch (tier) {
            case (#TierA) { tierAStructure };
            case (#TierB) { tierBStructure };
            case (#TierC) { tierCStructure };
        }
    };

    // Dynamic commission calculation based on fee structure
    private func calculateDynamicCommission(bookingValue: Nat, structure: FeeStructure) : Nat {
        let value = Float.fromInt(bookingValue);
        var totalCommission : Float = 0;
        var remainingValue = value;
        
        // Apply rates for each bracket
        let breakpoints = structure.breakpoints;
        let rates = structure.rates;
        
        var i = 0;
        var previousBreakpoint : Float = 0;
        
        // Calculate commission for each bracket
        while (i < breakpoints.size() and remainingValue > 0) {
            let currentBreakpoint = Float.fromInt(breakpoints[i]);
            let bracketSize = Float.min(remainingValue, currentBreakpoint - previousBreakpoint);
            
            if (bracketSize > 0) {
                totalCommission += bracketSize * rates[i];
                remainingValue -= bracketSize;
                previousBreakpoint := currentBreakpoint;
            };
            
            i += 1;
        };
        
        // Apply final rate for remaining value above highest breakpoint
        if (remainingValue > 0 and rates.size() > breakpoints.size()) {
            totalCommission += remainingValue * rates[rates.size() - 1];
        };
        
        // Ensure minimum base fee
        let calculatedFee = Int.abs(Float.toInt(Float.nearest(totalCommission)));
        if (calculatedFee < structure.baseFee) {
            structure.baseFee
        } else {
            calculatedFee
        };
    };

    // Main public function to calculate commission
    public func calculate_commission(category: Text, booking_value: Nat) : async Nat {
        // Validate input
        if (booking_value == 0) {
            return 0;
        };
        
        let tier = getCategoryTier(category);
        let structure = getFeeStructure(tier);
        
        calculateDynamicCommission(booking_value, structure);
    };

    // Helper function to get tier information for debugging/testing
    public query func get_category_tier(category: Text) : async CommissionTier {
        getCategoryTier(category);
    };

    // Helper function to get commission breakdown for transparency
    public query func get_commission_breakdown(category: Text, booking_value: Nat) : async {
        tier: CommissionTier;
        baseFee: Nat;
        calculatedCommission: Nat;
        breakdown: Text;
        structure: FeeStructure;
    } {
        let tier = getCategoryTier(category);
        let structure = getFeeStructure(tier);
        let commission = calculateDynamicCommission(booking_value, structure);
        
        let breakdown = switch (tier) {
            case (#TierA) { 
                "Premium: ₱50 base | 10% up to ₱500 | 8% ₱501-₱2K | 7% ₱2K-₱8K | 6% ₱8K-₱20K | 5% above ₱20K"
            };
            case (#TierB) { 
                "Standard: ₱35 base | 8% up to ₱300 | 6% ₱301-₱1.5K | 5% ₱1.5K-₱6K | 4% ₱6K-₱15K | 3% above ₱15K"
            };
            case (#TierC) { 
                "Basic: ₱25 base | 6% up to ₱200 | 4% ₱201-₱1K | 3.5% ₱1K-₱4K | 2.5% ₱4K-₱12K | 2% above ₱12K"
            };
        };
        
        {
            tier = tier;
            baseFee = structure.baseFee;
            calculatedCommission = commission;
            breakdown = breakdown;
            structure = structure;
        }
    };
}
