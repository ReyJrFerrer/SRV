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
import {
  reverseGeocode,
  isGoogleMapsApiLoaded,
} from "../../../utils/googleMapsGeocoding";

const ADDR_CACHE_KEY = "GMAPS_ADDR_CACHE_COMMON_V1";
const ADDR_CACHE_TTL_MS = 2 * 60 * 1000;

export type MapFunctionsHandle = {
  openMap: () => void;
  openChangeLocation: () => void;
};

const MapFunctions = React.forwardRef<MapFunctionsHandle>((_, ref) => {
  const {
    location: geoLocation,
    userAddress,
    userProvince,
    locationLoading,
    locationStatus,
    isInitialized,
  } = useLocationStore();

  const [showMap, setShowMap] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isExplicitOpen, setIsExplicitOpen] = useState(false);
  const [gmapsAddress, setGmapsAddress] = useState<string>(
    "Detecting location...",
  );
  const [gmapsStatus, setGmapsStatus] = useState<
    "idle" | "loading" | "ok" | "denied" | "unsupported" | "failed"
  >("idle");
  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);
  const [lastRefreshTs, setLastRefreshTs] = useState<number>(0);

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
    if (isGoogleMapsApiLoaded()) setMapsApiLoaded(true);
  }, []);

  useEffect(() => {
    const isApiReady = isGoogleMapsApiLoaded();
    if (isApiReady && !mapsApiLoaded) setMapsApiLoaded(true);
    if (!mapsApiLoaded || !geoLocation) return;
    if (gmapsStatus !== "idle") return;

    setGmapsStatus("loading");

    reverseGeocode(geoLocation.latitude, geoLocation.longitude)
      .then((result) => {
        setGmapsAddress(result.displayAddress);
        setGmapsStatus("ok");
        try {
          const payload = { address: result.displayAddress, ts: Date.now() };
          localStorage.setItem(ADDR_CACHE_KEY, JSON.stringify(payload));
        } catch {}
      })
      .catch(() => {
        setGmapsStatus("failed");
        setGmapsAddress("Unable to resolve address");
      });
  }, [mapsApiLoaded, geoLocation, gmapsStatus]);

  const openMap = () => {
    if (mapsApiLoaded && geoLocation) {
      setShowMap(true);
    } else if (locationStatus === "denied" || locationStatus === "not_set") {
      setIsExplicitOpen(true);
      setShowLocationModal(true);
    }
  };

  const openChangeLocation = () => {
    setIsExplicitOpen(true);
    setShowLocationModal(true);
  };

  const [prevStatus, setPrevStatus] = useState(locationStatus);
  useEffect(() => {
    if (
      isInitialized &&
      locationStatus === "denied" &&
      prevStatus !== "denied" &&
      !showLocationModal
    ) {
      setIsExplicitOpen(false);
      setShowLocationModal(true);
    }
    if (
      isInitialized &&
      prevStatus !== "allowed" &&
      (prevStatus === "denied" || prevStatus === "not_set") &&
      locationStatus === "allowed"
    ) {
      setGmapsStatus("idle");
    }
    if (prevStatus !== locationStatus) setPrevStatus(locationStatus);
  }, [locationStatus, prevStatus, isInitialized, showLocationModal]);

  useImperativeHandle(
    ref,
    () => ({
      openMap,
      openChangeLocation,
    }),
    [mapsApiLoaded, geoLocation, locationStatus],
  );

  return (
    <>
      <div className="flex w-full items-center justify-start">
        {locationStatus === "allowed" && geoLocation ? (
          mapsApiLoaded && gmapsStatus === "ok" ? (
            <button
              type="button"
              className="line-clamp-2 max-w-full text-left text-sm font-medium text-blue-900 transition-colors hover:text-blue-700 focus:outline-none"
              onClick={openMap}
              title={gmapsAddress}
            >
              {gmapsAddress}
            </button>
          ) : userAddress && userProvince ? (
            <span
              className="text-left text-sm font-medium text-blue-900"
              title={`${userAddress}, ${userProvince}`}
            >
              {userAddress}, {userProvince}
            </span>
          ) : (
            <span
              className="text-sm text-gray-500"
              title="Resolving detected location"
            >
              Resolving detected location...
            </span>
          )
        ) : userAddress && userProvince ? (
          <span
            className="text-left text-sm font-medium text-blue-900"
            title={`${userAddress}, ${userProvince}`}
          >
            {userAddress}, {userProvince}
          </span>
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
        visible={showLocationModal && isInitialized}
        onClose={() => {
          setShowLocationModal(false);
          setIsExplicitOpen(false);
        }}
        forceShow={isExplicitOpen}
      />
    </>
  );
});

MapFunctions.displayName = "MapFunctions";

export default MapFunctions;
