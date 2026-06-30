/**
 * One-time backfill script for the online-services migration.
 *
 * Adds the 4 new Service fields (`serviceMode`, `negotiable`,
 * `allowsMilestones`, `onlineDeliveryFormat`) and the ServicePackage
 * `type` field to every existing record, with sensible defaults.
 *
 * Run once after deploying the Phase 1 schema and the
 * `validateServiceMode` validation rules. Idempotent: re-running on
 * already-backfilled records is a no-op.
 *
 * Usage:
 *   node scripts/backfillOnlineServiceFields.js
 *
 * Or against the Firestore emulator:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   GCLOUD_PROJECT=srve-7133d \
 *   node scripts/backfillOnlineServiceFields.js
 */

const admin = require("firebase-admin");

const DEFAULT_SERVICE_MODE = "InPerson";
const DEFAULT_NEGOTIABLE = false;
const DEFAULT_ALLOWS_MILESTONES = false;
const DEFAULT_ONLINE_DELIVERY_FORMAT = null;
const DEFAULT_PACKAGE_TYPE = "Fixed";

const BATCH_SIZE = 500;

function initAdmin() {
  if (admin.apps.length) return;
  const projectId = process.env.GCLOUD_PROJECT || "srve-7133d";
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({projectId});
    admin.firestore().settings({
      host: process.env.FIRESTORE_EMULATOR_HOST,
      ssl: false,
    });
  } else {
    admin.initializeApp({projectId});
  }
}

/**
 * Backfill all service docs that are missing the new online-service fields.
 * @param {FirebaseFirestore.Firestore} db
 * @return {Promise<{scanned: number, updated: number}>}
 */
async function backfillServices(db) {
  const snap = await db.collection("services").get();
  let updated = 0;
  let batch = db.batch();
  let pending = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const patch = {};
    if (data.serviceMode === undefined) patch.serviceMode = DEFAULT_SERVICE_MODE;
    if (data.negotiable === undefined) patch.negotiable = DEFAULT_NEGOTIABLE;
    if (data.allowsMilestones === undefined) patch.allowsMilestones = DEFAULT_ALLOWS_MILESTONES;
    if (data.onlineDeliveryFormat === undefined) {
      patch.onlineDeliveryFormat = DEFAULT_ONLINE_DELIVERY_FORMAT;
    }
    if (Object.keys(patch).length === 0) continue;
    patch.updatedAt = new Date().toISOString();
    batch.update(doc.ref, patch);
    pending += 1;
    updated += 1;
    if (pending >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();
  return {scanned: snap.size, updated};
}

/**
 * Backfill all service_packages docs that are missing the `type` field.
 * @param {FirebaseFirestore.Firestore} db
 * @return {Promise<{scanned: number, updated: number}>}
 */
async function backfillPackages(db) {
  const snap = await db.collection("service_packages").get();
  let updated = 0;
  let batch = db.batch();
  let pending = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.type !== undefined) continue;
    batch.update(doc.ref, {
      type: DEFAULT_PACKAGE_TYPE,
      updatedAt: new Date().toISOString(),
    });
    pending += 1;
    updated += 1;
    if (pending >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();
  return {scanned: snap.size, updated};
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  console.log("Backfilling online-service fields...");
  const services = await backfillServices(db);
  console.log(`  services:    scanned=${services.scanned} updated=${services.updated}`);
  const packages = await backfillPackages(db);
  console.log(`  packages:    scanned=${packages.scanned} updated=${packages.updated}`);
  console.log("Done.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}

module.exports = {backfillServices, backfillPackages};
