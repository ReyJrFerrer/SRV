import React, {
  Suspense,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
const LocationMapModal = React.lazy(() => import("./LocationMapModal"));
import { useLocationStore } from "../../../store/locationStore";
import EnableLocationButton from "../locationAccessPermission/EnableLocationButton";
import LocationBlockedModal from "../locationAccessPermission/LocationBlockedModal";

// Constants
const ADDR_CACHE_KEY = "GMAPS_ADDR_CACHE_COMMON_V1";
const ADDR_CACHE_TTL_MS = 2 * 60 * 1000;

export type MapFunctionsHandle = {
  openMap: () => void;
  openChangeLocation: () => void;
};

// Component
const MapFunctions = React.forwardRef<MapFunctionsHandle>((_, ref) => {
  const {
    location: geoLocation,
    userAddress,
    userProvince,
    locationLoading,
    locationStatus,
    isInitialized,
  } = useLocationStore();

  // State
  const [showMap, setShowMap] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [gmapsAddress, setGmapsAddress] = useState<string>(
    "Detecting location...",
  );
  const [gmapsStatus, setGmapsStatus] = useState<
    "idle" | "loading" | "ok" | "denied" | "unsupported" | "failed"
  >("idle");
  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);
  const [lastRefreshTs, setLastRefreshTs] = useState<number>(0);

  // Effects
  useEffect(() => {
    const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

    const tryRefresh = async (force = false) => {
      try {
        if (locationStatus !== "allowed") return;

        const now = Date.now();
        if (!force && now - lastRefreshTs < REFRESH_INTERVAL_MS) return;

        await (useLocationStore.getState().requestLocation as any)(true);
        setLastRefreshTs(now);
      } catch {}
    };

    tryRefresh(false);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tryRefresh(true);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [locationStatus, lastRefreshTs]);

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

  const openMap = () => {
    if (mapsApiLoaded && geoLocation) {
      setShowMap(true);
    } else if (locationStatus === "denied" || locationStatus === "not_set") {
      setShowLocationModal(true);
    }
  };

  const openChangeLocation = () => {
    setShowLocationModal(true);
  };

  useImperativeHandle(
    ref,
    () => ({
      openMap,
      openChangeLocation,
    }),
    [mapsApiLoaded, geoLocation, locationStatus],
  );

  // Render
  return (
    <>
      <div className="flex w-full items-center justify-start">
        {mapsApiLoaded && geoLocation && gmapsStatus === "ok" ? (
          <button
            type="button"
            className="line-clamp-2 max-w-full text-left text-sm font-medium text-blue-900 transition-colors hover:text-blue-700 focus:outline-none"
            onClick={openMap}
            title={gmapsAddress}
          >
            {gmapsAddress}
          </button>
        ) : userAddress && userProvince ? (
          geoLocation ? (
            <button
              type="button"
              className="text-left text-sm font-medium text-blue-900 transition-colors hover:text-blue-700 focus:outline-none"
              onClick={openMap}
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
          {/* Controls */}
          {locationStatus === "not_set" && <EnableLocationButton />}
        </div>
      )}

      {mapsApiLoaded && geoLocation && showMap && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          }
        >
          <LocationMapModal
            show={showMap}
            onClose={() => setShowMap(false)}
            center={{ lat: geoLocation.latitude, lng: geoLocation.longitude }}
            address={gmapsAddress}
            status={gmapsStatus}
            mapsApiLoaded={mapsApiLoaded}
            accuracy={geoLocation.accuracy}
          />
        </Suspense>
      )}

      <LocationBlockedModal
        visible={
          showLocationModal &&
          locationStatus === "denied" &&
          !userProvince &&
          !userAddress &&
          isInitialized
        }
        onClose={() => setShowLocationModal(false)}
      />
    </>
  );
});

MapFunctions.displayName = "MapFunctions";

export default MapFunctions;
