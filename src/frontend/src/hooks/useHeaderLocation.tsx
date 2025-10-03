// ...existing code...
import { useAuth } from "../context/AuthContext";

export interface HeaderManualFields {
  barangay: string;
  street: string;
  houseNumber: string;
  landmark?: string;
  municipality?: string;
  province?: string;
}

export interface HeaderLocationContext {
  headerLocation: any;
  headerLocationStatus: string | undefined;
  headerAddressMode: "context" | "manual";
  headerDisplayAddress: string;
  headerManualFields?: HeaderManualFields;
}

export function useHeaderLocation(): HeaderLocationContext {
  // Use AuthContext for location and status
  const {
    location,
    locationStatus,
    addressMode,
    displayAddress,
    manualFields,
  } = useAuth();

  return {
    headerLocation: location,
    headerLocationStatus: locationStatus,
    headerAddressMode: addressMode,
    headerDisplayAddress: displayAddress,
    headerManualFields: manualFields,
  };
}
