import React, { useEffect, Suspense } from "react";
import { useLocationStore } from "../../../store/locationStore";
const LocationMapPicker = React.lazy(
  () => import("../../common/GMapFunctions/LocationMapPicker"),
);
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import phLocations from "../../../data/ph_locations.json";
import EnableLocationButton from "../../common/locationAccessPermission/EnableLocationButton";
import AccuracyCircle from "../../common/GMapFunctions/AccuracyCircle";
import FullScreenLocationMapModal from "../../common/GMapFunctions/FullScreenLocationMapModal";
import {
  MapPinIcon,
  PencilSquareIcon,
  MapIcon,
} from "@heroicons/react/24/outline";

export type ServiceLocationProps = {
  highlight?: boolean;
  mapsReady: boolean;
  mapMode: "detected" | "custom";
  setMapMode: (m: "detected" | "custom") => void;
  showFallbackForms: boolean;
  setShowFallbackForms: (v: boolean) => void;

  geoLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  detectedStatus: "idle" | "loading" | "ok" | "failed" | "denied" | "na";
  detectedAddress: string;

  mapLocation: { lat: number; lng: number; address?: string } | null;
  setMapLocation: (loc: any) => void;
  mapPreciseAddress: string;
  setMapPreciseAddress: (s: string) => void;
  mapDisplayAddress: string;
  setMapDisplayAddress: (s: string) => void;

  locationInputMode: "detected" | "manual" | "hidden";
  setLocationInputMode: (m: "detected" | "manual" | "hidden") => void;

  displayMunicipality: string;
  displayProvince: string;

  barangayOptions: string[];
  selectedBarangay: string;
  setSelectedBarangay: (s: string) => void;
  otherBarangay: string;
  setOtherBarangay: (s: string) => void;
  street: string;
  setStreet: (s: string) => void;
  houseNumber: string;
  setHouseNumber: (s: string) => void;
  landmark: string;
  setLandmark: (s: string) => void;

  manualProvince: string;
  setManualProvince: (s: string) => void;
  manualCity: string;
  setManualCity: (s: string) => void;
  manualBarangayOptions: string[];

  highlightInput: string;
  barangayRef: React.Ref<HTMLSelectElement>;
  otherBarangayRef: React.Ref<HTMLInputElement>;
  streetRef: React.Ref<HTMLInputElement>;
  houseNumberRef: React.Ref<HTMLInputElement>;
};

const ServiceLocationSection: React.FC<ServiceLocationProps> = ({
  highlight = false,
  mapsReady,
  mapMode,
  setMapMode,
  showFallbackForms,
  setShowFallbackForms,
  geoLocation,
  locationLoading,
  detectedStatus,
  detectedAddress,
  mapLocation,
  setMapLocation,
  setMapPreciseAddress,
  setMapDisplayAddress,
  locationInputMode,
  setLocationInputMode,
  displayMunicipality,
  displayProvince,
  barangayOptions,
  selectedBarangay,
  setSelectedBarangay,
  otherBarangay,
  setOtherBarangay,
  street,
  setStreet,
  houseNumber,
  setHouseNumber,
  landmark,
  setLandmark,
  manualProvince,
  setManualProvince,
  manualCity,
  setManualCity,
  manualBarangayOptions,
  highlightInput,
  barangayRef,
  otherBarangayRef,
  streetRef,
  houseNumberRef,
}) => {
  const { locationStatus, location } = useLocationStore();
  const [showFullScreenMap, setShowFullScreenMap] = React.useState(false);

  useEffect(() => {
    if (locationStatus === "allowed") {
      setMapMode("custom"); // Force map to interactive mode automatically
      setLocationInputMode("hidden");
      setShowFallbackForms(false);
    } else if (locationStatus === "denied") {
      setShowFallbackForms(true);
      setLocationInputMode("manual");
    }
  }, [locationStatus, setMapMode, setLocationInputMode, setShowFallbackForms]);

  // Helpers
  const rawAccuracy = location?.accuracy;
  const scaledAccuracy =
    typeof rawAccuracy === "number" && rawAccuracy > 0
      ? Math.min(rawAccuracy * 0.25, 100)
      : undefined;

  // Remove plus-code / geocode tokens from addresses (e.g. "2CFX+WPX")
  const stripPlusCodes = (addr: string) => {
    if (!addr) return "";
    try {
      const plusCodeRegex = /^[A-Z0-9]{1,}\+[A-Z0-9]{1,}$/i;
      const parts = addr
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const filtered = parts.filter((p) => !plusCodeRegex.test(p));
      return filtered.join(", ").trim();
    } catch {
      return addr;
    }
  };
  const cleanedDetectedAddress = stripPlusCodes(detectedAddress || "");

  useEffect(() => {
    if (mapMode === "detected") {
      try {
        if (
          geoLocation &&
          typeof geoLocation.latitude === "number" &&
          typeof geoLocation.longitude === "number"
        ) {
          setMapLocation({
            lat: geoLocation.latitude,
            lng: geoLocation.longitude,
            address: cleanedDetectedAddress,
            formatted_address: cleanedDetectedAddress,
            __detected: true,
          });
        } else {
          setMapLocation(null);
        }
        if (cleanedDetectedAddress) {
          setMapPreciseAddress(cleanedDetectedAddress);
          setMapDisplayAddress(cleanedDetectedAddress);
        } else {
          setMapPreciseAddress("");
          setMapDisplayAddress("");
        }
      } catch {}
    }
  }, [
    mapMode,
    geoLocation,
    cleanedDetectedAddress,
    setMapLocation,
    setMapPreciseAddress,
    setMapDisplayAddress,
  ]);
  // Close modal on Escape key when open
  useEffect(() => {
    if (!showFullScreenMap) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setShowFullScreenMap(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showFullScreenMap]);
  return (
    <div
      className={`scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${
        highlight ? "border-2 border-red-500 ring-2 ring-red-200" : ""
      }`}
    >
      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
        <MapPinIcon className="h-6 w-6 text-blue-600" />
        <span>
          Service Location <span className="text-red-500">*</span>
        </span>
      </h3>

      {!showFallbackForms && locationStatus !== "denied" && (
        <div className="mb-4 flex flex-col gap-2 text-sm font-medium sm:flex-row sm:gap-3">
          <div
            onClick={() => setMapMode("custom")}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-200 ${
              mapMode === "custom"
                ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <MapIcon className="h-5 w-5 shrink-0" />
            <span>Pin / Search Location</span>
          </div>

          <div
            onClick={() => {
              setShowFallbackForms(true);
              setLocationInputMode(
                locationStatus === "allowed" ? "manual" : "detected",
              );
            }}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-gray-600 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
          >
            <PencilSquareIcon className="h-5 w-5 shrink-0" />
            <span>Use Manual Address</span>
          </div>
        </div>
      )}

      {/* Inline banner - only show when location is not yet set (not yet requested) */}
      {locationStatus === "not_set" && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
              <MapPinIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-gray-900">
                Enable location access
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                Allow location access for automatic detection, or use the manual
                address form below.
              </p>
            </div>
            <div className="shrink-0">
              <EnableLocationButton />
            </div>
          </div>
        </div>
      )}

      {/* Inline banner - location blocked by browser settings */}
      {locationStatus === "denied" && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
              <MapPinIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-gray-900">
                Location access is blocked
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                Enable location in your browser settings to use automatic
                detection, or use the manual address form below.
              </p>
            </div>
          </div>
        </div>
      )}

      {mapMode === "detected" && !showFallbackForms && (
        <div className="mb-2.5">
          <div className="mb-2 text-[11px] font-medium text-gray-600">
            Automatically detected via browser geolocation.
          </div>
          {locationStatus === "allowed" ? (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              {mapsReady && geoLocation ? (
                <Map
                  defaultCenter={{
                    lat: geoLocation.latitude,
                    lng: geoLocation.longitude,
                  }}
                  defaultZoom={16}
                  mapId="6922634ff75ae05ac38cc473"
                  style={{ width: "100%", height: 260 }}
                  disableDefaultUI={true}
                  zoomControl={true}
                  onClick={(e: any) => {
                    try {
                      if (
                        (e?.placeId || e?.detail?.placeId) &&
                        typeof e?.stop === "function"
                      ) {
                        e.stop();
                      }
                    } catch {}
                  }}
                >
                  <AdvancedMarker
                    position={{
                      lat: geoLocation.latitude,
                      lng: geoLocation.longitude,
                    }}
                  />
                  {/* Show a subtle accuracy circle around the detected location when available */}
                  {typeof scaledAccuracy === "number" && scaledAccuracy > 0 && (
                    <AccuracyCircle
                      center={{
                        lat: geoLocation.latitude,
                        lng: geoLocation.longitude,
                      }}
                      radius={scaledAccuracy}
                    />
                  )}
                </Map>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                  {locationLoading || detectedStatus === "loading"
                    ? "Detecting location..."
                    : "Map loading..."}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              Location permission is not enabled. Use the manual address form
              below or enable location.
              <div className="mt-2">
                <EnableLocationButton />
              </div>
            </div>
          )}
          <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
            {detectedStatus === "ok" && cleanedDetectedAddress
              ? cleanedDetectedAddress
              : detectedStatus === "failed"
                ? "Unable to resolve address. You can switch to Pin / Search."
                : detectedStatus === "loading" || locationLoading
                  ? "Resolving detected address..."
                  : !geoLocation
                    ? "Location not yet available."
                    : "Detected."}
          </div>
        </div>
      )}

      {mapMode === "custom" && !showFallbackForms && (
        <div className="mb-4">
          <Suspense
            fallback={
              <div className="flex h-72 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500">
                Loading map…
              </div>
            }
          >
            <LocationMapPicker
              value={
                mapLocation
                  ? { ...mapLocation, address: mapLocation.address ?? "" }
                  : geoLocation
                    ? {
                        lat: geoLocation.latitude,
                        lng: geoLocation.longitude,
                        address: cleanedDetectedAddress,
                      }
                    : null
              }
              onOpenFullScreen={() => setShowFullScreenMap(true)}
              onChange={(loc: any) => {
                // Clean plus-code tokens from the address before passing down
                const rawPrecise = loc.formatted_address || loc.address || "";
                const cleanedPrecise = stripPlusCodes(rawPrecise);

                const placeName = loc.rawName;
                let displayAddress = cleanedPrecise;
                if (placeName && !cleanedPrecise.startsWith(placeName)) {
                  displayAddress = `${placeName}, ${cleanedPrecise}`;
                }

                setMapLocation({
                  ...loc,
                  address: cleanedPrecise,
                  formatted_address: cleanedPrecise,
                });
                setMapPreciseAddress(cleanedPrecise);
                setMapDisplayAddress(displayAddress);
              }}
              persistKey="booking:lastLocation"
              highlight={highlight}
              label="Pin / Search Location"
            />
          </Suspense>
        </div>
      )}

      {showFallbackForms && locationStatus !== "denied" && (
        <div className="mb-4 flex flex-wrap gap-4">
          {locationStatus !== "allowed" && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="locationInputMode"
                value="detected"
                checked={locationInputMode === "detected"}
                onChange={() => setLocationInputMode("detected")}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-gray-700">Use Detected</span>
            </label>
          )}

          <label className="flex items-center gap-2 text-xs">
            <input
              type="radio"
              name="locationInputMode"
              value="manual"
              checked={locationInputMode === "manual"}
              onChange={() => setLocationInputMode("manual")}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-gray-700">Choose City/Province</span>
          </label>

          <button
            type="button"
            onClick={() => {
              setShowFallbackForms(false);
              setLocationInputMode("hidden");
            }}
            className="gapx-5 flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95 sm:w-auto md:w-full lg:ml-auto lg:w-fit"
          >
            <MapPinIcon className="h-5 w-5 shrink-0" />
            <span>Use Maps</span>
          </button>
        </div>
      )}

      {showFallbackForms &&
        locationStatus !== "denied" &&
        locationInputMode === "detected" && (
          <div className="mt-2 space-y-3">
            <p className="text-xs text-gray-600">
              Your location is automatically detected.
            </p>
            <div className="mb-3 w-full rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-blue-700">
                    Municipality/City
                  </label>
                  <input
                    type="text"
                    value={displayMunicipality || ""}
                    readOnly
                    className="w-full border-none bg-blue-50 font-semibold capitalize text-blue-900"
                    placeholder="Municipality/City"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-blue-700">
                    Province
                  </label>
                  <input
                    type="text"
                    value={displayProvince || ""}
                    readOnly
                    className="w-full border-none bg-blue-50 font-semibold capitalize text-blue-900"
                    placeholder="Province"
                  />
                </div>
              </div>
            </div>
            <select
              ref={barangayRef}
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className={`w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize ${
                highlightInput === "barangay"
                  ? "border-2 border-red-500 ring-2 ring-red-200"
                  : ""
              }`}
            >
              <option value="" disabled>
                Select Barangay *
              </option>
              {barangayOptions
                .filter(
                  (b) =>
                    b &&
                    b.trim().toLowerCase().replace(/\s+/g, "") !== "others",
                )
                .map((barangay, idx) => (
                  <option key={idx} value={barangay}>
                    {barangay}
                  </option>
                ))}
              <option value="__other__">Others</option>
            </select>
            {selectedBarangay === "__other__" && (
              <input
                ref={otherBarangayRef}
                type="text"
                placeholder="Enter your Barangay *"
                value={otherBarangay}
                onChange={(e) => setOtherBarangay(e.target.value)}
                className={`w-full rounded-xl border bg-white p-3 text-sm capitalize text-gray-700 ${
                  highlightInput === "otherBarangay" ||
                  (otherBarangay &&
                    (otherBarangay.trim().length < 3 ||
                      otherBarangay.trim().length > 20))
                    ? "border-2 border-red-500 ring-2 ring-red-200"
                    : "border-blue-400"
                }`}
                minLength={3}
                maxLength={20}
                required
              />
            )}
            <input
              ref={streetRef}
              type="text"
              placeholder="Street Name *"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={`w-full rounded-xl border p-3 text-sm capitalize transition-colors ${
                !selectedBarangay
                  ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
                  : "border-gray-300 bg-white text-gray-700"
              } ${
                highlightInput === "street" ||
                (street &&
                  (street.trim().length < 3 || street.trim().length > 20))
                  ? "border-2 border-red-500 ring-2 ring-red-200"
                  : ""
              }`}
              disabled={!selectedBarangay}
              minLength={3}
              maxLength={20}
            />
            <input
              ref={houseNumberRef}
              type="text"
              placeholder="House/Unit No. *"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className={`w-full rounded-xl border p-3 text-sm capitalize transition-colors ${
                !street
                  ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
                  : "border-gray-300 bg-white text-gray-700"
              } ${
                highlightInput === "houseNumber" ||
                (houseNumber &&
                  (houseNumber.length > 15 || !/\d/.test(houseNumber)))
                  ? "border-2 border-red-500 ring-2 ring-red-200"
                  : ""
              }`}
              disabled={!street}
              maxLength={15}
            />
            <input
              type="text"
              placeholder="Building / Subdivision / Sitio / etc. (optional)"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize"
            />
          </div>
        )}

      {showFallbackForms &&
        (locationStatus === "denied" || locationInputMode === "manual") && (
          <div className="mt-2 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-2 block text-xs text-blue-700">
                  Province *
                </label>
                <select
                  value={manualProvince}
                  onChange={(e) => {
                    setManualProvince(e.target.value);
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize"
                >
                  <option value="" disabled>
                    Select Province
                  </option>
                  {phLocations &&
                    Array.isArray((phLocations as any).provinces) &&
                    (phLocations as any).provinces.map((prov: any) => (
                      <option key={prov.name} value={prov.name}>
                        {prov.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-2 block text-xs text-blue-700">
                  City/Municipality *
                </label>
                <select
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize"
                  disabled={!manualProvince}
                >
                  <option value="" disabled>
                    Select City/Municipality
                  </option>
                  {manualProvince &&
                    phLocations &&
                    Array.isArray((phLocations as any).provinces) &&
                    (() => {
                      const prov = (phLocations as any).provinces.find(
                        (p: any) => p.name === manualProvince,
                      );
                      if (prov && Array.isArray(prov.municipalities)) {
                        return prov.municipalities.map((m: any) => (
                          <option key={m.name} value={m.name}>
                            {m.name}
                          </option>
                        ));
                      }
                      return null;
                    })()}
                </select>
              </div>
            </div>
            <select
              ref={barangayRef}
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className={`w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize ${
                highlightInput === "barangay"
                  ? "border-2 border-red-500 ring-2 ring-red-200"
                  : ""
              }`}
              disabled={!manualCity}
            >
              <option value="" disabled>
                Select Barangay *
              </option>
              {manualBarangayOptions.map((barangay, idx) => (
                <option key={idx} value={barangay}>
                  {barangay}
                </option>
              ))}
              <option value="__other__">Others</option>
            </select>
            {selectedBarangay === "__other__" && (
              <input
                ref={otherBarangayRef}
                type="text"
                placeholder="Enter your Barangay *"
                value={otherBarangay}
                onChange={(e) => setOtherBarangay(e.target.value)}
                className={`w-full rounded-xl border bg-white p-3 text-sm capitalize text-gray-700 ${
                  highlightInput === "otherBarangay" ||
                  (otherBarangay &&
                    (otherBarangay.trim().length < 3 ||
                      otherBarangay.trim().length > 20))
                    ? "border-2 border-red-500 ring-2 ring-red-200"
                    : "border-blue-400"
                }`}
                minLength={3}
                maxLength={20}
                required
              />
            )}
            <input
              ref={streetRef}
              type="text"
              placeholder="Street Name *"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={`w-full rounded-xl border p-3 text-sm capitalize transition-colors ${
                !selectedBarangay
                  ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
                  : "border-gray-300 bg-white text-gray-700"
              } ${
                highlightInput === "street" ||
                (street &&
                  (street.trim().length < 3 || street.trim().length > 20))
                  ? "border-2 border-red-500 ring-2 ring-red-200"
                  : ""
              }`}
              disabled={!selectedBarangay}
              minLength={3}
              maxLength={20}
            />
            <input
              ref={houseNumberRef}
              type="text"
              placeholder="House/Unit No. *"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className={`w-full rounded-xl border p-3 text-sm capitalize transition-colors ${
                !street
                  ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
                  : "border-gray-300 bg-white text-gray-700"
              } ${
                highlightInput === "houseNumber" ||
                (houseNumber &&
                  (houseNumber.length > 15 || !/\d/.test(houseNumber)))
                  ? "border-2 border-red-500 ring-2 ring-red-200"
                  : ""
              }`}
              disabled={!street}
              maxLength={15}
            />
            <input
              type="text"
              placeholder="Building / Subdivision / Sitio / etc. (optional)"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize"
            />
          </div>
        )}

      {showFullScreenMap && (
        <FullScreenLocationMapModal
          open={showFullScreenMap}
          onClose={() => setShowFullScreenMap(false)}
          value={
            mapLocation
              ? { ...mapLocation, address: mapLocation.address ?? "" }
              : geoLocation
                ? {
                    lat: geoLocation.latitude,
                    lng: geoLocation.longitude,
                    address: cleanedDetectedAddress,
                  }
                : null
          }
          onChange={(loc: any) => {
            const rawPrecise = loc.formatted_address || loc.address || "";
            const cleanedPrecise = stripPlusCodes(rawPrecise);
            const placeName = loc.rawName;
            let displayAddress = cleanedPrecise;
            if (placeName && !cleanedPrecise.startsWith(placeName)) {
              displayAddress = `${placeName}, ${cleanedPrecise}`;
            }
            setMapLocation({
              ...loc,
              address: cleanedPrecise,
              formatted_address: cleanedPrecise,
            });
            setMapPreciseAddress(cleanedPrecise);
            setMapDisplayAddress(displayAddress);
          }}
          persistKey="booking:lastLocation"
          highlight={highlight}
          label="Full Screen Location Picker"
        />
      )}
    </div>
  );
};

export default ServiceLocationSection;
