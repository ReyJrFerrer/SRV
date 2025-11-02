import { create } from "zustand";
import { persist } from "zustand/middleware";
import phLocations from "../data/ph_locations.json";

export type LocationStatus = "not_set" | "allowed" | "denied" | "unsupported";

export interface Location {
  latitude: number;
  longitude: number;
  // Reported accuracy in meters (if available)
  accuracy?: number;
}

export interface ManualFields {
  barangay: string;
  street: string;
  houseNumber: string;
  landmark?: string;
  municipality?: string;
  province?: string;
}

interface LocationState {
  // Core location data
  location: Location | null;
  locationStatus: LocationStatus;
  userAddress: string;
  userProvince: string;

  // Loading states
  locationLoading: boolean;
  isInitialized: boolean;

  // Manual address fields
  addressMode: "context" | "manual";
  displayAddress: string;
  manualFields: ManualFields;

  // Actions
  setLocation: (status: LocationStatus, location?: Location | null) => void;
  setAddress: (address: string, province: string) => void;
  setLocationLoading: (loading: boolean) => void;
  setAddressMode: (mode: "context" | "manual") => void;
  setDisplayAddress: (address: string) => void;
  setManualFields: (fields: ManualFields) => void;
  requestLocation: () => Promise<void>;
  clearLocation: () => void;
  initialize: () => Promise<void>;
}

const fetchWithRetry = async (
  url: string,
  attempts: number = 3,
  delayMs: number = 1500,
): Promise<any> => {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      return await res.json();
    } catch (err) {
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw new Error("All fetch attempts failed");
};

const normalizeLocationData = (data: any) => {
  // Handle BigDataCloud API response format
  if (data?.city || data?.locality) {
    const cityPart = data.city || data.locality || "";
    let provinceVal = data.principalSubdivision || data.countryName || "";

    // Try to refine province for PH using localityInfo + known provinces
    try {
      const isPH = (data.countryName || "").toLowerCase() === "philippines";
      const admin = data.localityInfo?.administrative || [];
      if (isPH && Array.isArray(admin)) {
        const provinces: string[] = Array.isArray(
          (phLocations as any)?.provinces,
        )
          ? (phLocations as any).provinces.map((p: any) => p.name)
          : [];
        const match = admin.find((a: any) =>
          provinces.some(
            (prov) => a?.name?.toLowerCase?.() === prov.toLowerCase(),
          ),
        );
        if (match?.name) {
          provinceVal = match.name;
        }
      }
    } catch {
      // ignore refinement errors
    }

    // Special case: Baguio normalization
    if (
      (cityPart.toLowerCase() === "baguio" ||
        cityPart.toLowerCase() === "baguio city") &&
      (provinceVal.toLowerCase().includes("cordillera administrative region") ||
        provinceVal.toLowerCase().includes("car") ||
        provinceVal.toLowerCase() === "region")
    ) {
      return {
        address: "Baguio City",
        province: "Benguet",
      };
    }

    return {
      address: cityPart || "Could not determine city",
      province: provinceVal,
    };
  }

  // Handle Nominatim API response format (fallback)
  if (!data?.address) return null;

  const { city, town, village, municipality, county, state, region, province } =
    data.address;

  let cityPart = city || town || village || municipality || "";
  let provinceVal = county || state || region || province || "";

  // Special case: Baguio normalization
  if (
    (cityPart.toLowerCase() === "baguio" ||
      cityPart.toLowerCase() === "baguio city") &&
    (provinceVal.toLowerCase().includes("cordillera administrative region") ||
      provinceVal.toLowerCase().includes("car") ||
      provinceVal.toLowerCase() === "region")
  ) {
    cityPart = "Baguio City";
    provinceVal = "Benguet";
  }

  return {
    address: cityPart || "Could not determine city",
    province: provinceVal,
  };
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      // Initial state
      location: null,
      locationStatus: "not_set",
      userAddress: "",
      userProvince: "",
      locationLoading: false,
      isInitialized: false,
      addressMode: "context",
      displayAddress: "Detecting location...",
      manualFields: {
        barangay: "",
        street: "",
        houseNumber: "",
        landmark: "",
        municipality: "",
        province: "",
      },

      // Actions
      setLocation: (status: LocationStatus, newLocation?: Location | null) => {
        set({ locationStatus: status });

        if (newLocation) {
          set({ location: newLocation });
          // Store location in localStorage for persistence
          localStorage.setItem("userLocation", JSON.stringify(newLocation));
        } else if (status !== "allowed") {
          // Clear stored location if status is not allowed
          localStorage.removeItem("userLocation");
          set({ location: null });
        }

        // Store the permission status
        localStorage.setItem("locationPermission", status);
      },

      setAddress: (address: string, province: string) => {
        set({ userAddress: address, userProvince: province });
      },

      setLocationLoading: (loading: boolean) => {
        set({ locationLoading: loading });
      },

      setAddressMode: (mode: "context" | "manual") => {
        set({ addressMode: mode });
      },

      setDisplayAddress: (address: string) => {
        set({ displayAddress: address });
      },

      setManualFields: (fields: ManualFields) => {
        set({ manualFields: fields });
      },

      requestLocation: async () => {
        const state = get();
        // Even in manual mode, we still try to detect GPS so maps can work.
        // We will NOT overwrite manual address fields when addressMode === "manual".

        // Guard: avoid duplicate concurrent requests
        if (state.locationLoading) {
          return;
        }

        // Lightweight throttle: if permission is denied, avoid hammering the API repeatedly
        try {
          const now = Date.now();
          const lastAttempt = Number(
            localStorage.getItem("location_last_attempt") || 0,
          );
          if (
            state.locationStatus === "denied" &&
            now - lastAttempt < 10000 /* 10s */
          ) {
            return;
          }
          localStorage.setItem("location_last_attempt", String(now));
        } catch {
          // ignore throttle storage errors
        }

        // If we already have location data and it's not expired, don't refetch
        if (
          state.location &&
          state.userAddress &&
          state.locationStatus === "allowed"
        ) {
          return;
        }

        set({ locationLoading: true });

        if (!navigator.geolocation) {
          if (get().addressMode === "manual") {
            set({ locationStatus: "unsupported", locationLoading: false });
          } else {
            set({
              locationStatus: "unsupported",
              userAddress: "Geolocation not supported",
              userProvince: "",
              locationLoading: false,
            });
          }
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const newLocation: Location = { latitude, longitude, accuracy };

            // Check cache first
            const cacheKey = `address_${latitude}_${longitude}`;
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
              try {
                const { address, province } = JSON.parse(cached);
                if (get().addressMode === "manual") {
                  set({
                    location: newLocation,
                    locationStatus: "allowed",
                    locationLoading: false,
                  });
                } else {
                  set({
                    location: newLocation,
                    locationStatus: "allowed",
                    userAddress: address,
                    userProvince: province,
                    locationLoading: false,
                  });
                }
                localStorage.setItem(
                  "userLocation",
                  JSON.stringify(newLocation),
                );
                localStorage.setItem("locationPermission", "allowed");
                return;
              } catch {
                // Continue to fetch if cache is invalid
              }
            }

            try {
              // Use BigDataCloud's free reverse geocoding API (supports CORS)
              const data = await fetchWithRetry(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
              );

              const normalized = normalizeLocationData(data);

              if (normalized) {
                if (get().addressMode === "manual") {
                  set({
                    location: newLocation,
                    locationStatus: "allowed",
                    locationLoading: false,
                  });
                } else {
                  set({
                    location: newLocation,
                    locationStatus: "allowed",
                    userAddress: normalized.address,
                    userProvince: normalized.province,
                    locationLoading: false,
                  });
                }

                // Cache the result
                localStorage.setItem(cacheKey, JSON.stringify(normalized));
                localStorage.setItem(
                  "userLocation",
                  JSON.stringify(newLocation),
                );
                localStorage.setItem("locationPermission", "allowed");
              } else {
                set({
                  location: newLocation,
                  locationStatus: "allowed",
                  userAddress: "Could not determine city",
                  userProvince: "",
                  locationLoading: false,
                });
              }
            } catch (error) {
              if (get().addressMode === "manual") {
                set({
                  location: newLocation,
                  locationStatus: "allowed",
                  locationLoading: false,
                });
              } else {
                set({
                  location: newLocation,
                  locationStatus: "allowed",
                  userAddress: "Could not determine city",
                  userProvince: "",
                  locationLoading: false,
                });
              }
            }
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              if (get().addressMode === "manual") {
                set({ locationStatus: "denied", locationLoading: false });
              } else {
                set({
                  locationStatus: "denied",
                  userAddress: "Location not shared",
                  userProvince: "",
                  locationLoading: false,
                });
              }
              localStorage.setItem("locationPermission", "denied");
            } else {
              if (get().addressMode === "manual") {
                set({ locationStatus: "denied", locationLoading: false });
              } else {
                set({
                  locationStatus: "denied",
                  userAddress: "Could not determine location",
                  userProvince: "",
                  locationLoading: false,
                });
              }
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          },
        );
      },

      clearLocation: () => {
        set({
          location: null,
          locationStatus: "not_set",
          userAddress: "",
          userProvince: "",
          locationLoading: false,
        });
        localStorage.removeItem("userLocation");
        localStorage.removeItem("locationPermission");
      },

      initialize: async () => {
        const state = get();
        if (state.isInitialized) return;

        // Check for stored GPS location and permission first
        const storedLocation = localStorage.getItem("userLocation");
        const storedPermission = localStorage.getItem(
          "locationPermission",
        ) as LocationStatus;

        // If in manual mode, we still record stored permission
        // and allow GPS to initialize so the map can be used when permission is allowed.
        if (state.addressMode === "manual") {
          if (storedPermission) set({ locationStatus: storedPermission });
        }

        if (storedLocation && storedPermission === "allowed") {
          try {
            const location = JSON.parse(storedLocation);
            set({
              location,
              locationStatus: "allowed",
              isInitialized: true,
            });

            // If we have cached address data, use it
            const cacheKey = `address_${location.latitude}_${location.longitude}`;
            const cachedAddress = localStorage.getItem(cacheKey);
            if (cachedAddress) {
              try {
                const { address, province } = JSON.parse(cachedAddress);
                set({ userAddress: address, userProvince: province });
                return;
              } catch {
                // Continue to fetch if cache is invalid
              }
            }
          } catch {
            // If parsing fails, clear invalid data
            localStorage.removeItem("userLocation");
            localStorage.removeItem("locationPermission");
          }
        } else if (storedPermission) {
          set({ locationStatus: storedPermission, isInitialized: true });
        }

        set({ isInitialized: true });
        // Do not automatically request geolocation on initial app load.
        // Components/pages (e.g., headers) or post-login effect will explicitly call requestLocation().
      },
    }),
    {
      name: "location-storage",
      // Only persist essential data, not loading states
      partialize: (state: any) => ({
        location: state.location,
        locationStatus: state.locationStatus,
        userAddress: state.userAddress,
        userProvince: state.userProvince,
        addressMode: state.addressMode,
        displayAddress: state.displayAddress,
        manualFields: state.manualFields,
        isInitialized: state.isInitialized,
      }),
    },
  ),
);
