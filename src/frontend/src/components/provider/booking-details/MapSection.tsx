import React from "react";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import GStreetView from "../../common/GMapFunctions/GStreetView";
import AccuracyCircle from "../../common/GMapFunctions/AccuracyCircle";
import { MapPinIcon, EyeIcon } from "@heroicons/react/24/solid";

interface Props {
  mapsReady: boolean;
  resolvedCoords: { lat: number; lng: number } | null;
  clientLocation: { lat: number; lng: number };
  hasExplicitCoords: boolean;
  geocodeStatus?: "idle" | "pending" | "ok" | "failed";
  bookingLocation: string;
  displayAddress?: string;
  preciseAddress?: string;
  geocodedAddress?: string;
  showStreetView: boolean;
  setShowStreetView: (v: boolean) => void;
}

const MapSection: React.FC<Props> = ({
  mapsReady,
  resolvedCoords,
  clientLocation,
  hasExplicitCoords,
  bookingLocation,
  geocodeStatus,
  displayAddress,
  preciseAddress,
  geocodedAddress,
  showStreetView,
  setShowStreetView,
}) => {
  // If resolvedCoords/clientLocation include an accuracy field, scale it for UI.
  const rawAccuracy =
    (resolvedCoords as any)?.accuracy ?? (clientLocation as any)?.accuracy;
  const scaledAccuracy =
    typeof rawAccuracy === "number" && rawAccuracy > 0
      ? Math.min(rawAccuracy * 0.25, 100)
      : undefined;
  // Fallback: if no reported accuracy but we have explicit coordinates, show a small default radius
  const defaultWhenExplicit = hasExplicitCoords || !!resolvedCoords;
  const effectiveRadius =
    typeof scaledAccuracy === "number" && scaledAccuracy > 0
      ? scaledAccuracy
      : defaultWhenExplicit
        ? 40
        : undefined;
  return (
    <section className="rounded-2xl bg-white p-4 shadow-lg">
      <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-blue-700">
        <MapPinIcon className="h-5 w-5 text-blue-500" /> Service Location
      </h3>
      <p className="mb-2 text-xs text-gray-500">
        Interactive map centered on the client's provided location. Use the
        navigation button to open directions in Google Maps.
      </p>
      {!mapsReady && (
        <div className="relative mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex h-64 w-full items-center justify-center text-xs text-gray-400">
            Loading map script...
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-3 py-2 text-[11px] font-medium leading-tight text-white">
            {bookingLocation !== "Location not specified"
              ? bookingLocation
              : displayAddress || preciseAddress || "Location pending"}
          </div>
        </div>
      )}
      {mapsReady ? (
        <div>
          <div
            className="relative"
            style={{
              width: "100%",
              height: "260px",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Map
              center={resolvedCoords || clientLocation}
              defaultZoom={16}
              mapId="6922634ff75ae05ac38cc473"
              style={{ width: "100%", height: "100%" }}
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
              <AdvancedMarker position={resolvedCoords || clientLocation} />
              {typeof effectiveRadius === "number" && effectiveRadius > 0 && (
                <AccuracyCircle
                  center={resolvedCoords || clientLocation}
                  radius={effectiveRadius}
                />
              )}
            </Map>
            <div className="pointer-events-none absolute inset-0">
              <div className="pointer-events-auto absolute bottom-2 left-2">
                <button
                  type="button"
                  onClick={() => setShowStreetView(true)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-gray-700 shadow ring-1 ring-gray-200 hover:bg-gray-50"
                  title="Open Street View"
                  aria-label="Open Street View"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-2 rounded bg-gray-900/70 px-3 py-1 text-[11px] leading-snug text-gray-100">
            {bookingLocation !== "Location not specified"
              ? bookingLocation
              : displayAddress ||
                preciseAddress ||
                geocodedAddress ||
                "Location not specified"}
          </div>
          {!hasExplicitCoords && geocodeStatus === "pending" && (
            <p className="mt-2 text-xs text-gray-500">
              Resolving location on map...
            </p>
          )}
          {!hasExplicitCoords && geocodeStatus === "failed" && (
            <p className="mt-2 text-xs text-red-500">
              Could not resolve the address to coordinates.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${(resolvedCoords || clientLocation).lat},${(resolvedCoords || clientLocation).lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              Open in Google Maps
            </a>
            {(hasExplicitCoords || resolvedCoords) && (
              <button
                onClick={() => {
                  const c = resolvedCoords || clientLocation;
                  navigator.clipboard
                    .writeText(`${c.lat},${c.lng}`)
                    .catch(() => {});
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Copy Coordinates
              </button>
            )}
          </div>
          {showStreetView && (resolvedCoords || clientLocation) && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
              role="dialog"
              aria-modal="true"
            >
              <div className="relative h-[80vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
                <button
                  className="absolute right-3 top-3 z-10 rounded-full border border-gray-400 bg-gray-200 p-2 hover:bg-gray-300"
                  onClick={() => setShowStreetView(false)}
                  aria-label="Close Street View"
                >
                  <span className="text-xl font-bold text-gray-700">
                    &times;
                  </span>
                </button>
                <div className="h-full w-full">
                  <GStreetView
                    position={resolvedCoords || clientLocation}
                    pov={{ heading: 0, pitch: 0 }}
                    options={{
                      addressControl: true,
                      linksControl: true,
                      panControl: true,
                    }}
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">
          Loading map...
        </div>
      )}
    </section>
  );
};

export default MapSection;
