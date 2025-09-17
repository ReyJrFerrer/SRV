const { HttpAgent } = require("@dfinity/agent");
const { Actor } = require("@dfinity/agent");

// Import the actual commission canister declarations
const fs = require('fs');
const path = require('path');

/**
 * Load IDL factory from declarations
 */
function loadCommissionIdlFactory() {
  try {
    // Try to load from declarations directory
    const declarationsPath = path.resolve(__dirname, '../../src/declarations/commission/commission.did.js');
    
    if (fs.existsSync(declarationsPath)) {
      // Use dynamic import for ES module
      const { idlFactory } = require(declarationsPath);
      return idlFactory;
    }
    
    // Fallback to manual IDL definition if declarations not found
    console.warn("Commission declarations not found, using manual IDL definition");
    return getManualCommissionIdl();
  } catch (error) {
    console.warn("Failed to load commission declarations, using manual IDL:", error.message);
    return getManualCommissionIdl();
  }
}

/**
 * Manual IDL definition based on the commission.mo interface
 */
function getManualCommissionIdl() {
  return ({ IDL }) => {
    const CommissionTier = IDL.Variant({
      'TierA': IDL.Null,
      'TierB': IDL.Null,
      'TierC': IDL.Null,
    });
    
    const FeeStructure = IDL.Record({
      'baseFee': IDL.Nat,
      'breakpoints': IDL.Vec(IDL.Nat),
      'rates': IDL.Vec(IDL.Float64),
    });
    
    const CommissionBreakdown = IDL.Record({
      'baseFee': IDL.Nat,
      'structure': FeeStructure,
      'breakdown': IDL.Text,
      'tier': CommissionTier,
      'calculatedCommission': IDL.Nat,
    });
    
    return IDL.Service({
      'calculate_commission': IDL.Func([IDL.Text, IDL.Nat], [IDL.Nat], []),
      'get_category_tier': IDL.Func([IDL.Text], [CommissionTier], ['query']),
      'get_commission_breakdown': IDL.Func(
          [IDL.Text, IDL.Nat],
          [
            IDL.Record({
              'baseFee': IDL.Nat,
              'structure': FeeStructure,
              'breakdown': IDL.Text,
              'tier': CommissionTier,
              'calculatedCommission': IDL.Nat,
            }),
          ],
          ['query'],
        ),
    });
  };
}

/**
 * Canister configuration utility for multi-environment support
 * Handles local, IC mainnet, and playground environments
 */

// Environment detection
function detectEnvironment() {
  if (process.env.FUNCTIONS_EMULATOR === "true" || process.env.NODE_ENV === "development") {
    return "local";
  }
  
  if (process.env.DFX_NETWORK === "ic" || process.env.ENVIRONMENT === "production") {
    return "ic";
  }
  
  if (process.env.DFX_NETWORK === "playground" || process.env.ENVIRONMENT === "playground") {
    return "playground";
  }
  
  // Default to local for development
  return "local";
}

// Canister ID mappings for different environments
const CANISTER_IDS = {
  local: {
    commission: process.env.COMMISSION_CANISTER_ID_LOCAL || "by6od-j4aaa-aaaaa-qaadq-cai",
    wallet: process.env.WALLET_CANISTER_ID_LOCAL || "br5f7-7uaaa-aaaaa-qaaca-cai",
    booking: process.env.BOOKING_CANISTER_ID_LOCAL || "bkyz2-fmaaa-aaaaa-qaaaq-cai",
    backend: process.env.BACKEND_CANISTER_ID_LOCAL || "bkyz2-fmaaa-aaaaa-qaaaq-cai",
  },
  ic: {
    commission: process.env.COMMISSION_CANISTER_ID_IC,
    wallet: process.env.WALLET_CANISTER_ID_IC,
    booking: process.env.BOOKING_CANISTER_ID_IC,
    backend: process.env.BACKEND_CANISTER_ID_IC,
  },
  playground: {
    commission: process.env.COMMISSION_CANISTER_ID_PLAYGROUND,
    wallet: process.env.WALLET_CANISTER_ID_PLAYGROUND,
    booking: process.env.BOOKING_CANISTER_ID_PLAYGROUND,
    backend: process.env.BACKEND_CANISTER_ID_PLAYGROUND,
  },
};

// Host URLs for different environments
const HOSTS = {
  local: "http://127.0.0.1:4943",
  ic: "https://ic0.app",
  playground: "https://ic0.app", // Playground uses same host as IC
};

/**
 * Get canister configuration for current environment
 */
function getCanisterConfig() {
  const environment = detectEnvironment();
  
  const config = {
    environment,
    host: HOSTS[environment],
    canisterIds: CANISTER_IDS[environment],
    fetchRootKey: environment === "local", // Only fetch root key in local development
  };
  
  console.log(`Canister config for environment: ${environment}`, {
    host: config.host,
    canisterIds: config.canisterIds,
    fetchRootKey: config.fetchRootKey,
  });
  
  return config;
}

/**
 * Create an agent for canister communication
 */
async function createAgent() {
  const config = getCanisterConfig();
  
  const agent = new HttpAgent({
    host: config.host,
  });
  
  // Fetch root key for local development
  if (config.fetchRootKey) {
    try {
      await agent.fetchRootKey();
      console.log("Root key fetched successfully for local development");
    } catch (error) {
      console.warn("Failed to fetch root key:", error.message);
    }
  }
  
  return agent;
}

/**
 * Create a canister actor with proper configuration
 */
async function createCanisterActor(canisterName, idlFactory) {
  const config = getCanisterConfig();
  const agent = await createAgent();
  
  const canisterId = config.canisterIds[canisterName];
  
  if (!canisterId) {
    throw new Error(`Canister ID not found for ${canisterName} in ${config.environment} environment`);
  }
  
  console.log(`Creating actor for ${canisterName} canister: ${canisterId}`);
  
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
}

/**
 * Commission canister IDL factory - uses actual declarations
 */
const commissionIdlFactory = loadCommissionIdlFactory();

/**
 * Wallet canister IDL factory
 */
const walletIdlFactory = ({ IDL }) => {
  const WalletResult = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  
  return IDL.Service({
    'get_balance' : IDL.Func([IDL.Principal], [WalletResult], ['query']),
    'credit' : IDL.Func([IDL.Principal, IDL.Nat, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)], [WalletResult], []),
    'debit' : IDL.Func([IDL.Principal, IDL.Nat, IDL.Opt(IDL.Text)], [WalletResult], []),
  });
};

/**
 * Get commission calculation from canister
 */
async function getCommissionFromCanister(category, amount) {
  try {
    console.log(`Getting commission for category: ${category}, amount: ${amount}`);
    
    const commissionActor = await createCanisterActor('commission', commissionIdlFactory);
    
    // The calculate_commission function returns bigint directly, not a Result type
    const result = await commissionActor.calculate_commission(category, amount);
    
    const commission = Number(result);
    console.log(`Commission calculated: ${commission}`);
    
    return {
      success: true,
      commission: commission,
      providerAmount: amount - commission,
    };
  } catch (error) {
    console.error("Failed to get commission from canister:", error);
    
    // Fallback to static calculation
    console.log("Falling back to static commission calculation");
    const fallbackRate = category.toLowerCase().includes("cleaning") ? 0.035 : 0.05;
    const fallbackCommission = Math.round(amount * fallbackRate);
    
    return {
      success: true,
      commission: fallbackCommission,
      providerAmount: amount - fallbackCommission,
      fallback: true,
    };
  }
}

/**
 * Get detailed commission breakdown from canister
 */
async function getCommissionBreakdown(category, amount) {
  try {
    console.log(`Getting commission breakdown for category: ${category}, amount: ${amount}`);
    
    const commissionActor = await createCanisterActor('commission', commissionIdlFactory);
    
    // The get_commission_breakdown function returns the breakdown directly
    const result = await commissionActor.get_commission_breakdown(category, amount);
    
    console.log("Commission breakdown calculated successfully");
    return {
      success: true,
      breakdown: result,
    };
  } catch (error) {
    console.error("Failed to get commission breakdown from canister:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Validate canister connection
 */
async function validateCanisterConnection() {
  const config = getCanisterConfig();
  
  try {
    // Test commission canister connection
    const commissionResult = await getCommissionFromCanister("Cleaning Services", 1000);
    
    return {
      success: true,
      environment: config.environment,
      host: config.host,
      canisterIds: config.canisterIds,
      commissionTest: commissionResult.success,
    };
  } catch (error) {
    console.error("Canister connection validation failed:", error);
    return {
      success: false,
      environment: config.environment,
      error: error.message,
    };
  }
}

module.exports = {
  detectEnvironment,
  getCanisterConfig,
  createAgent,
  createCanisterActor,
  getCommissionFromCanister,
  getCommissionBreakdown,
  validateCanisterConnection,
  commissionIdlFactory,
  walletIdlFactory,
};