import React, { useEffect, Suspense } from "react";
import { useLocationStore } from "../../../store/locationStore";
const LocationMapPicker = React.lazy(
  () => import("../../common/GMapFunctions/LocationMapPicker"),
);
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import phLocations from "../../../data/ph_locations.json";
import EnableLocationButton from "../../common/locationAccessPermission/EnableLocationButton";
import AccuracyCircle from "../../common/GMapFunctions/AccuracyCircle";

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
  mapPreciseAddress,
  setMapPreciseAddress,
  mapDisplayAddress,
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
  // If permission denied/not_set, default to showing manual forms to guide the user
  useEffect(() => {
    if (locationStatus === "denied") {
      try {
        setShowFallbackForms(true);
        setLocationInputMode("manual");
      } catch {}
    }
  }, [locationStatus, setLocationInputMode, setShowFallbackForms]);

  // Scale reported accuracy for UI (smaller visual circle than reported gps accuracy)
  const rawAccuracy = location?.accuracy;
  const scaledAccuracy =
    typeof rawAccuracy === "number" && rawAccuracy > 0
      ? Math.min(rawAccuracy * 0.25, 100)
      : undefined;
  return (
    <div
      className={`glass-card rounded-2xl border bg-white/70 p-6 shadow-xl backdrop-blur-md ${
        highlight
          ? "border-2 border-red-500 ring-2 ring-red-200"
          : "border-gray-100"
      }`}
    >
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-900 md:text-xl">
        <span className="mr-2 inline-block h-6 w-2 rounded-full bg-blue-400"></span>
        Service Location <span className="text-red-500">*</span>
      </h3>

      {/* When browser location permission is denied, do not show the
      detected / maps buttons. Show a short banner with a CTA to
      re-enable location permission so the user can restore detected
      / map-based selection. */}
      {!showFallbackForms && locationStatus !== "denied" && (
        <div className="mb-4 flex gap-3 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMapMode("detected")}
            className={`flex-1 rounded-lg border px-3 py-2 transition ${
              mapMode === "detected"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-blue-50"
            }`}
          >
            Use Detected Location
          </button>
          <button
            type="button"
            onClick={() => setMapMode("custom")}
            className={`flex-1 rounded-lg border px-3 py-2 transition ${
              mapMode === "custom"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-blue-50"
            }`}
          >
            Pin / Search Location
          </button>
        </div>
      )}

      {/* Inline banner shown when browser blocks location access */}
      {locationStatus === "denied" && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div>
            <strong className="block font-semibold">
              Location permission blocked
            </strong>
            <div className="text-xs">
              Detected / Map options are hidden — please choose your
              city/province or enable location.
            </div>
          </div>
          <div className="ml-4">
            <EnableLocationButton />
          </div>
        </div>
      )}

      {mapMode === "detected" && !showFallbackForms && (
        <div className="mb-2.5">
          <div className="mb-2 text-[11px] font-medium text-gray-600">
            Automatically detected via browser geolocation. Drop a custom pin if
            this is inaccurate.
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
            {detectedStatus === "ok" && detectedAddress
              ? detectedAddress
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
                  : null
              }
              onChange={(loc: any) => {
                setMapLocation(loc);
                const preciseAddressForDB =
                  loc.formatted_address || loc.address || "";
                const placeName = loc.rawName;
                let displayAddress = preciseAddressForDB;
                if (placeName && !preciseAddressForDB.startsWith(placeName)) {
                  displayAddress = `${placeName}, ${preciseAddressForDB}`;
                }
                setMapPreciseAddress(preciseAddressForDB);
                setMapDisplayAddress(displayAddress);
              }}
              persistKey="booking:lastLocation"
              highlight={highlight}
              label="Pin / Search Location"
            />
          </Suspense>
          {(mapDisplayAddress || mapPreciseAddress) && (
            <div className="mt-2 space-y-1">
              {mapDisplayAddress && (
                <div className="flex items-start gap-1">
                  <span
                    className="truncate text-xs font-medium text-gray-700"
                    title={mapDisplayAddress}
                  >
                    {mapDisplayAddress}
                  </span>
                  <span
                    className="cursor-help text-[10px] text-blue-500"
                    title="Display Address: Readable version (place/building, street, barangay, city)."
                  >
                    (?)
                  </span>
                </div>
              )}
              {mapPreciseAddress &&
                mapDisplayAddress &&
                mapDisplayAddress !== mapPreciseAddress && (
                  <div className="flex items-start gap-1">
                    <span
                      className="truncate text-[10px] text-gray-500"
                      title="Precise Address: Full Google formatted address (may include plus code) stored for provider navigation."
                    >
                      Provider reference: {mapPreciseAddress}
                    </span>
                    <span
                      className="cursor-help text-[10px] text-blue-400"
                      title="Used internally to help the provider navigate accurately."
                    >
                      (i)
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* Hide the quick 'Use Manual Address Form' toggle when permission is
          denied because we immediately show the manual city/province flow */}
      {!showFallbackForms && locationStatus !== "denied" && (
        <button
          type="button"
          onClick={() => {
            setShowFallbackForms(true);
            setLocationInputMode("detected");
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Use Manual Address Form
        </button>
      )}

      {showFallbackForms && (
        <div className="mb-4 flex flex-wrap gap-4">
          {locationStatus === "denied" ? (
            // When denied, only show the manual city/province flow option
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="locationInputMode"
                value="manual"
                checked={true}
                onChange={() => setLocationInputMode("manual")}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-gray-700">Choose City/Province</span>
            </label>
          ) : (
            <>
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
                className="ml-auto text-xs text-blue-600 underline"
              >
                Use Maps
              </button>
            </>
          )}
        </div>
      )}

      {showFallbackForms && locationInputMode === "detected" && (
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
                  b && b.trim().toLowerCase().replace(/\s+/g, "") !== "others",
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

      {showFallbackForms && locationInputMode === "manual" && (
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
    </div>
  );
};

export default ServiceLocationSection;
