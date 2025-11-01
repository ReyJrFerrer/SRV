import React, { useEffect, useState } from "react";
import LocationMapModal from "./LocationMapModal";
import { useLocationStore } from "../../../store/locationStore";
import EnableLocationButton from "../EnableLocationButton";
import LocationBlockedModal from "../LocationBlockedModal";

const ADDR_CACHE_KEY = "GMAPS_ADDR_CACHE_COMMON_V1";
const ADDR_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const MapFunctions: React.FC = () => {
  const {
    location: geoLocation,
    userAddress,
    userProvince,
    locationLoading,
    locationStatus,
    addressMode,
  } = useLocationStore();

  const [showMap, setShowMap] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [gmapsAddress, setGmapsAddress] = useState<string>(
    "Detecting location...",
  );
  const [gmapsStatus, setGmapsStatus] = useState<
    "idle" | "loading" | "ok" | "denied" | "unsupported" | "failed"
  >("idle");
  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDR_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { address: string; ts: number };
        if (cached?.address && typeof cached.ts === "number") {
          const fresh = Date.now() - cached.ts < ADDR_CACHE_TTL_MS;
          if (fresh) {
            setGmapsAddress(cached.address);
            setGmapsStatus("ok");
          }
        }
      }
    } catch {}
    if ((window as any).google?.maps) setMapsApiLoaded(true);
  }, []);

  useEffect(() => {
    const isApiReady = !!(window as any).google?.maps;
    if (isApiReady && !mapsApiLoaded) setMapsApiLoaded(true);
    if (!mapsApiLoaded || !geoLocation) return;
    if (gmapsStatus !== "idle") return;
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      setGmapsStatus("loading");
      geocoder.geocode(
        { location: { lat: geoLocation.latitude, lng: geoLocation.longitude } },
        (results: any, status: string) => {
          if (status === "OK" && results && results[0]) {
            const comps = results[0].address_components || [];
            const find = (type: string) => {
              const c = comps.find(
                (cc: any) => cc.types && cc.types.indexOf(type) !== -1,
              );
              return c ? c.long_name : undefined;
            };

            const premise =
              find("premise") ||
              find("subpremise") ||
              find("establishment") ||
              find("point_of_interest");
            const streetNumber = find("street_number");
            const route = find("route");
            const barangay =
              find("sublocality_level_2") ||
              find("sublocality") ||
              find("neighborhood");
            const locality =
              find("locality") ||
              find("postal_town") ||
              find("administrative_area_level_3") ||
              find("administrative_area_level_2");
            const province =
              find("administrative_area_level_2") ||
              find("administrative_area_level_1");

            const line1 =
              premise ||
              (streetNumber && route
                ? `${streetNumber} ${route}`
                : route || streetNumber);
            const parts: string[] = [];
            if (line1) parts.push(line1);
            if (barangay) parts.push(barangay);
            if (locality) parts.push(locality);
            if (province) parts.push(province);

            const displayAddress =
              parts.length > 0
                ? parts.join(", ")
                : (results[0].formatted_address as string);
            setGmapsAddress(displayAddress);
            setGmapsStatus("ok");
            try {
              const payload = { address: displayAddress, ts: Date.now() };
              localStorage.setItem(ADDR_CACHE_KEY, JSON.stringify(payload));
            } catch {}
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
  }, [mapsApiLoaded, geoLocation, gmapsStatus]);

  return (
    <>
      <div className="flex w-full items-center justify-start">
        {userAddress && userProvince ? (
          geoLocation ? (
            <button
              type="button"
              className="text-left text-sm font-medium text-blue-900 transition-colors hover:text-blue-700 focus:outline-none"
              onClick={() => setShowMap(true)}
              title={`${userAddress}, ${userProvince}`}
            >
              {userAddress}, {userProvince}
            </button>
          ) : (
            <span
              className="text-left text-sm font-medium text-blue-900"
              title={`${userAddress}, ${userProvince}`}
            >
              {userAddress}, {userProvince}
            </span>
          )
        ) : gmapsStatus === "ok" ? (
          <button
            type="button"
            className="line-clamp-2 max-w-full text-left text-sm font-medium text-blue-900 transition-colors hover:text-blue-700 focus:outline-none"
            onClick={() => setShowMap(true)}
            title={gmapsAddress}
          >
            {gmapsAddress}
          </button>
        ) : locationLoading || gmapsStatus === "loading" ? (
          <span className="animate-pulse text-sm text-gray-500">
            Detecting location...
          </span>
        ) : (
          <span className="text-left text-sm text-gray-500">
            {gmapsAddress}
          </span>
        )}
      </div>
      {(locationStatus === "denied" || locationStatus === "not_set") && (
        <div className="ml-3 flex items-center gap-2">
          <EnableLocationButton />
          {addressMode === "manual" && userAddress && userProvince && (
            <button
              type="button"
              className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
              onClick={() => setShowLocationModal(true)}
            >
              Change location
            </button>
          )}
        </div>
      )}

      {mapsApiLoaded && geoLocation && (
        <LocationMapModal
          show={showMap}
          onClose={() => setShowMap(false)}
          center={{ lat: geoLocation.latitude, lng: geoLocation.longitude }}
          address={gmapsAddress}
          status={gmapsStatus}
          mapsApiLoaded={mapsApiLoaded}
          accuracy={geoLocation.accuracy}
        />
      )}

      <LocationBlockedModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
    </>
  );
};

export default MapFunctions;
