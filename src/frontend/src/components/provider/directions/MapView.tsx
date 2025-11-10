import React from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

interface MapViewProps {
  mapApiKey: string;
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
  mapApiKey,
  providerLocation,
  destinationCoords,
  isInNavigationMode,
  deviceHeading,
  setMapRef,
  destinationName,
}) => {
  if (!providerLocation) return null;
  return (
    <APIProvider apiKey={mapApiKey}>
      <Map
        style={containerStyle}
        defaultZoom={isInNavigationMode ? 23 : 15}
        defaultCenter={providerLocation}
        // Primary map-ready hooks: use onIdle and onTilesLoaded which tend to
        // fire reliably across desktop and mobile. Keep onCameraChanged as a
        // fallback for cases where camera movement is the earliest signal.
        onIdle={(ev) => setMapRef(ev.map)}
        onTilesLoaded={(ev) => setMapRef(ev.map)}
        onCameraChanged={(ev) => setMapRef(ev.map)}
        // On touch devices prefer 'cooperative' so users can pinch-to-zoom
        // with two fingers while preserving single-finger page scroll.
        // Keep 'none' during navigation mode to avoid accidental interactions.
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
      >
        {providerLocation && (
          <AdvancedMarker position={providerLocation}>
            {isInNavigationMode ? (
              <div style={{ transform: `rotate(${deviceHeading ?? 0}deg)` }}>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="#1D4ED8"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L2.5 21.5L12 17L21.5 21.5L12 2Z"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
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
            {/**
             * Render a small label above the destination marker showing the
             * destination name when available. Keep styling minimal so it
             * works on mobile and desktop.
             */}
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
    </APIProvider>
  );
};

export default MapView;
