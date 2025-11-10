/**
 * Commission calculation utilities - shared logic extracted from commission.js
 * This allows service.js to use commission logic directly without HTTPS calls
 */

/**
 * Commission tier definitions - migrated from commission.mo
 */
const COMMISSION_TIERS = {
  TIER_A: "TierA", // Premium services
  TIER_B: "TierB", // Standard services
  TIER_C: "TierC", // Basic services
};

/**
 * Fee structure configuration for each tier - migrated from commission.mo
 */
const TIER_STRUCTURES = {
  [COMMISSION_TIERS.TIER_A]: {
    baseFee: 15,
    breakpoints: [500, 2000, 8000, 20000], // ₱500, ₱2K, ₱8K, ₱20K
    rates: [0.1, 0.08, 0.07, 0.06, 0.05], // 10%, 8%, 7%, 6%, 5%
  },
  [COMMISSION_TIERS.TIER_B]: {
    baseFee: 15,
    breakpoints: [300, 1500, 6000, 15000], // ₱300, ₱1.5K, ₱6K, ₱15K
    rates: [0.08, 0.06, 0.05, 0.04, 0.03], // 8%, 6%, 5%, 4%, 3%
  },
  [COMMISSION_TIERS.TIER_C]: {
    baseFee: 15,
    breakpoints: [200, 1000, 4000, 12000], // ₱200, ₱1K, ₱4K, ₱12K
    rates: [0.06, 0.04, 0.035, 0.025, 0.02], // 6%, 4%, 3.5%, 2.5%, 2%
  },
};

/**
 * Category to tier mapping - migrated from commission.mo
 * @param {string} category - Service category name
 * @return {string} Commission tier
 */
function getCategoryTier(category) {
  switch (category) {
  case "Gadget Technicians":
  case "Automobile Repairs":
  case "Photographer":
    return COMMISSION_TIERS.TIER_A;
  case "Home Repairs":
  case "Tutoring":
  case "Beauty Services":
  case "Massage Services":
    return COMMISSION_TIERS.TIER_B;
  case "Cleaning Services":
  case "Delivery and Errands":
    return COMMISSION_TIERS.TIER_C;
  default:
    return COMMISSION_TIERS.TIER_B; // Default to Tier B for unknown categories
  }
}

/**
 * Get fee structure for a given tier
 * @param {string} tier - Commission tier
 * @return {object} Fee structure
 */
function getFeeStructure(tier) {
  return TIER_STRUCTURES[tier];
}

/**
 * Dynamic commission calculation based on fee structure - migrated from commission.mo
 * @param {number} bookingValue - Service booking value
 * @param {object} structure - Fee structure configuration
 * @return {number} Calculated commission amount
 */
function calculateDynamicCommission(bookingValue, structure) {
  let totalCommission = 0;
  let remainingValue = bookingValue;

  // Apply rates for each bracket
  const {breakpoints, rates} = structure;

  let previousBreakpoint = 0;

  // Calculate commission for each bracket
  for (let i = 0; i < breakpoints.length && remainingValue > 0; i++) {
    const currentBreakpoint = breakpoints[i];
    const bracketSize = Math.min(
      remainingValue,
      currentBreakpoint - previousBreakpoint,
    );

    if (bracketSize > 0) {
      totalCommission += bracketSize * rates[i];
      remainingValue -= bracketSize;
      previousBreakpoint = currentBreakpoint;
    }
  }

  // Apply final rate for remaining value above highest breakpoint
  if (remainingValue > 0 && rates.length > breakpoints.length) {
    totalCommission += remainingValue * rates[rates.length - 1];
  }

  // Ensure minimum base fee
  const calculatedFee = Math.round(totalCommission);
  return Math.max(calculatedFee, structure.baseFee);
}

module.exports = {
  COMMISSION_TIERS,
  TIER_STRUCTURES,
  getCategoryTier,
  getFeeStructure,
  calculateDynamicCommission,
};
