import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "../services/firebaseApp";

/**
 * PH Location Service
 *
 * Fetches Philippine location data (provinces, municipalities, barangays)
 * from Firebase Functions. All results are cached in-memory after first fetch
 * so subsequent calls return instantly.
 */

// Types
export interface MunicipalityType {
  name: string;
  barangays?: string[];
}
export interface ProvinceType {
  name: string;
  municipalities: MunicipalityType[];
}

// In-memory caches (module-level, persists for the session)
let provincesCache: string[] | null = null;
let provincesPromise: Promise<string[]> | null = null;
const municipalityCache = new Map<string, string[]>();
const barangayCache = new Map<string, string[]>();
const provinceByMuniCache = new Map<string, string | null>();

/**
 * Fetch all province names (cached).
 * Deduplicates concurrent calls.
 */
export async function fetchProvinces(): Promise<string[]> {
  if (provincesCache) return provincesCache;
  if (provincesPromise) return provincesPromise;

  provincesPromise = (async () => {
    const fn = httpsCallable(getFirebaseFunctions(), "phLocationsAction");
    const result = await fn({ action: "getProvinces", payload: {} });
    const data = (result.data as any).data as string[];
    provincesCache = data;
    provincesPromise = null;
    return data;
  })();

  return provincesPromise;
}

/**
 * Fetch municipality names for a province (cached).
 */
export async function fetchMunicipalities(province: string): Promise<string[]> {
  const cached = municipalityCache.get(province);
  if (cached) return cached;

  const fn = httpsCallable(getFirebaseFunctions(), "phLocationsAction");
  const result = await fn({
    action: "getMunicipalities",
    payload: { province },
  });
  const data = (result.data as any).data as string[];

  municipalityCache.set(province, data);
  return data;
}

/**
 * Fetch barangay names for a province + municipality (cached).
 */
export async function fetchBarangays(
  province: string,
  municipality: string,
): Promise<string[]> {
  const key = `${province}|${municipality}`;
  const cached = barangayCache.get(key);
  if (cached) return cached;

  const fn = httpsCallable(getFirebaseFunctions(), "phLocationsAction");
  const result = await fn({
    action: "getBarangays",
    payload: { province, municipality },
  });
  const data = (result.data as any).data as string[];

  barangayCache.set(key, data);
  return data;
}

/**
 * Find which province contains a given municipality name (cached).
 */
export async function findProvinceByMunicipality(
  municipalityName: string,
): Promise<string | null> {
  const cached = provinceByMuniCache.get(municipalityName);
  if (provinceByMuniCache.has(municipalityName)) return cached!;

  const fn = httpsCallable(getFirebaseFunctions(), "phLocationsAction");
  const result = await fn({
    action: "findProvinceByMunicipality",
    payload: { municipality: municipalityName },
  });
  const data = (result.data as any).data as string | null;

  provinceByMuniCache.set(municipalityName, data);
  return data;
}
