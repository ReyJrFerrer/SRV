const admin = require("firebase-admin");

let isInitialized = false;

/**
 * Initialize Firebase Admin SDK with proper emulator settings
 */
function initializeFirebaseAdmin() {
  if (isInitialized) {
    return;
  }

  // Check if running in emulator environment
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    // Initialize with emulator settings
    admin.initializeApp({
      projectId: "devsrv-rey",
    });

    // Connect to Firestore emulator
    const db = admin.firestore();
    db.settings({
      host: "localhost:8080",
      ssl: false,
    });

    console.log("Firebase Admin initialized for emulator environment");
  } else {
    // Initialize normally for production
    admin.initializeApp();
    console.log("Firebase Admin initialized for production environment");
  }

  isInitialized = true;
}

// Initialize if not already done
if (!admin.apps.length) {
  initializeFirebaseAdmin();
}

module.exports = {
  admin,
  initializeFirebaseAdmin,
};
