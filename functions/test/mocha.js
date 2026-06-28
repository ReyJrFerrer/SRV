/* eslint-env mocha */
const fs = require("fs");
const path = require("path");
const util = require("util");
const dotenv = require("dotenv");

dotenv.config({path: path.join(__dirname, "..", ".env.test")});

if (!process.env.GCLOUD_PROJECT) {
  process.env.GCLOUD_PROJECT = "srve-7133d";
}
if (!process.env.FUNCTIONS_EMULATOR) {
  process.env.FUNCTIONS_EMULATOR = "true";
}
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
}

/* Force SMTP connection failure so sendMail() errors appear in the log. */
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = "1";

const LOG_FILES = [
  "test-output.log",
  "test-output-booking.log",
  "test-output-service.log",
  "test-output-review.log",
];
for (const f of LOG_FILES) {
  fs.writeFileSync(path.join(__dirname, f), "", "utf-8");
}

let currentTest = "setup";
let currentLogFile = "test-output.log";

/**
 * Derive the log filename from the test's file path.
 * Falls back to "test-output.log" for unknown test files.
 * @param {string} filePath
 * @return {string}
 */
function logFileForTest(filePath) {
  if (!filePath) return "test-output.log";
  const base = path.basename(filePath);
  if (base.includes("booking.test")) return "test-output-booking.log";
  if (base.includes("service.test")) return "test-output-service.log";
  if (base.includes("review.test")) return "test-output-review.log";
  return "test-output.log";
}

beforeEach(function() {
  currentTest = this.currentTest.fullTitle();
  currentLogFile = logFileForTest(this.currentTest.file);
});

console.error = (...args) => {
  fs.appendFileSync(
    path.join(__dirname, currentLogFile),
    `[${currentTest}] ${new Date().toISOString()} ${util.format(...args)}\n`,
    "utf-8",
  );
};

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT,
    databaseURL: process.env.FIREBASE_DATABASE_URL ||
      `https://${process.env.GCLOUD_PROJECT}.asia-southeast1.firebasedatabase.app`,
    storageBucket: process.env.GCLOUD_PROJECT,
  });
}

const {getFirestore} = require("../firebase-admin");

const test = require("firebase-functions-test")({
  projectId: process.env.GCLOUD_PROJECT,
});

const db = getFirestore();

const COLLECTIONS_TO_CLEAR = [
  "bookings",
  "services",
  "service_packages",
  "users",
  "notifications",
  "reputations",
  "reports",
  "reviews",
  "providerReviews",
  "notificationFrequency",
  "chatEmailCooldowns",
  "providerLocations",
  "paymentAuditTrail",
  "pending_users",
  "categories",
  "media",
];

/**
 * Clear all known collections in the emulator between tests.
 * @return {Promise<void>}
 */
async function clearCollections() {
  for (const name of COLLECTIONS_TO_CLEAR) {
    const snapshot = await db.collection(name).get();
    if (snapshot.empty) continue;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

module.exports = {
  test,
  db,
  admin,
  clearCollections,
};
