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
  validationErrors,
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

  // Update form data when Zustand location changes
  useEffect(() => {
    if (
      locationInputMode === "detected" &&
      geoLocation &&
      userAddress &&
      userProvince
    ) {
      setFormData((prev: any) => ({
        ...prev,
        locationMunicipalityCity: userAddress,
        locationProvince: userProvince,
        locationLatitude: geoLocation.latitude.toString(),
        locationLongitude: geoLocation.longitude.toString(),
      }));
    }
  }, [locationInputMode, geoLocation, userAddress, userProvince, setFormData]);

  const hasGPSCoordinates =
    !!formData.locationLatitude && !!formData.locationLongitude;

  const localLocationError =
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

    if (userAddress && userProvince) {
      return `${userAddress}, ${userProvince}`;
    }

    if (geoLocation) {
      return `Lat: ${geoLocation.latitude.toFixed(6)}, Lon: ${geoLocation.longitude.toFixed(6)} (address not found)`;
    }

    return "Detecting location...";
  };

  return (
    <div className="mx-auto max-w-xl space-y-8 p-4">
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <MapPinIcon className="h-8 w-8 text-blue-600" />
          <h3 className="text-2xl font-bold text-blue-800">
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
                <span className="break-words text-lg font-semibold text-blue-900">
                  {getDisplayAddress()}
                </span>
              </div>
            </div>
            {(locationStatus === "denied" ||
              (locationInputMode === "detected" &&
                !locationLoading &&
                !userAddress)) && (
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
        {/* 
        {(validationErrors?.locationMunicipalityCity || localLocationError) && (
          <div className="mt-2 text-center text-sm text-red-600">
            {validationErrors?.locationMunicipalityCity || localLocationError}
          </div>
        )} */}
      </section>
    </div>
  );
};

export default ServiceLocation;
