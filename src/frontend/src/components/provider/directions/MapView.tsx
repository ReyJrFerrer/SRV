import React from "react";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

interface MapViewProps {
  providerLocation: google.maps.LatLngLiteral | null;
  destinationCoords: google.maps.LatLngLiteral | null;
  isInNavigationMode: boolean;
  deviceHeading: number | null;
  setMapRef: (m: google.maps.Map | null) => void;
  destinationName?: string | null;
}

const containerStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  position: "absolute",
  inset: 0,
};

const MapView: React.FC<MapViewProps> = ({
  providerLocation,
  destinationCoords,
  isInNavigationMode,
  deviceHeading,
  setMapRef,
  destinationName,
}) => {
  if (!providerLocation) return null;
  return (
    <Map
        style={containerStyle}
        defaultZoom={isInNavigationMode ? 20 : 15}
        defaultCenter={providerLocation}
        onIdle={(ev) => setMapRef(ev.map)}
        onTilesLoaded={(ev) => setMapRef(ev.map)}
        onCameraChanged={(ev) => setMapRef(ev.map)}
        gestureHandling={
          isInNavigationMode
            ? "none"
            : typeof window !== "undefined" &&
                (navigator.maxTouchPoints || "ontouchstart" in window)
              ? "cooperative"
              : "greedy"
        }
        disableDefaultUI={true}
        // Hide built-in +/- zoom controls but keep programmatic zooming intact
        zoomControl={false}
        mapId={"6922634ff75ae05ac38cc473"}
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
        {providerLocation && (
          <AdvancedMarker position={providerLocation}>
            {isInNavigationMode ? (
              <div style={{ transform: `rotate(${deviceHeading ?? 0}deg)` }}>
                <PaperAirplaneIcon className="h-7 w-7 text-blue-700" />
              </div>
            ) : (
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  border: "2px solid #ffffff",
                }}
              />
            )}
          </AdvancedMarker>
        )}

        {destinationCoords && (
          <AdvancedMarker position={destinationCoords}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/** label pill */}
              {/** Use Tailwind classes where available; fall back to inline styles if not loaded */}
              <div
                className="hidden sm:block"
                style={{
                  background: "rgba(255,255,255,0.95)",
                  padding: "6px 10px",
                  borderRadius: 999,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1f2937",
                  maxWidth: 220,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={destinationName || undefined}
              >
                {destinationName || "Destination"}
              </div>

              {/** Small pin indicator */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "8px solid rgba(37,99,235,0.95)",
                  marginTop: 4,
                }}
              />
            </div>
          </AdvancedMarker>
        )}
      </Map>
  );
};

export default MapView;
