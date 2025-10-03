// Helper for PH locations JSON import and types
import phLocationsJson from "./ph_locations.json";

export interface MunicipalityType {
  name: string;
  barangays?: string[];
}
export interface ProvinceType {
  name: string;
  municipalities: MunicipalityType[];
}

export const phLocations: ProvinceType[] =
  (phLocationsJson as any).provinces || phLocationsJson.provinces;
