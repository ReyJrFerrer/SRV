/**
 * PH Locations Cloud Functions
 *
 * This module handles all Philippine location data operations
 * (provinces, municipalities, barangays).
 * All data is loaded once per instance and served from memory.
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {
  getProvinces: getProvincesData,
  getMunicipalities: getMunicipalitiesData,
  getBarangays: getBarangaysData,
  findProvinceByMunicipality: findProvinceByMunicipalityData,
} = require("./phLocationData");

// ============================================================================
// SERVICE LAYER FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Returns all provinces.
 * @return {Promise<Array>} Array of province objects.
 */
async function getProvincesService() {
  return getProvincesData();
}

/**
 * Returns municipalities for a given province.
 * @param {Object} data The request payload.
 * @param {string} data.province The province name.
 * @return {Promise<Array>} Array of municipality objects.
 */
async function getMunicipalitiesService(data) {
  const {province} = data;

  if (!province) {
    throw new HttpsError("invalid-argument", "Province is required");
  }

  return getMunicipalitiesData(province);
}

/**
 * Returns barangays for a given province and municipality.
 * @param {Object} data The request payload.
 * @param {string} data.province The province name.
 * @param {string} data.municipality The municipality name.
 * @return {Promise<Array>} Array of barangay objects.
 */
async function getBarangaysService(data) {
  const {province, municipality} = data;

  if (!province || !municipality) {
    throw new HttpsError(
      "invalid-argument",
      "Province and municipality are required",
    );
  }

  return getBarangaysData(province, municipality);
}

/**
 * Finds a province by a municipality name.
 * @param {Object} data The request payload.
 * @param {string} data.municipality The municipality name.
 * @return {Promise<Object|null>} The province object or null.
 */
async function findProvinceByMunicipalityService(data) {
  const {municipality} = data;

  if (!municipality) {
    throw new HttpsError("invalid-argument", "Municipality name is required");
  }

  return findProvinceByMunicipalityData(municipality);
}

// ============================================================================
// TRANSPORT LAYER: SINGLE CONSOLIDATED ENTRYPOINT
// ============================================================================

exports.phLocationsAction = onCall(
  {
    memory: "256MiB",
    concurrency: 80,
    maxInstances: 50,
  },
  async (request) => {
    const {action, payload} = request.data || {};

    if (!action) {
      throw new HttpsError("invalid-argument", "An action must be specified.");
    }

    try {
      switch (action) {
      case "getProvinces":
        return {success: true, data: await getProvincesService()};
      case "getMunicipalities":
        return {success: true, data: await getMunicipalitiesService(payload)};
      case "getBarangays":
        return {success: true, data: await getBarangaysService(payload)};
      case "findProvinceByMunicipality":
        return {success: true, data: await findProvinceByMunicipalityService(payload)};
      default:
        throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing action [${action}]:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Internal Server Error");
    }
  },
);
