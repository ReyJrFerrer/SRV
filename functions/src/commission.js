const functions = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");

/**
 * Commission tier definitions
 */
const COMMISSION_TIERS = {
  TIER_A: "TierA", // Premium services
  TIER_B: "TierB", // Standard services
  TIER_C: "TierC", // Basic services
};

/**
 * Fee structure configuration for each tier
 */
const TIER_STRUCTURES = {
  [COMMISSION_TIERS.TIER_A]: {
    baseFee: 15, // ₱15 minimum commission
    breakpoints: [500, 2000, 8000, 20000], // ₱500, ₱2K, ₱8K, ₱20K
    rates: [0.10, 0.08, 0.07, 0.06, 0.05], // 10%, 8%, 7%, 6%, 5%
  },
  [COMMISSION_TIERS.TIER_B]: {
    baseFee: 15, // ₱15 minimum commission
    breakpoints: [300, 1500, 6000, 15000], // ₱300, ₱1.5K, ₱6K, ₱15K
    rates: [0.08, 0.06, 0.05, 0.04, 0.03], // 8%, 6%, 5%, 4%, 3%
  },
  [COMMISSION_TIERS.TIER_C]: {
    baseFee: 15, // ₱15 minimum commission
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
    const bracketSize = Math.min(remainingValue, currentBreakpoint - previousBreakpoint);

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

/**
 * Main commission calculation function - migrated from commission.mo calculate_commission
 */
exports.calculateCommission = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  // Extract payload from data.data
  const payload = data.data || data;
  const {categoryName, price} = payload;

  // Validation (mirror Motoko validation)
  if (!categoryName) {
    throw new HttpsError("invalid-argument", "Category name is required");
  }

  if (!price || price <= 0) {
    throw new HttpsError("invalid-argument", "Valid price is required");
  }

  try {
    const tier = getCategoryTier(categoryName);
    const structure = getFeeStructure(tier);
    const commissionFee = calculateDynamicCommission(price, structure);

    // Calculate commission rate as percentage
    const commissionRate = ((commissionFee / price) * 100).toFixed(2);

    return {
      success: true,
      commissionFee: commissionFee,
      commissionRate: parseFloat(commissionRate),
      tier: tier,
    };
  } catch (error) {
    console.error("Error calculating commission:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get category tier information - migrated from commission.mo get_category_tier
 */
exports.getCategoryTier = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  // Extract payload from data.data
  const payload = data.data || data;
  const {categoryName} = payload;

  if (!categoryName) {
    throw new HttpsError("invalid-argument", "Category name is required");
  }

  try {
    const tier = getCategoryTier(categoryName);
    return {
      success: true,
      tier: tier,
    };
  } catch (error) {
    console.error("Error getting category tier:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get commission breakdown for transparency - migrated from commission.mo get_commission_breakdown
 */
exports.getCommissionBreakdown = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  // Extract payload from data.data
  const payload = data.data || data;
  const {categoryName, price} = payload;

  // Validation (mirror Motoko validation)
  if (!categoryName) {
    throw new HttpsError("invalid-argument", "Category name is required");
  }

  if (!price || price <= 0) {
    throw new HttpsError("invalid-argument", "Valid price is required");
  }

  try {
    const tier = getCategoryTier(categoryName);
    const structure = getFeeStructure(tier);
    const commissionFee = calculateDynamicCommission(price, structure);

    // Generate breakdown description based on tier
    let breakdown;
    switch (tier) {
    case COMMISSION_TIERS.TIER_A:
      breakdown =
      "Premium: ₱15 base | 10% up to ₱500 | 8% ₱501-₱2K | 7% ₱2K-₱8K | 6% ₱8K-₱20K | 5% above ₱20K";
      break;
    case COMMISSION_TIERS.TIER_B:
      breakdown =
"Standard: ₱15 base | 8% up to ₱300 | 6% ₱301-₱1.5K | 5% ₱1.5K-₱6K | 4% ₱6K-₱15K | 3% above ₱15K";
      break;
    case COMMISSION_TIERS.TIER_C:
      breakdown =
"Basic: ₱15 base | 6% up to ₱200 | 4% ₱201-₱1K | 3.5% ₱1K-₱4K | 2.5% ₱4K-₱12K | 2% above ₱12K";
      break;
    default:
      breakdown = "Standard tier breakdown";
    }

    return {
      success: true,
      tier: tier,
      baseFee: structure.baseFee,
      calculatedCommission: commissionFee,
      breakdown: breakdown,
      structure: structure,
    };
  } catch (error) {
    console.error("Error getting commission breakdown:", error);
    throw new HttpsError("internal", error.message);
  }
});
