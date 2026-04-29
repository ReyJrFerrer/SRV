const admin = require("firebase-admin");
const http = require("http");

// Initialize admin SDK for emulator
process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "srve-7133d";

admin.initializeApp();
const db = admin.firestore();
db.settings({ databaseId: "srvefirestore" });
const auth = admin.auth();

const TEST_UID = "test-client-bad-review";
const TEST_PROVIDER_ID = "test-provider-123";
const TEST_SERVICE_ID = "test-service-123";
const TEST_BOOKING_ID = "test-booking-bad-review";
const FUNCTIONS_URL = "http://127.0.0.1:5001/srve-7133d/asia-southeast1/submitReview";

function httpRequest(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(url, options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => (responseBody += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
        } catch {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function seedTestData() {
  console.log("--- Seeding test data ---");

  // Create auth user
  try {
    await auth.createUser({ uid: TEST_UID, email: "test-bad@example.com", displayName: "Test Bad Client" });
    console.log("Created auth user:", TEST_UID);
  } catch (e) {
    if (e.code === "auth/uid-already-exists") {
      console.log("Auth user already exists:", TEST_UID);
    } else throw e;
  }

  // Create service
  await db.collection("services").doc(TEST_SERVICE_ID).set({
    id: TEST_SERVICE_ID,
    name: "Test Cleaning Service",
    providerId: TEST_PROVIDER_ID,
    averageRating: 4.5,
    reviewCount: 10,
    createdAt: new Date().toISOString(),
  });
  console.log("Created service:", TEST_SERVICE_ID);

  // Create booking (completed, within review window)
  await db.collection("bookings").doc(TEST_BOOKING_ID).set({
    id: TEST_BOOKING_ID,
    clientId: TEST_UID,
    providerId: TEST_PROVIDER_ID,
    serviceId: TEST_SERVICE_ID,
    status: "Completed",
    completedDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  console.log("Created booking:", TEST_BOOKING_ID);

  // Create user profile (client)
  await db.collection("users").doc(TEST_UID).set({
    name: "Test Bad Client",
    phone: "+1234567890",
    email: "test-bad@example.com",
    createdAt: new Date().toISOString(),
  });
  console.log("Created user profile:", TEST_UID);

  // Create user profile (provider) - needed by reputation processing
  await db.collection("users").doc(TEST_PROVIDER_ID).set({
    name: "Test Provider",
    phone: "+9876543210",
    email: "test-provider@example.com",
    createdAt: new Date().toISOString(),
  });
  console.log("Created provider profile:", TEST_PROVIDER_ID);
}

async function callSubmitReview() {
  console.log("\n--- Calling submitReview with BAD review (rating=1) ---");

  // Get a custom token for auth
  const customToken = await auth.createCustomToken(TEST_UID);

  // Exchange custom token for an ID token via Auth emulator
  const signUpRes = await httpRequest(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-key",
    { token: customToken, returnSecureToken: true },
  );

  const idToken = signUpRes.body.idToken;
  if (!idToken) {
    console.error("Failed to get ID token:", signUpRes.body);
    process.exit(1);
  }
  console.log("Got ID token");

  // Call submitReview
  const result = await httpRequest(
    FUNCTIONS_URL,
    { data: { bookingId: TEST_BOOKING_ID, rating: 1, comment: "Terrible service. Very disappointed." } },
    idToken,
  );

  console.log("Function response status:", result.status);
  console.log("Function response body:", JSON.stringify(result.body, null, 2));
  return result;
}

async function verifyFirestore(label) {
  console.log(`\n--- Verifying Firestore state (${label}) ---`);

  // Check reviews collection
  const reviewsSnap = await db.collection("reviews").where("bookingId", "==", TEST_BOOKING_ID).get();
  console.log(`Reviews for booking: ${reviewsSnap.size}`);
  reviewsSnap.forEach((doc) => {
    const r = doc.data();
    console.log(`  Review ${r.id}:`);
    console.log(`    rating=${r.rating}, status=${r.status}`);
    console.log(`    comment="${r.comment}"`);
    console.log(`    aiAnalysis=${JSON.stringify(r.aiAnalysis || null)}`);
  });

  // Check reports collection
  const reportsSnap = await db.collection("reports").get();
  console.log(`\nTotal reports in DB: ${reportsSnap.size}`);
  reportsSnap.forEach((doc) => {
    const r = doc.data();
    console.log(`  Report ${r.id}:`);
    console.log(`    source: ${r.source || "N/A"}`);
    console.log(`    userId: ${r.userId || "N/A"}`);
    console.log(`    status: ${r.status}`);
    console.log(`    aiAnalysisTriggered: ${r.aiAnalysisTriggered}`);
    if (r.aiAnalysis) {
      console.log(`    aiAnalysis: ${JSON.stringify(r.aiAnalysis)}`);
    }
    try {
      const desc = JSON.parse(r.description);
      console.log(`    title: ${desc.title}`);
      console.log(`    ratings: ${JSON.stringify(desc.ratings)}`);
      if (desc.aiAnalysis) {
        console.log(`    desc.aiAnalysis: ${JSON.stringify(desc.aiAnalysis)}`);
      }
    } catch {
      // not JSON description
    }
  });

  // Check service rating update
  const serviceSnap = await db.collection("services").doc(TEST_SERVICE_ID).get();
  if (serviceSnap.exists) {
    const svc = serviceSnap.data();
    console.log(`\nService rating: averageRating=${svc.averageRating}, reviewCount=${svc.reviewCount}`);
  }
}

async function cleanup() {
  console.log("\n--- Cleaning up test data ---");
  const batch = db.batch();

  batch.delete(db.collection("services").doc(TEST_SERVICE_ID));
  batch.delete(db.collection("bookings").doc(TEST_BOOKING_ID));
  batch.delete(db.collection("users").doc(TEST_UID));
  batch.delete(db.collection("users").doc(TEST_PROVIDER_ID));

  const reviewsSnap = await db.collection("reviews").where("bookingId", "==", TEST_BOOKING_ID).get();
  reviewsSnap.forEach((doc) => batch.delete(doc.ref));

  const reportsSnap = await db.collection("reports").get();
  reportsSnap.forEach((doc) => batch.delete(doc.ref));

  // Clean up reputations
  const repsSnap = await db.collection("reputations").get();
  repsSnap.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();
  await auth.deleteUser(TEST_UID).catch(() => {});
  console.log("Cleanup complete");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  try {
    await seedTestData();
    await callSubmitReview();

    // Immediate check (before trigger fires)
    await verifyFirestore("immediate");

    // Wait for Firestore trigger to fire and process
    console.log("\n--- Waiting 15s for Firestore trigger (analyzeNewReview) to fire ---");
    await sleep(15000);

    // Second check (after trigger should have fired)
    await verifyFirestore("after-trigger");

    await cleanup();
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
})();
