import React from "react";

interface ControlsOverlayProps {
  destinationHasCoords: boolean;
  destinationCoords: google.maps.LatLngLiteral | null;
  directionsStatus: "idle" | "pending" | "ok" | "failed";
  destResolveStatus: "idle" | "pending" | "ok" | "failed";
  directionsResponse: google.maps.DirectionsResult | null;
  selectedRouteIndex: number;

  setShowStreetView: (v: boolean) => void;
  followMe: boolean;
  setFollowMe: (v: boolean) => void;
  isInNavigationMode: boolean;
  toggleNavigationMode: () => void;
  handleStartService: () => void;
  mapRef: React.MutableRefObject<google.maps.Map | null>;
  providerLocation: google.maps.LatLngLiteral | null;
  navigateBack: () => void;
  mapRefSetter?: (m: google.maps.Map | null) => void; // optional
}

const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  destinationHasCoords,
  destinationCoords,
  directionsStatus,
  destResolveStatus,
  directionsResponse,
  selectedRouteIndex,
  setShowStreetView,
  followMe,
  setFollowMe,
  isInNavigationMode,
  toggleNavigationMode,
  handleStartService,
  mapRef,
  providerLocation,
  navigateBack,
}) => {
  return (
    <div className="absolute bottom-6 left-1/2 z-10 w-[90%] max-w-md -translate-x-1/2 space-y-3">
      {destinationHasCoords && destinationCoords && (
        <div className="flex w-full justify-end px-1">
          <button
            type="button"
            onClick={() => setShowStreetView(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-gray-700 shadow ring-1 ring-gray-200 hover:bg-white"
            title="Open Street View"
            aria-label="Open Street View"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M2 12c2.5-4 6.5-6 10-6s7.5 2 10 6c-2.5 4-6.5 6-10 6s-7.5-2-10-6z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={followMe}
            onChange={(e) => setFollowMe(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Follow me
        </label>
        <button
          type="button"
          onClick={() => {
            if (mapRef.current && providerLocation) {
              mapRef.current.panTo(providerLocation);
            }
          }}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-gray-700 shadow ring-1 ring-gray-200 hover:bg-white"
          title="Re-center map on your location"
          aria-label="Re-center map"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
            <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
          </svg>
        </button>
      </div>

      <div className="relative rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur">
        {directionsStatus === "pending" && (
          <p className="text-center text-sm font-medium text-gray-700">
            Calculating route...
          </p>
        )}
        {directionsStatus === "ok" && directionsResponse && (
          <div className="text-center">
            {(() => {
              const leg =
                directionsResponse.routes[selectedRouteIndex]?.legs[0] ||
                directionsResponse.routes[0].legs[0];
              return (
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                  <div className="text-lg font-extrabold text-gray-900">
                    {leg.duration?.text || "N/A"}
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="text-base font-semibold text-gray-700">
                    {leg.distance?.text || "N/A"}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {directionsStatus === "failed" && (
          <p className="text-center text-sm font-medium text-red-600">
            Could not compute directions.
          </p>
        )}
        {!destinationHasCoords && destResolveStatus !== "pending" && (
          <p className="mt-2 text-center text-xs text-red-600">
            Destination coordinates missing for this booking.
          </p>
        )}
        {!destinationHasCoords && destResolveStatus === "pending" && (
          <p className="mt-2 text-center text-xs text-gray-600">
            Resolving destination...
          </p>
        )}
      </div>

      <div className="flex w-full gap-2">
        <div className="flex-1">
          {isInNavigationMode ? (
            <button
              onClick={toggleNavigationMode}
              className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-red-700"
            >
              Exit Navigation
            </button>
          ) : (
            <button
              onClick={toggleNavigationMode}
              className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-green-700 disabled:opacity-50"
              disabled={!destinationHasCoords}
            >
              Start Navigation
            </button>
          )}
        </div>

        <div className="flex-1">
          <button
            onClick={handleStartService}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-blue-700 disabled:opacity-50"
            disabled={!destinationHasCoords}
          >
            I've Arrived - Start Service
          </button>
        </div>
      </div>
      <button
        onClick={navigateBack}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
      >
        Back
      </button>
    </div>
  );
};

export default ControlsOverlay;
