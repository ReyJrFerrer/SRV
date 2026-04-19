const admin = require("firebase-admin");
const {getFirestore: getFirestoreFromAdmin} = require("firebase-admin/firestore");

let isInitialized = false;

/**
 * Initialize Firebase Admin SDK with proper emulator settings
 */
function initializeFirebaseAdmin() {
  if (isInitialized || admin.apps.length > 0) {
    return;
  }
  // Check if running in emulator environment
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    console.log("Initializing for emulator environment");

    // Initialize with emulator settings
    admin.initializeApp();

    // Connect to Firestore emulator
    const db = getFirestoreFromAdmin(admin.app(), "srvefirestore");
    db.settings({
      host: "localhost:8080",
      ssl: false,
    });

    console.log("Firebase Admin initialized for emulator environment");
  } else {
    console.log("Initializing for production environment");

    admin.initializeApp({
      "projectId": "srve-7133d",
      "databaseURL": "https://srve-7133d.asia-southeast1.firebasedatabase.app",
      "storageBucket": "srve-7133d",
    });
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
  return getFirestoreFromAdmin(admin.app(), "srvefirestore");
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

