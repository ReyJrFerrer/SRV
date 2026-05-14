const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {
  getProvinces,
  getMunicipalities,
  getBarangays,
  findProvinceByMunicipality,
} = require("./phLocationData");

/**
 * Get all province names.
 */
exports.getProvinces = onCall(async (request) => {
  try {
    return {success: true, data: getProvinces()};
  } catch (error) {
    console.error("Error in getProvinces:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get municipality names for a given province.
 * @param {string} request.data.province
 */
exports.getMunicipalities = onCall(async (request) => {
  const data = request.data.data || request.data;
  const {province} = data;

  if (!province) {
    throw new HttpsError("invalid-argument", "Province is required");
  }

  try {
    const result = getMunicipalities(province);
    return {success: true, data: result};
  } catch (error) {
    console.error("Error in getMunicipalities:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get barangay names for a given province + municipality.
 * @param {string} request.data.province
 * @param {string} request.data.municipality
 */
exports.getBarangays = onCall(async (request) => {
  const data = request.data.data || request.data;
  const {province, municipality} = data;

  if (!province || !municipality) {
    throw new HttpsError(
      "invalid-argument",
      "Province and municipality are required",
    );
  }

  try {
    const result = getBarangays(province, municipality);
    return {success: true, data: result};
  } catch (error) {
    console.error("Error in getBarangays:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Find which province contains a given municipality name.
 * @param {string} request.data.municipality
 */
exports.findProvinceByMunicipality = onCall(async (request) => {
  const data = request.data.data || request.data;
  const {municipality} = data;

  if (!municipality) {
    throw new HttpsError("invalid-argument", "Municipality name is required");
  }

  try {
    const result = findProvinceByMunicipality(municipality);
    return {success: true, data: result};
  } catch (error) {
    console.error("Error in findProvinceByMunicipality:", error);
    throw new HttpsError("internal", error.message);
  }
});
