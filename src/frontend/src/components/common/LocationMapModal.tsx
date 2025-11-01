import React, { useEffect, useRef, useState } from "react";
import { Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

export interface LocationMapModalProps {
  show: boolean;
  onClose: () => void;
  center: { lat: number; lng: number };
  address: string;
  status: string; // "ok" | "loading" | ...
  mapsApiLoaded: boolean;
  accuracy?: number; // meters
}

// Imperative circle overlay using native Google Maps API
const AccuracyCircle: React.FC<{
  center: { lat: number; lng: number };
  radius: number;
}> = ({ center, radius }) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !window.google || typeof radius !== "number") return;
    if (!circleRef.current) {
      circleRef.current = new window.google.maps.Circle({
        strokeColor: "#2563eb",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
      });
      circleRef.current.setMap(map);
    }
    circleRef.current.setCenter(center);
    circleRef.current.setRadius(radius);
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, center.lat, center.lng, radius]);
  return null;
};

const LocationMapModal: React.FC<LocationMapModalProps> = ({
  show,
  onClose,
  center,
  address,
  status,
  mapsApiLoaded,
  accuracy,
}) => {
  if (!show) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Controlled camera state: preserve user zoom and panning
  const [zoom, setZoom] = useState<number>(16);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    center,
  );

  useEffect(() => {
    if (show) {
      setMapCenter(center);
    }
  }, [show, center.lat, center.lng]);

  // Scale the visible accuracy to be smaller ("shorter")
  const scaledAccuracy =
    typeof accuracy === "number" && accuracy > 0
      ? Math.min(accuracy * 0.6, 200) // 40% smaller, cap to 200m
      : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-lg">
        <button
          className="absolute right-3 top-3 z-10 rounded-full border border-gray-400 bg-gray-200 p-2 hover:bg-gray-300"
          onClick={onClose}
          aria-label="Close map"
          tabIndex={0}
        >
          <span className="text-xl font-bold text-gray-700">&times;</span>
        </button>
        <div className="relative flex-1">
          {/* Recenter button (icon-only, positioned above native zoom +/-) */}
          <button
            type="button"
            className="pointer-events-auto absolute bottom-28 right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-gray-700 shadow ring-1 ring-gray-200 hover:bg-gray-50"
            onClick={() => {
              setMapCenter(center);
              setZoom((z) => (typeof z === "number" ? Math.max(z, 16) : 16));
            }}
            aria-label="Recenter map"
            title="Re-center map"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
              <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
            </svg>
          </button>
          {mapsApiLoaded ? (
            <Map
              center={mapCenter}
              zoom={zoom}
              mapId="6922634ff75ae05ac38cc473"
              style={{ width: "100%", height: "100%" }}
              disableDefaultUI={true}
              mapTypeControl={false}
              zoomControl={true}
              streetViewControl={false}
              gestureHandling={"greedy"}
              onCameraChanged={(ev: any) => {
                try {
                  const next = ev?.detail;
                  if (next?.center) setMapCenter(next.center);
                  if (typeof next?.zoom === "number") setZoom(next.zoom);
                } catch {}
              }}
            >
              {/* Keep marker at the provided center (fixed location), not at camera center */}
              <AdvancedMarker position={center} />
              {/* Accuracy circle (reduced radius) */}
              {typeof scaledAccuracy === "number" && scaledAccuracy > 0 && (
                <AccuracyCircle center={center} radius={scaledAccuracy} />
              )}
            </Map>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading map...
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 bg-white p-3 text-center text-xs text-gray-600">
          {status === "ok" && address !== "Detecting location..."
            ? address
            : `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`}
        </div>
      </div>
    </div>
  );
};

export default LocationMapModal;
