import React, { useState, useEffect } from "react";
import { MapPinIcon } from "@heroicons/react/24/solid";

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

const getCityAndProvince = (address: any) => {
  // Try to get city/municipality
  let city =
    address.city ||
    address.town ||
    address.municipality ||
    address.village ||
    address.county ||
    address.state_district ||
    address.state ||
    address.region ||
    "";

  // Try to get province
  let province =
    address.province || address.state || address.region || address.county || "";

  // Special case for Baguio
  if (
    (province === "Cordillera Administrative Region" ||
      address.state === "Cordillera Administrative Region" ||
      address.region === "Cordillera Administrative Region") &&
    (city === "Baguio" || city === "Baguio City")
  ) {
    city = "Baguio City";
    province = "Benguet";
  }

  return { city, province };
};

const ServiceLocation: React.FC<ServiceLocationProps> = ({
  setFormData,
  validationErrors,
  formData,
}) => {
  const [displayAddress, setDisplayAddress] = useState<string>(
    "Detecting location...",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setDisplayAddress("Geolocation is not supported by your browser.");
      setError("Geolocation not supported");
      return;
    }

    setDisplayAddress("Detecting location...");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        )
          .then((res) => res.json())
          .then((data) => {
            if (data && data.address) {
              const { city, province } = getCityAndProvince(data.address);

              setDisplayAddress([city, province].filter(Boolean).join(", "));

              setFormData((prev: any) => ({
                ...prev,
                locationMunicipalityCity: city,
                locationProvince: province,
                locationLatitude: latitude.toString(),
                locationLongitude: longitude.toString(),
              }));
            } else {
              setDisplayAddress(
                `Lat: ${latitude}, Lon: ${longitude} (address not found)`,
              );
            }
          })
          .catch(() => {
            setDisplayAddress(
              `Lat: ${latitude}, Lon: ${longitude} (failed to fetch address)`,
            );
            setError("Failed to fetch address from OpenStreetMap.");
          });
      },
      (err) => {
        setDisplayAddress(
          "Location not shared. Please enable location access.",
        );
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [setFormData]);

  const hasGPSCoordinates =
    !!formData.locationLatitude && !!formData.locationLongitude;

  // Optionally, you can show a local message if location is still being detected
  const localLocationError = !hasGPSCoordinates
    ? "Still detecting your location, please wait"
    : undefined;

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

        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="flex w-full items-center gap-4 rounded-xl border border-blue-100 bg-white px-5 py-4 shadow-sm">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="mb-1 text-xs font-medium text-blue-500">
                Using Your Current Location
              </span>
              <span className="text-lg font-semibold break-words text-blue-900">
                {displayAddress}
              </span>
            </div>
          </div>
          {error && (
            <div className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {(validationErrors?.locationMunicipalityCity || localLocationError) && (
          <div className="mt-2 text-center text-sm text-red-600">
            {validationErrors?.locationMunicipalityCity || localLocationError}
          </div>
        )}
      </section>
    </div>
  );
};

export default ServiceLocation;
