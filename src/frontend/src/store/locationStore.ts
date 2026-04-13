import { create } from "zustand";
import { persist } from "zustand/middleware";
import { reverseGeocode } from "../utils/googleMapsGeocoding";

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

  // Google Maps API management
  mapsApiKey: string;
  mapsApiReady: boolean;
  mapsApiError: string | null;

  // Actions
  setLocation: (status: LocationStatus, location?: Location | null) => void;
  setAddress: (address: string, province: string) => void;
  setLocationLoading: (loading: boolean) => void;
  setAddressMode: (mode: "context" | "manual") => void;
  setDisplayAddress: (address: string) => void;
  setManualFields: (fields: ManualFields) => void;
  setMapsApiReady: (ready: boolean, error?: string | null) => void;
  requestLocation: (force?: boolean) => Promise<void>;
  clearLocation: () => void;
  initialize: () => Promise<void>;

  // Helper methods to get effective values based on mode
  getEffectiveProvince: () => string;
  getEffectiveAddress: () => string;
  // Handle permission denial from external permission check
  handlePermissionDenied: () => void;
}

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
      displayAddress: "",
      manualFields: {
        barangay: "",
        street: "",
        houseNumber: "",
        landmark: "",
        municipality: "",
        province: "",
      },
      mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
      mapsApiReady: false,
      mapsApiError: null,

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

      setMapsApiReady: (ready: boolean, error: string | null = null) => {
        set({ mapsApiReady: ready, mapsApiError: error });
      },

      requestLocation: async (force: boolean = false) => {
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
        // unless the caller explicitly requests a forced refresh.
        if (
          !force &&
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

            set({
              location: newLocation,
              locationStatus: "allowed",
              locationLoading: false, // Location acquired, maps can work
              addressMode: "context", // Switch to automatic mode when GPS is enabled
            });
            localStorage.setItem("userLocation", JSON.stringify(newLocation));
            localStorage.setItem("locationPermission", "allowed");

            const cacheKey = `address_${latitude}_${longitude}`;
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
              try {
                const { address, province } = JSON.parse(cached);
                set({
                  userAddress: address,
                  userProvince: province,
                });
                return;
              } catch {
                // Continue to fetch if cache is invalid
              }
            }

            // Fetch address in background using Google Maps geocoding
            try {
              const result = await reverseGeocode(latitude, longitude);

              set({
                userAddress: result.locality,
                userProvince: result.province,
              });
              // Cache the result
              localStorage.setItem(
                cacheKey,
                JSON.stringify({
                  address: result.locality,
                  province: result.province,
                }),
              );
            } catch {
              set({
                userAddress: "Failed to resolve address",
                userProvince: "",
              });
            }
          },
          (error) => {
            // When permission is denied, clear old location data so modal will appear
            if (error.code === error.PERMISSION_DENIED) {
              set({
                locationStatus: "denied",
                userAddress: "",
                userProvince: "",
                addressMode: "context", // Reset to context mode
                locationLoading: false,
                location: null,
              });
              localStorage.setItem("locationPermission", "denied");
              localStorage.removeItem("userLocation");
              // Clear modal suppression flag so it can appear again
              try {
                localStorage.removeItem("loc_block_modal_suppress");
              } catch {}
            } else {
              set({
                locationStatus: "denied",
                userAddress: "",
                userProvince: "",
                addressMode: "context",
                locationLoading: false,
                location: null,
              });
              localStorage.removeItem("userLocation");
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

        // Check live permission status first
        let isDenied = false;
        try {
          if (
            typeof navigator !== "undefined" &&
            (navigator as any).permissions
          ) {
            const p = await (navigator as any).permissions.query({
              name: "geolocation",
            });
            if (p.state === "denied") {
              isDenied = true;
            }
          }
        } catch {}

        // If explicitly denied in browser, override any stored "allowed" state
        if (isDenied) {
          // If in manual mode with valid location, preserve it
          if (
            state.addressMode === "manual" &&
            state.userAddress &&
            state.userProvince
          ) {
            set({
              locationStatus: "denied",
              isInitialized: true,
              location: null,
            });
          } else {
            set({
              locationStatus: "denied",
              userAddress: "",
              userProvince: "",
              addressMode: "context",
              isInitialized: true,
              location: null,
            });
          }
          localStorage.setItem("locationPermission", "denied");
          localStorage.removeItem("userLocation");
          return;
        }

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
      },

      // Helper methods to get effective values based on current mode
      getEffectiveProvince: () => {
        const state = get();
        // In manual mode, use manual fields; otherwise use automatic location
        if (state.addressMode === "manual") {
          return state.manualFields.province || "";
        }
        return state.userProvince;
      },

      getEffectiveAddress: () => {
        const state = get();
        if (state.addressMode === "manual") {
          return state.manualFields.municipality || state.userAddress;
        }
        return state.userAddress;
      },

      // Handle permission denial detected by Permissions API
      handlePermissionDenied: () => {
        const currentMode = get().addressMode;
        // Only clear if in context (GPS) mode; preserve manual location
        if (currentMode === "context") {
          set({
            locationStatus: "denied",
            userAddress: "",
            userProvince: "",
            locationLoading: false,
            location: null,
          });
          localStorage.removeItem("userLocation");
        } else {
          // In manual mode, just update the status
          set({
            locationStatus: "denied",
            locationLoading: false,
            location: null,
          });
          localStorage.removeItem("userLocation");
        }
        localStorage.setItem("locationPermission", "denied");
        // Clear modal suppression flags so modal can appear
        try {
          localStorage.removeItem("loc_block_modal_suppress");
          sessionStorage.removeItem("dismissedLocationBlock");
        } catch {}
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
