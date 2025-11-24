import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import AccuracyCircle from "./AccuracyCircle";

export interface LocationMapModalProps {
  show: boolean;
  onClose: () => void;
  center: { lat: number; lng: number };
  address: string;
  status: string; // "ok" | "loading" | ...
  mapsApiLoaded: boolean;
  accuracy?: number; // meters
}

// AccuracyCircle moved to a shared component at ./AccuracyCircle

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
      ? Math.min(accuracy * 0.25, 100) // 25% of reported accuracy, cap to 100m
      : undefined;

  const modal = (
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
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          {mapsApiLoaded ? (
            <Map
              center={mapCenter}
              zoom={zoom}
              mapId= {import.meta.env.VITE_MAP_ID}
              style={{ width: "100%", height: "100%" }}
              disableDefaultUI={true}
              mapTypeControl={false}
              zoomControl={true}
              streetViewControl={false}
              gestureHandling={"greedy"}
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

  // Render the modal into the document body to avoid ancestor stacking/transform/context
  if (typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }
  return modal;
};

export default LocationMapModal;
