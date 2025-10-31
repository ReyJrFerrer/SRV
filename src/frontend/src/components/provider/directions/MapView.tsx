import React from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

interface MapViewProps {
  mapApiKey: string;
  providerLocation: google.maps.LatLngLiteral | null;
  destinationCoords: google.maps.LatLngLiteral | null;
  isInNavigationMode: boolean;
  deviceHeading: number | null;
  setMapRef: (m: google.maps.Map | null) => void;
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
}) => {
  if (!providerLocation) return null;

  return (
    <APIProvider apiKey={mapApiKey}>
      <Map
        style={containerStyle}
        defaultZoom={isInNavigationMode ? 16 : 15}
        defaultCenter={providerLocation}
        onCameraChanged={(ev) => setMapRef(ev.map)}
        gestureHandling={isInNavigationMode ? "none" : "greedy"}
        disableDefaultUI={true}
        zoomControl={true}
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

        {destinationCoords && <AdvancedMarker position={destinationCoords} />}
      </Map>
    </APIProvider>
  );
};

export default MapView;
