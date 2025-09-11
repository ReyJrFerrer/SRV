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
        #TierA; // 7% Base - Gadget Repair, Automobile Repair, Photography
        #TierB; // 5% Base - General Repairs, Tutoring, Beauty Services, Massage Services
        #TierC; // 3.5% Base - Cleaning, Delivery
    };

    // Category to tier mapping
    private func getCategoryTier(category: Text) : CommissionTier {
        switch (category) {
            case ("Gadget Repair" or "Automobile Repair" or "Photography") { #TierA };
            case ("General Repairs" or "Tutoring" or "Beauty Services" or "Massage Services") { #TierB };
            case ("Cleaning" or "Delivery") { #TierC };
            case (_) { #TierB }; // Default to Tier B for unknown categories
        }
    };

    // Calculate progressive commission for Tier A (7% Base)
    private func calculateTierACommission(bookingValue: Nat) : Nat {
        let value = Float.fromInt(bookingValue);
        var commission : Float = 0;
        
        if (value <= 1500) {
            // 7% on the first 1,500
            commission := value * 0.07;
        } else if (value <= 10000) {
            // 7% on the first 1,500 + 6% on value from 1,501 to 10,000
            commission := (1500 * 0.07) + ((value - 1500) * 0.06);
        } else {
            // 7% on the first 1,500 + 6% on 1,501 to 10,000 + 5% on value above 10,000
            commission := (1500 * 0.07) + (8500 * 0.06) + ((value - 10000) * 0.05);
        };
        
        Int.abs(Float.toInt(Float.nearest(commission)));
    };

    // Calculate progressive commission for Tier B (5% Base)
    private func calculateTierBCommission(bookingValue: Nat) : Nat {
        let value = Float.fromInt(bookingValue);
        var commission : Float = 0;
        
        if (value <= 1500) {
            // 5% on the first 1,500
            commission := value * 0.05;
        } else if (value <= 10000) {
            // 5% on the first 1,500 + 4% on value from 1,501 to 10,000
            commission := (1500 * 0.05) + ((value - 1500) * 0.04);
        } else {
            // 5% on the first 1,500 + 4% on 1,501 to 10,000 + 3% on value above 10,000
            commission := (1500 * 0.05) + (8500 * 0.04) + ((value - 10000) * 0.03);
        };
        
        Int.abs(Float.toInt(Float.nearest(commission)));
    };

    // Calculate progressive commission for Tier C (3.5% Base)
    private func calculateTierCCommission(bookingValue: Nat) : Nat {
        let value = Float.fromInt(bookingValue);
        var commission : Float = 0;
        
        if (value <= 1500) {
            // 3.5% on the first 1,500
            commission := value * 0.035;
        } else if (value <= 10000) {
            // 3.5% on the first 1,500 + 2.5% on value from 1,501 to 10,000
            commission := (1500 * 0.035) + ((value - 1500) * 0.025);
        } else {
            // 3.5% on the first 1,500 + 2.5% on 1,501 to 10,000 + 1.5% on value above 10,000
            commission := (1500 * 0.035) + (8500 * 0.025) + ((value - 10000) * 0.015);
        };
        
        Int.abs(Float.toInt(Float.nearest(commission)));
    };

    // Main public function to calculate commission
    public func calculate_commission(category: Text, booking_value: Nat) : async Nat {
        // Validate input
        if (booking_value == 0) {
            return 0;
        };
        
        let tier = getCategoryTier(category);
        
        switch (tier) {
            case (#TierA) { calculateTierACommission(booking_value) };
            case (#TierB) { calculateTierBCommission(booking_value) };
            case (#TierC) { calculateTierCCommission(booking_value) };
        }
    };

    // Helper function to get tier information for debugging/testing
    public query func get_category_tier(category: Text) : async CommissionTier {
        getCategoryTier(category);
    };

    // Helper function to get commission breakdown for transparency
    public query func get_commission_breakdown(category: Text, booking_value: Nat) : async {
        tier: CommissionTier;
        baseRate: Text;
        calculatedCommission: Nat;
        breakdown: Text;
    } {
        let tier = getCategoryTier(category);
        let commission = switch (tier) {
            case (#TierA) { calculateTierACommission(booking_value) };
            case (#TierB) { calculateTierBCommission(booking_value) };
            case (#TierC) { calculateTierCCommission(booking_value) };
        };
        
        let (baseRate, breakdown) = switch (tier) {
            case (#TierA) { 
                ("7%", "7% on first ₱1,500 | 6% on ₱1,501-₱10,000 | 5% above ₱10,000")
            };
            case (#TierB) { 
                ("5%", "5% on first ₱1,500 | 4% on ₱1,501-₱10,000 | 3% above ₱10,000")
            };
            case (#TierC) { 
                ("3.5%", "3.5% on first ₱1,500 | 2.5% on ₱1,501-₱10,000 | 1.5% above ₱10,000")
            };
        };
        
        {
            tier = tier;
            baseRate = baseRate;
            calculatedCommission = commission;
            breakdown = breakdown;
        }
    };
}
