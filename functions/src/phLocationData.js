const path = require("path");

/**
 * In-memory indexes built once from ph-brgy-list.json on cold start.
 * All subsequent requests are O(1) Map lookups.
 */
let provincesIndex = null;
let municipalitiesIndex = null;
let provinceNames = null;

/**
 * Load and index the barangay list JSON. Runs once per instance lifecycle.
 */
function loadData() {
  if (provincesIndex) return;

  const data = require(path.join(__dirname, "../data/ph-brgy-list.json"));

  const provMap = new Map();
  const muniMap = new Map();
  const names = [];

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];

    if (!provMap.has(entry.province)) {
      provMap.set(entry.province, []);
      muniMap.set(entry.province, new Map());
      names.push(entry.province);
    }

    const provMunis = provMap.get(entry.province);
    const provMuniMap = muniMap.get(entry.province);

    if (!provMuniMap.has(entry.municipality)) {
      provMuniMap.set(entry.municipality, []);
      provMunis.push(entry.municipality);
    }

    provMuniMap.get(entry.municipality).push(entry.barangay);
  }

  provincesIndex = provMap;
  municipalitiesIndex = muniMap;
  provinceNames = names;
}

/**
 * Get all province names.
 * @return {string[]} Array of province names
 */
function getProvinces() {
  loadData();
  return provinceNames;
}

/**
 * Get municipality names for a province.
 * @param {string} province - The province name
 * @return {string[]} Array of municipality names
 */
function getMunicipalities(province) {
  loadData();
  return provincesIndex.get(province) || [];
}

/**
 * Get barangay names for a province + municipality.
 * @param {string} province - The province name
 * @param {string} municipality - The municipality name
 * @return {string[]} Array of barangay names
 */
function getBarangays(province, municipality) {
  loadData();
  const provMap = municipalitiesIndex.get(province);
  if (!provMap) return [];
  return provMap.get(municipality) || [];
}

/**
 * Find which province contains a given municipality name (case-insensitive).
 * @param {string} municipalityName - The municipality name to search for
 * @return {string|null} The province name if found, null otherwise
 */
function findProvinceByMunicipality(municipalityName) {
  loadData();
  const lower = municipalityName.toLowerCase();
  for (const [province, munis] of provincesIndex) {
    for (let i = 0; i < munis.length; i++) {
      if (munis[i].toLowerCase() === lower) {
        return province;
      }
    }
  }
  return null;
}

module.exports = {
  getProvinces,
  getMunicipalities,
  getBarangays,
  findProvinceByMunicipality,
};
