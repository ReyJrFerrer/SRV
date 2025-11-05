/**
 * Identity Bridge Cloud Function
 *
 * This function serves as the bridge between Internet Computer Identity and Firebase Auth.
 * It verifies a Principal from Internet Identity and creates a Firebase custom token.
 * This is the cornerstone of the hybrid ICP-Firebase architecture.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {Principal} = require("@dfinity/principal");
const {HttpAgent, Actor} = require("@dfinity/agent");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  if (process.env.FUNCTIONS_EMULATOR) {
    // In emulator mode, initialize without credentials
    admin.initializeApp({
      projectId: "devsrv-rey",
    });

    // Use Auth emulator
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  } else {
    admin.initializeApp();
  }
}

/**
 * Load IDL factory from declarations
 * @return {Function} The IDL factory function
 */
function loadAuthIdlFactory() {
  try {
    // Try to load from declarations directory
    const declarationsPath = path.resolve(
      __dirname,
      "../../src/declarations/auth/auth.did.js",
    );

    if (fs.existsSync(declarationsPath)) {
      const {idlFactory} = require(declarationsPath);
      console.log("✅ Auth IDL factory loaded from declarations");
      return idlFactory;
    }

    // Fallback to manual IDL definition if declarations not found
    console.warn("⚠️ Auth declarations not found, using manual IDL definition");
    return getManualAuthIdl();
  } catch (error) {
    console.warn(
      "⚠️ Failed to load auth declarations, using manual IDL:",
      error.message,
    );
    return getManualAuthIdl();
  }
}

/**
 * Manual IDL definition for auth canister
 * @return {Function} The IDL factory function
 */
function getManualAuthIdl() {
  return ({IDL}) => {
    const UserRole = IDL.Variant({
      Client: IDL.Null,
      ServiceProvider: IDL.Null,
    });

    const ProfilePicture = IDL.Record({
      imageUrl: IDL.Text,
      thumbnailUrl: IDL.Text,
    });

    const Profile = IDL.Record({
      id: IDL.Principal,
      name: IDL.Text,
      phone: IDL.Text,
      role: UserRole,
      activeRole: UserRole,
      createdAt: IDL.Int,
      updatedAt: IDL.Int,
      profilePicture: IDL.Opt(ProfilePicture),
      biography: IDL.Opt(IDL.Text),
    });

    const Result = IDL.Variant({ok: Profile, err: IDL.Text});

    return IDL.Service({
      isPrincipalValid: IDL.Func([IDL.Principal], [Result], ["query"]),
      getProfile: IDL.Func([IDL.Principal], [Result], ["query"]),
    });
  };
}

/**
 * Environment detection
 * @return {string} The detected environment
 */
function detectEnvironment() {
  // Check explicit environment variable first
  if (process.env.ICP_ENVIRONMENT) {
    console.log(`🔧 Using ICP_ENVIRONMENT: ${process.env.ICP_ENVIRONMENT}`);
    return process.env.ICP_ENVIRONMENT;
  }

  // Check if running in Firebase Functions emulator
  if (
    process.env.FUNCTIONS_EMULATOR === "true" ||
    process.env.NODE_ENV === "development"
  ) {
    return "local";
  }

  // Check for production IC environment
  if (
    process.env.DFX_NETWORK === "ic" ||
    process.env.ENVIRONMENT === "production"
  ) {
    return "ic";
  }

  // Check for playground environment
  if (
    process.env.DFX_NETWORK === "playground" ||
    process.env.ENVIRONMENT === "playground"
  ) {
    return "playground";
  }

  // If deployed to Firebase (not in emulator) but no environment set, default to playground
  // This is the case when functions are deployed to Firebase Cloud Functions
  if (process.env.FUNCTION_NAME || process.env.K_SERVICE) {
    console.log("⚠️ No ICP_ENVIRONMENT set, defaulting to playground for deployed functions");
    return "playground";
  }

  // Default to local for development
  console.log("⚠️ No environment detected, defaulting to local");
  return "local";
}

// Canister ID mappings for different environments
const CANISTER_IDS = {
  local: {
    auth: "bkyz2-fmaaa-aaaaa-qaaaq-cai",
  },
  ic: {
    auth: process.env.CANISTER_ID_AUTH,
  },
  playground: {
    auth: process.env.CANISTER_ID_AUTH,
  },
};

// Host URLs for different environments
const HOSTS = {
  local: "http://127.0.0.1:4943",
  ic: `https://id.ai`,
  playground: `https://id.ai`,
};

/**
 * Get canister configuration for current environment
 * @return {Object} The canister configuration
 */
function getCanisterConfig() {
  const environment = detectEnvironment();

  const config = {
    environment,
    host: HOSTS[environment],
    canisterIds: CANISTER_IDS[environment],
    fetchRootKey: environment === "local",
  };

  console.log(`🔧 Canister config for environment: ${environment}`, {
    host: config.host,
    authCanisterId: config.canisterIds.auth,
    fetchRootKey: config.fetchRootKey,
  });

  return config;
}

// Load the IDL factory
const authIdlFactory = loadAuthIdlFactory();

/**
 * Creates an auth actor to communicate with the IC canister
 * @return {Object} Auth actor instance
 */
async function createAuthActor() {
  const config = getCanisterConfig();
  const agent = new HttpAgent({host: config.host});

  // Fetch root key for local development
  if (config.fetchRootKey) {
    try {
      await agent.fetchRootKey();
      console.log("✅ Root key fetched successfully for local development");
    } catch (err) {
      console.warn("⚠️ Unable to fetch root key. Check if the IC local replica is running.");
      throw err;
    }
  }

  const canisterId = config.canisterIds.auth;
  if (!canisterId) {
    throw new Error(
      `Auth canister ID not found for ${config.environment} environment. ` +
      `Please set CANISTER_ID_AUTH environment variable.`,
    );
  }

  console.log(`🔗 Creating auth actor for canister: ${canisterId}`);

  return Actor.createActor(authIdlFactory, {
    agent,
    canisterId,
  });
}

/**
 * Verify if a Principal is valid by checking if they have a profile
 * For new users, we'll allow them through and they can create a profile later
 * @param {Principal} principal - The principal to verify
 * @return {Promise<{isValid: boolean, hasProfile: boolean}>} Validation result
 */
async function checkPrincipal(principal) {
  try {
    const authActor = await createAuthActor();
    const result = await authActor.isPrincipalValid(principal);

    // If isPrincipalValid returns ok, the principal has a profile
    if ("ok" in result) {
      return {isValid: true, hasProfile: true};
    }

    // If it returns an error, the principal is new (no profile yet)
    // This is still valid - they just need to create a profile
    return {isValid: true, hasProfile: false};
  } catch (error) {
    console.error("❌ Error checking principal:", error);
    // Even on error, allow the user through - they might be new
    // or the canister might be temporarily unavailable
    return {isValid: true, hasProfile: false};
  }
}

/**
 * Check if user profile exists in Firestore
 * @param {string} principalText - The principal as text (UID)
 * @return {Promise<Object|null>} User profile data or null if not found
 */
async function getUserProfile(principalText) {
  const db = admin.firestore();
  const userRef = db.collection("users").doc(principalText);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return null;
  }

  return userDoc.data();
}

/**
 * Sign in with Internet Identity
 * Callable Cloud Function that serves as the Identity Bridge
 */
exports.signInWithInternetIdentity = functions.https.onCall(async (data) => {
  try {
    const {principal: principalText} = data.data;


    if (!principalText) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Principal is required",
      );
    }

    // Validate the principal format
    let principal;
    try {
      principal = Principal.fromText(principalText);
    } catch (error) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid principal format",
      );
    }

    // Check the principal with IC canister
    const {isValid, hasProfile} = await checkPrincipal(principal);

    console.log(`🔍 Principal check result:`, {
      principal: principalText,
      isValid,
      hasProfile,
    });

    if (!isValid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Unable to verify principal with Internet Computer",
      );
    }

    // Check if user has a Firestore profile (for existing users)
    const profile = await getUserProfile(principalText);
    const hasFirestoreProfile = !!profile;

    console.log(`✅ Authentication check complete:`, {
      principal: principalText,
      hasProfile: hasFirestoreProfile,
      needsProfile: !hasFirestoreProfile,
    });

    // Create Firebase custom token
    const customToken = await admin.auth().createCustomToken(principalText, {
      // Add custom claims here if needed
      provider: "internet-identity",
      icPrincipal: principalText,
      hasProfile: hasFirestoreProfile,
    });

    return {
      success: true,
      customToken,
      principal: principalText,
      hasProfile: hasFirestoreProfile, // Let frontend know if user needs to create profile
      needsProfile: !hasFirestoreProfile, // Explicit flag for new users
      message: hasFirestoreProfile ?
        "Successfully authenticated with Internet Identity" :
        "Successfully authenticated. Please complete your profile.",
    };
  } catch (error) {
    console.error("Error in signInWithInternetIdentity:", error);

    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Otherwise, wrap it in an internal error
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Internal server error",
    );
  }
});
