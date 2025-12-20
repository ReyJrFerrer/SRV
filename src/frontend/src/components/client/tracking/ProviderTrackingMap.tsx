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
  onAutoFollowChange?: (value: boolean) => void;
  className?: string;
  destinationName?: string;
  onRouteCalculated?: (
    etaText: string | null,
    distanceText: string | null,
    distanceMeters: number | null,
    totalDistanceMeters: number | null,
  ) => void;
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
  onAutoFollowChange,
  className = "",
  destinationName,
  onRouteCalculated,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const altRoutePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const altRouteListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const altInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const lastRouteTimeRef = useRef<number>(0);

  // Throttle auto-pan: track last pan time and position
  const lastPanTimeRef = useRef<number>(0);
  const lastPanPosRef = useRef<google.maps.LatLngLiteral | null>(null);

  // Dynamic color from Tailwind
  const mainStrokeColorRef = useRef<string>("#2563eb");

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

  // Small haversine helper (meters) to avoid panning for tiny movements
  const haversineDistanceMeters = (
    a: google.maps.LatLngLiteral,
    b: google.maps.LatLngLiteral,
  ) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h =
      sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
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
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResult(result);
          setSelectedRouteIndex(0);
          lastRouteTimeRef.current = now;

          // Notify parent of route calculation
          if (onRouteCalculated) {
            const leg = result.routes[0]?.legs[0];
            const eta = leg?.duration?.text || null;
            const distance = leg?.distance?.text || null;
            const distanceMeters = leg?.distance?.value || null;
            const totalDistanceMeters = leg?.distance?.value || null;
            onRouteCalculated(
              eta,
              distance,
              distanceMeters,
              totalDistanceMeters,
            );
          }
        }
      },
    );
  }, [providerLocation, clientLocation, onRouteCalculated]);

  // Draw route polyline with alternative routes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !directionsResult || !(window as any).google?.maps) return;

    // Helper to build a path from a route
    const buildPathFromRoute = (route: any): google.maps.LatLngLiteral[] => {
      try {
        const acc: google.maps.LatLngLiteral[] = [];
        for (const leg of route.legs || []) {
          for (const step of leg.steps || []) {
            if (Array.isArray((step as any).path)) {
              for (const p of (step as any).path) {
                const lat = (p as any).lat ? (p as any).lat() : (p as any).lat;
                const lng = (p as any).lng ? (p as any).lng() : (p as any).lng;
                if (typeof lat === "number" && typeof lng === "number") {
                  acc.push({ lat, lng });
                }
              }
            }
          }
        }
        if (acc.length > 1) return acc;
      } catch {}
      const poly = (route as any).overview_polyline?.points;
      if (typeof poly === "string" && poly.length > 0) {
        return decodePolyline(poly);
      }
      return [];
    };

    const routes = directionsResult?.routes || [];
    const mainPath = routes[selectedRouteIndex]
      ? buildPathFromRoute(routes[selectedRouteIndex])
      : [];
    const altInfos = routes
      .map((r, idx) => ({ idx, path: buildPathFromRoute(r) }))
      .filter((o) => o.idx !== selectedRouteIndex && o.path.length > 1);

    // Clear old alt listeners
    for (const ln of altRouteListenersRef.current) ln.remove();
    altRouteListenersRef.current = [];

    // If no main path, clear polylines and return
    if (!mainPath || mainPath.length < 2) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      for (const pl of altRoutePolylinesRef.current) pl.setMap(null);
      altRoutePolylinesRef.current = [];
      return;
    }

    // Main polyline (solid)
    if (!routePolylineRef.current) {
      routePolylineRef.current = new google.maps.Polyline({
        path: mainPath,
        strokeColor: mainStrokeColorRef.current,
        strokeOpacity: 0.9,
        strokeWeight: 6,
        clickable: false,
        geodesic: true,
      });
      routePolylineRef.current.setMap(map);
    } else {
      routePolylineRef.current.setPath(mainPath as any);
      routePolylineRef.current.setOptions({
        strokeColor: mainStrokeColorRef.current,
        strokeOpacity: 0.9,
        strokeWeight: 6,
      });
    }

    // Alternate polylines (dashed)
    const lineSymbol: google.maps.Symbol = {
      path: "M 0,-1 0,1",
      strokeOpacity: 1,
      scale: 3,
    };

    // Remove extra alt polylines
    while (altRoutePolylinesRef.current.length > altInfos.length) {
      const pl = altRoutePolylinesRef.current.pop();
      if (pl) pl.setMap(null);
    }

    // Update existing alts
    for (let i = 0; i < altRoutePolylinesRef.current.length; i++) {
      const { idx, path } = altInfos[i];
      const pl = altRoutePolylinesRef.current[i];
      pl.setPath(path as any);
      pl.setOptions({
        strokeColor: mainStrokeColorRef.current,
        strokeOpacity: 0,
        strokeWeight: 4,
        icons: [{ icon: lineSymbol, offset: "0", repeat: "20px" } as any],
        clickable: true,
      });

      // attach listeners: click selects route and shows an info window
      const clickLn = google.maps.event.addListener(pl, "click", (ev: any) => {
        setSelectedRouteIndex(idx);
        try {
          if (!altInfoWindowRef.current)
            altInfoWindowRef.current = new google.maps.InfoWindow();
          const route = directionsResult?.routes[idx];
          const leg = route?.legs?.[0];
          const content = `<div style="font-size:13px;color:#0f172a;"><strong>${leg?.duration?.text || "N/A"}</strong><div style="font-size:12px;color:#374151;">${leg?.distance?.text || "N/A"}</div></div>`;
          altInfoWindowRef.current.setContent(content);
          const pos = ev?.latLng
            ? ev.latLng
            : path && path[Math.floor(path.length / 2)];
          try {
            if (pos) altInfoWindowRef.current.setPosition(pos as any);
            altInfoWindowRef.current.open(map);
          } catch {}
        } catch {}
      });

      const overLn = google.maps.event.addListener(pl, "mouseover", () => {
        try {
          pl.setOptions({ strokeOpacity: 0.8, strokeWeight: 6 });
        } catch {}
      });
      const outLn = google.maps.event.addListener(pl, "mouseout", () => {
        try {
          pl.setOptions({ strokeOpacity: 0, strokeWeight: 4 });
        } catch {}
      });

      altRouteListenersRef.current.push(clickLn, overLn, outLn);
    }

    // Add missing alts
    for (
      let i = altRoutePolylinesRef.current.length;
      i < altInfos.length;
      i++
    ) {
      const { idx, path } = altInfos[i];
      const pl = new google.maps.Polyline({
        path,
        strokeColor: mainStrokeColorRef.current,
        strokeOpacity: 0,
        strokeWeight: 4,
        clickable: true,
        icons: [{ icon: lineSymbol, offset: "0", repeat: "20px" } as any],
      });
      pl.setMap(map);

      // listeners for newly created alternate polyline
      const clickLn = google.maps.event.addListener(pl, "click", (ev: any) => {
        setSelectedRouteIndex(idx);
        try {
          if (!altInfoWindowRef.current)
            altInfoWindowRef.current = new google.maps.InfoWindow();
          const route = directionsResult?.routes[idx];
          const leg = route?.legs?.[0];
          const content = `<div style="font-size:13px;color:#0f172a;"><strong>${leg?.duration?.text || "N/A"}</strong><div style="font-size:12px;color:#374151;">${leg?.distance?.text || "N/A"}</div></div>`;
          altInfoWindowRef.current.setContent(content);
          const pos = ev?.latLng
            ? ev.latLng
            : path && path[Math.floor(path.length / 2)];
          try {
            if (pos) altInfoWindowRef.current.setPosition(pos as any);
            altInfoWindowRef.current.open(map);
          } catch {}
        } catch {}
      });
      const overLn = google.maps.event.addListener(pl, "mouseover", () => {
        try {
          pl.setOptions({ strokeOpacity: 0.8, strokeWeight: 6 });
        } catch {}
      });
      const outLn = google.maps.event.addListener(pl, "mouseout", () => {
        try {
          pl.setOptions({ strokeOpacity: 0, strokeWeight: 4 });
        } catch {}
      });

      altRoutePolylinesRef.current.push(pl);
      altRouteListenersRef.current.push(clickLn, overLn, outLn);
    }
  }, [directionsResult, selectedRouteIndex]);

  // Cleanup polylines only on unmount
  useEffect(() => {
    return () => {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
      for (const pl of altRoutePolylinesRef.current) {
        pl.setMap(null);
      }
      for (const ln of altRouteListenersRef.current) {
        ln.remove();
      }
    };
  }, []);

  // Disable auto-follow when user drags the map
  const dragListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!(window as any).google?.maps || !map) return;
    // Clean existing listener
    if (dragListenerRef.current) {
      dragListenerRef.current.remove();
      dragListenerRef.current = null;
    }
    dragListenerRef.current = google.maps.event.addListener(
      map,
      "dragstart",
      () => {
        // User manually dragged - stop auto-following
        if (onAutoFollowChange) {
          onAutoFollowChange(false);
        }
      },
    );
    return () => {
      if (dragListenerRef.current) {
        dragListenerRef.current.remove();
        dragListenerRef.current = null;
      }
    };
  }, [onAutoFollowChange]);

  // Auto-follow provider location only when autoFollow is true
  useEffect(() => {
    const map = mapRef.current;
    if (!autoFollow || !map || !providerLocation) return;

    // Throttle pans to avoid constant recentering. Minimum interval and distance.
    const MIN_INTERVAL_MS = 3000; // 3 seconds
    const MIN_DISTANCE_M = 10; // 10 meters
    const now = Date.now();
    const since = now - lastPanTimeRef.current;
    const lastPos = lastPanPosRef.current;
    const distance = lastPos
      ? haversineDistanceMeters(lastPos, providerLocation)
      : Infinity;

    if (since < MIN_INTERVAL_MS && distance < MIN_DISTANCE_M) return;

    try {
      map.panTo(providerLocation);
      lastPanTimeRef.current = now;
      lastPanPosRef.current = providerLocation;
    } catch {}
  }, [providerLocation, autoFollow]);

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
    </div>
  );
};

export default ProviderTrackingMap;
