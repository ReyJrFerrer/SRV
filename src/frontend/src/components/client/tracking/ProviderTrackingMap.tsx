/**
 * ProviderTrackingMap Component
 *
 * A Grab-style map component that displays the provider's real-time location
 * and the client's destination with a route between them.
 */

import React, { useRef, useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { TruckIcon, MapPinIcon } from "@heroicons/react/24/solid";

interface ProviderTrackingMapProps {
  providerLocation: google.maps.LatLngLiteral | null;
  clientLocation: google.maps.LatLngLiteral | null;
  heading?: number | null;
  mapApiKey: string;
  onMapReady?: (map: google.maps.Map) => void;
  autoFollow?: boolean;
  className?: string;
  destinationName?: string;
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "absolute",
  inset: 0,
};

const ProviderTrackingMap: React.FC<ProviderTrackingMapProps> = ({
  providerLocation,
  clientLocation,
  heading,
  mapApiKey,
  onMapReady,
  autoFollow = true,
  className = "",
  destinationName,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const lastRouteTimeRef = useRef<number>(0);

  // Decode polyline for rendering
  const decodePolyline = (encoded: string): google.maps.LatLngLiteral[] => {
    let index = 0,
      lat = 0,
      lng = 0,
      coordinates: google.maps.LatLngLiteral[] = [];
    while (index < encoded.length) {
      let b: number,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;
      coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return coordinates;
  };

  // Calculate route between provider and client
  useEffect(() => {
    if (!providerLocation || !clientLocation || !(window as any).google?.maps)
      return;

    const now = Date.now();
    // Avoid recalculating route too frequently (every 30 seconds)
    if (now - lastRouteTimeRef.current < 30000 && directionsResult) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: providerLocation,
        destination: clientLocation,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResult(result);
          lastRouteTimeRef.current = now;
        }
      },
    );
  }, [providerLocation, clientLocation]);

  // Draw route polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !directionsResult || !(window as any).google?.maps) return;

    const route = directionsResult.routes[0];
    if (!route) return;

    const path = route.overview_polyline
      ? decodePolyline((route as any).overview_polyline.points || "")
      : [];

    if (path.length < 2) return;

    // Clear old polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    // Create new polyline with animated dash pattern
    routePolylineRef.current = new google.maps.Polyline({
      path,
      strokeColor: "#3B82F6", // blue-500
      strokeOpacity: 0.9,
      strokeWeight: 5,
      clickable: false,
      geodesic: true,
    });

    routePolylineRef.current.setMap(map);

    return () => {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
    };
  }, [directionsResult]);

  // Auto-follow provider location
  useEffect(() => {
    if (autoFollow && mapRef.current && providerLocation) {
      mapRef.current.panTo(providerLocation);
    }
  }, [providerLocation, autoFollow]);

  // Fit bounds when both locations are available
  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !providerLocation ||
      !clientLocation ||
      !(window as any).google?.maps
    )
      return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(providerLocation);
    bounds.extend(clientLocation);
    map.fitBounds(bounds, 80);
  }, [providerLocation, clientLocation]);

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    onMapReady?.(map);
  };

  if (!providerLocation) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
      >
        <div className="text-center">
          <div className="animate-pulse">
            <TruckIcon className="mx-auto h-12 w-12 text-blue-400" />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Waiting for provider location...
          </p>
        </div>
      </div>
    );
  }

  // Get ETA from directions
  const etaText = directionsResult?.routes[0]?.legs[0]?.duration?.text || null;
  const distanceText =
    directionsResult?.routes[0]?.legs[0]?.distance?.text || null;

  return (
    <div className={`relative ${className}`}>
      <APIProvider apiKey={mapApiKey}>
        <Map
          style={containerStyle}
          defaultZoom={15}
          defaultCenter={providerLocation}
          onIdle={(ev) => handleMapLoad(ev.map)}
          onTilesLoaded={(ev) => handleMapLoad(ev.map)}
          gestureHandling="greedy"
          disableDefaultUI={true}
          zoomControl={false}
          mapId={"6922634ff75ae05ac38cc473"}
        >
          {/* Provider Marker */}
          <AdvancedMarker position={providerLocation}>
            <div
              className="relative flex h-12 w-12 items-center justify-center"
              style={{ transform: `rotate(${heading ?? 0}deg)` }}
            >
              {/* Outer pulse ring */}
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-25" />
              {/* Inner circle */}
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg ring-4 ring-white">
                <TruckIcon className="h-5 w-5 text-white" />
              </div>
            </div>
          </AdvancedMarker>

          {/* Client Destination Marker */}
          {clientLocation && (
            <AdvancedMarker position={clientLocation}>
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-700 shadow-lg ring-4 ring-white">
                  <MapPinIcon className="h-5 w-5 text-white" />
                </div>
                <div className="mt-1 max-w-[150px] truncate rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-800 shadow-md backdrop-blur">
                  {destinationName || "Destination"}
                </div>
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>

      {/* ETA Overlay - Top right */}
      {(etaText || distanceText) && (
        <div className="absolute right-4 top-4 rounded-xl bg-white/95 px-4 py-2 shadow-lg backdrop-blur">
          <div className="text-center">
            {etaText && (
              <div className="text-lg font-bold text-gray-900">{etaText}</div>
            )}
            {distanceText && (
              <div className="text-sm text-gray-600">{distanceText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderTrackingMap;
