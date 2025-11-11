import React, { useState, useEffect } from "react";
import { MapPinIcon } from "@heroicons/react/24/solid";
import phLocations from "../../../data/ph_locations.json"; // Adjust path as needed
import { useLocationStore } from "../../../store/locationStore";

interface ServiceLocationProps {
  formData: {
    locationMunicipalityCity: string;
    locationProvince: string;
    [key: string]: unknown;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  validationErrors?: {
    locationMunicipalityCity?: string;
  };
}

const ServiceLocation: React.FC<ServiceLocationProps> = ({
  setFormData,
  validationErrors: _validationErrors,
  formData,
}) => {
  // Use Zustand location store
  const {
    location: geoLocation,
    userAddress,
    userProvince,
    locationLoading,
    locationStatus,
    requestLocation,
  } = useLocationStore();

  // New: location input mode
  const [locationInputMode, setLocationInputMode] = useState<
    "detected" | "manual"
  >("detected");

  // Google Maps Geocoding integration (prefer Google over OSM-style resolution from store)
  const mapsApiKey =
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "REPLACE_WITH_KEY";
  const [mapsApiLoaded, setMapsApiLoaded] = useState<boolean>(false);
  const [gmapsStatus, setGmapsStatus] = useState<
    "idle" | "loading" | "ok" | "failed"
  >("idle");
  const [gmapsAddress, setGmapsAddress] = useState<string>("");
  const [gmapsCity, setGmapsCity] = useState<string>("");
  const [gmapsProvince, setGmapsProvince] = useState<string>("");

  // Auto-switch to manual mode if location is blocked
  useEffect(() => {
    if (locationStatus === "denied") {
      setLocationInputMode("manual");
    }
  }, [locationStatus]);
  const [manualProvince, setManualProvince] = useState<string>("");
  const [manualCity, setManualCity] = useState<string>("");
  const [manualCityOptions, setManualCityOptions] = useState<string[]>([]);

  // Handle province dropdown change
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const province = e.target.value;
    setManualProvince(province);
    setManualCity("");
    setFormData((prev: any) => ({
      ...prev,
      locationProvince: province,
      locationMunicipalityCity: "",
    }));
    // Find province in phLocations
    let provinceObj;
    if (phLocations && Array.isArray(phLocations.provinces)) {
      provinceObj = phLocations.provinces.find(
        (prov: any) => prov.name === province,
      );
    }
    if (provinceObj && Array.isArray(provinceObj.municipalities)) {
      setManualCityOptions(provinceObj.municipalities.map((m: any) => m.name));
    } else {
      setManualCityOptions([]);
    }
  };

  // Handle city dropdown change
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    setManualCity(city);
    setFormData((prev: any) => ({
      ...prev,
      locationMunicipalityCity: city,
    }));
  };

  // Initialize location on component mount if using detected mode
  useEffect(() => {
    if (locationInputMode === "detected") {
      requestLocation();
    }
  }, [locationInputMode, requestLocation]);

  // Load Google Maps JS API if not present
  useEffect(() => {
    if (locationStatus === "denied") return; // no need to load if blocked

    const isReady = !!(window as any)?.google?.maps;
    if (isReady) {
      setMapsApiLoaded(true);
      return;
    }

    const existing = document.getElementById("gmaps-js");
    if (existing) {
      existing.addEventListener("load", () => setMapsApiLoaded(true), {
        once: true,
      } as any);
      return;
    }

    if (mapsApiKey && mapsApiKey !== "REPLACE_WITH_KEY") {
      const s = document.createElement("script");
      s.id = "gmaps-js";
      s.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}`;
      s.async = true;
      s.defer = true;
      s.onload = () => setMapsApiLoaded(true);
      s.onerror = () => setMapsApiLoaded(false);
      document.head.appendChild(s);
    }
  }, [mapsApiKey, locationStatus]);

  // Reset geocoding state when coordinates or mode change
  useEffect(() => {
    setGmapsStatus("idle");
    setGmapsAddress("");
    setGmapsCity("");
    setGmapsProvince("");
  }, [locationInputMode, geoLocation?.latitude, geoLocation?.longitude]);

  // Use Google Maps Geocoder to resolve city and province only
  useEffect(() => {
    if (
      locationInputMode !== "detected" ||
      !mapsApiLoaded ||
      !geoLocation ||
      gmapsStatus !== "idle"
    )
      return;

    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      setGmapsStatus("loading");
      geocoder.geocode(
        {
          location: {
            lat: geoLocation.latitude,
            lng: geoLocation.longitude,
          },
        },
        (results: any, status: string) => {
          if (status === "OK" && results && results[0]) {
            const primaryComps = results[0].address_components || [];

            // Find a component in a single result's components
            const findIn = (comps: any[], type: string) => {
              const c = comps.find(
                (cc: any) => cc.types && cc.types.indexOf(type) !== -1,
              );
              return c ? c.long_name : undefined;
            };
            // Some Google responses omit level_2 in the first result; search across all
            const findAcross = (type: string) => {
              for (const r of results) {
                const val = findIn(r.address_components || [], type);
                if (val) return val;
              }
              return undefined;
            };

            const locality =
              findIn(primaryComps, "locality") ||
              findAcross("locality") ||
              findIn(primaryComps, "postal_town") ||
              findAcross("postal_town") ||
              findIn(primaryComps, "administrative_area_level_3") ||
              findAcross("administrative_area_level_3") ||
              findIn(primaryComps, "administrative_area_level_2") ||
              findAcross("administrative_area_level_2");

            // Prefer province-level (admin_level_2); fall back to region (level_1) only if needed
            let province =
              findIn(primaryComps, "administrative_area_level_2") ||
              findAcross("administrative_area_level_2") ||
              findIn(primaryComps, "administrative_area_level_1") ||
              findAcross("administrative_area_level_1");

            // If province resolved to a Region (e.g., "Ilocos Region"), try to infer via dataset by locality
            const looksLikeRegion = (name?: string) =>
              !!name && /region/i.test(name);

            if (!province || looksLikeRegion(province)) {
              try {
                const ph = phLocations as any;
                if (locality && ph?.provinces && Array.isArray(ph.provinces)) {
                  const match = ph.provinces.find(
                    (p: any) =>
                      Array.isArray(p.municipalities) &&
                      p.municipalities.some(
                        (m: any) =>
                          typeof m?.name === "string" &&
                          m.name.toLowerCase() ===
                            String(locality).toLowerCase(),
                      ),
                  );
                  if (match?.name) {
                    province = match.name;
                  }
                }
                // Special-case normalization: Baguio -> Benguet
                if (
                  locality &&
                  ["baguio", "baguio city"].includes(locality.toLowerCase())
                ) {
                  province = "Benguet";
                }
              } catch {}
            }

            // For this page: display only City/Municipality and Province
            const displayCityProv = [locality, province]
              .filter(Boolean)
              .join(", ");

            setGmapsAddress(displayCityProv);
            setGmapsCity(locality || "");
            setGmapsProvince(province || "");
            setGmapsStatus("ok");
          } else {
            setGmapsStatus("failed");
            setGmapsAddress("Unable to resolve address");
          }
        },
      );
    } catch {
      setGmapsStatus("failed");
      setGmapsAddress("Reverse geocode failed");
    }
  }, [locationInputMode, mapsApiLoaded, geoLocation, gmapsStatus]);

  // Update form data when location changes (prefer Google geocode results)
  useEffect(() => {
    if (
      locationInputMode === "detected" &&
      geoLocation &&
      gmapsStatus === "ok" &&
      (gmapsCity || userAddress) &&
      (gmapsProvince || userProvince)
    ) {
      setFormData((prev: any) => ({
        ...prev,
        locationMunicipalityCity: gmapsCity || userAddress,
        locationProvince: gmapsProvince || userProvince,
        locationLatitude: geoLocation.latitude.toString(),
        locationLongitude: geoLocation.longitude.toString(),
      }));
      return;
    }

    if (
      locationInputMode === "detected" &&
      geoLocation &&
      userAddress &&
      userProvince &&
      gmapsStatus !== "ok"
    ) {
      setFormData((prev: any) => ({
        ...prev,
        locationMunicipalityCity: userAddress,
        locationProvince: userProvince,
        locationLatitude: geoLocation.latitude.toString(),
        locationLongitude: geoLocation.longitude.toString(),
      }));
    }
  }, [
    locationInputMode,
    geoLocation,
    userAddress,
    userProvince,
    gmapsStatus,
    gmapsCity,
    gmapsProvince,
    setFormData,
  ]);

  const hasGPSCoordinates =
    !!formData.locationLatitude && !!formData.locationLongitude;

  const _localLocationError =
    locationInputMode === "detected" &&
    !hasGPSCoordinates &&
    locationStatus === "denied"
      ? "Location access denied. Please enable location access or choose a different location."
      : locationInputMode === "detected" && locationLoading
        ? undefined // Don't show error while loading
        : locationInputMode === "detected" && !hasGPSCoordinates
          ? "Still detecting your location, please wait"
          : undefined;

  // Get display text for detected location
  const getDisplayAddress = () => {
    if (locationInputMode !== "detected") return "";

    if (locationLoading) {
      return "Detecting location...";
    }

    // Prefer Google Maps derived address if available
    if (mapsApiLoaded && gmapsStatus === "ok" && gmapsAddress) {
      return gmapsAddress;
    }

    if (userAddress && userProvince) {
      return `${userAddress}, ${userProvince}`;
    }

    if (gmapsStatus === "loading") {
      return "Detecting location...";
    }

    // Do not show lat/lon on this page; we only display City, Province
    if (geoLocation) return "City/Province not found";

    return "Detecting location...";
  };

  return (
    <div className="mx-auto max-w-xl space-y-8 p-4">
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-2">
          <MapPinIcon className="md:h-8 md:w-8 h-5 w-5 text-blue-600" />
          <h3 className="text-md font-bold text-blue-800 md:text-2xl">
            Service Location
            <span className="ml-1 text-base text-red-500">*</span>
          </h3>
        </div>

        {/* Location mode toggle */}
        <div className="mb-6 flex gap-4">
          <button
            type="button"
            className={`rounded-lg border px-4 py-2 font-semibold ${
              locationInputMode === "detected"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-blue-300 bg-white text-blue-700"
            }`}
            onClick={() => setLocationInputMode("detected")}
          >
            Use My Current Location
          </button>
          <button
            type="button"
            className={`rounded-lg border px-4 py-2 font-semibold ${
              locationInputMode === "manual"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-blue-300 bg-white text-blue-700"
            }`}
            onClick={() => setLocationInputMode("manual")}
          >
            Choose a Different Location
          </button>
        </div>

        {/* Detected location */}
        {locationInputMode === "detected" && (
          <div className="mb-6 flex flex-col items-center justify-center">
            <div className="flex w-full items-center gap-4 rounded-xl border border-blue-100 bg-white px-5 py-4 shadow-sm">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="mb-1 text-xs font-medium text-blue-500">
                  Using Your Current Location
                </span>
                <span className="text-lg font-semibold break-words text-blue-900">
                  {getDisplayAddress()}
                </span>
              </div>
            </div>
            {(locationStatus === "denied" ||
              (locationInputMode === "detected" &&
                !locationLoading &&
                !userAddress &&
                gmapsStatus !== "ok")) && (
              <div className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-700">
                {locationStatus === "denied"
                  ? "Location access denied. Please enable location access or choose a different location."
                  : "Failed to detect your location. Please try again or choose a different location."}
              </div>
            )}
          </div>
        )}

        {/* Manual location selection */}
        {locationInputMode === "manual" && (
          <div className="mb-6 flex w-full flex-col items-center justify-center">
            <div className="flex w-full flex-col gap-4">
              <label className="text-sm font-medium text-blue-700">
                Province
                <span className="ml-1 text-red-500">*</span>
              </label>
              <select
                className="rounded-md border border-blue-300 px-3 py-2"
                value={manualProvince}
                onChange={handleProvinceChange}
              >
                <option value="">Select Province</option>
                {phLocations &&
                  Array.isArray(phLocations.provinces) &&
                  phLocations.provinces.map((prov: any) => (
                    <option key={prov.name} value={prov.name}>
                      {prov.name}
                    </option>
                  ))}
              </select>

              <label className="text-sm font-medium text-blue-700">
                City / Municipality
                <span className="ml-1 text-red-500">*</span>
              </label>
              <select
                className="rounded-md border border-blue-300 px-3 py-2"
                value={manualCity}
                onChange={handleCityChange}
                disabled={!manualProvince}
              >
                <option value="">Select City / Municipality</option>
                {manualCityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {(_validationErrors?.locationMunicipalityCity ||
          _localLocationError) && (
          <div className="mt-2 text-center text-sm text-red-600">
            {_validationErrors?.locationMunicipalityCity || _localLocationError}
          </div>
        )}
      </section>
    </div>
  );
};

export default ServiceLocation;
