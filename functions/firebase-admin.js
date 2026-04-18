const admin = require("firebase-admin");

let isInitialized = false;

/**
 * Initialize Firebase Admin SDK with proper emulator settings
 */
function initializeFirebaseAdmin() {
  if (isInitialized || admin.apps.length > 0) {
    return;
  }

  console.log("Initializing Firebase Admin...");
  console.log("FUNCTIONS_EMULATOR:", process.env.FUNCTIONS_EMULATOR);
  console.log("GCLOUD_PROJECT:", process.env.GCLOUD_PROJECT);
  console.log("FIREBASE_CONFIG:", process.env.FIREBASE_CONFIG);

  // Check if running in emulator environment
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    console.log("Initializing for emulator environment");

    // Initialize with emulator settings
    admin.initializeApp();

    // Connect to Firestore emulator
    const db = admin.firestore();
    db.settings({
      host: "localhost:8080",
      ssl: false,
    });

    console.log("Firebase Admin initialized for emulator environment");
  } else {
    console.log("Initializing for production environment");

    admin.initializeApp();
  }

  isInitialized = true;
}

/**
 * Get Firestore database instance
 * @returns {FirebaseFirestore.Firestore} Firestore database instance
 */
function getFirestore() {
  if (!isInitialized) {
    initializeFirebaseAdmin();
  }
  return admin.firestore();
}

/**
 * Get Firebase Auth instance
 * @returns {FirebaseFirestore.auth} Auth instance
 */
function getAuth() {
  if (!isInitialized) {
    initializeFirebaseAdmin();
  }
  return admin.auth();
}

// Initialize if not already done
if (!admin.apps.length) {
  initializeFirebaseAdmin();
}

module.exports = {
  admin,
  initializeFirebaseAdmin,
  getFirestore,
  getAuth,
};

