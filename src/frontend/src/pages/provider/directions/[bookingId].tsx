import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import GStreetView from "../../../components/common/GStreetView";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";

// Simple inline fallback loader (avoid cross-component dependency)
const InlineLoader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      <p className="text-sm text-gray-600">{message || "Loading map..."}</p>
    </div>
  </div>
);

// Style object for the map container (not MapOptions to satisfy @react-google-maps/api types)
const containerStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  position: "absolute",
  inset: 0,
};

// Math helpers (Haversine + bearing) to avoid geometry library
const toRad = (deg: number) => (deg * Math.PI) / 180;
const EARTH_RADIUS_M = 6371000; // meters

function haversineDistanceMeters(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

// toDeg/bearing/offsetPoint removed as heading/forward-view are not used

const ProviderDirectionsPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { loading, error, startBookingById, getBookingById } =
    useProviderBookingManagement();
  const booking = bookingId ? getBookingById(bookingId) : null;

  const [providerLocation, setProviderLocation] =
    useState<google.maps.LatLngLiteral | null>(null);
  // Base origin to avoid recomputing directions on every GPS tick
  const [baseOrigin, setBaseOrigin] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);
  const [directionsStatus, setDirectionsStatus] = useState<
    "idle" | "pending" | "ok" | "failed"
  >("idle");
  const [geoDenied, setGeoDenied] = useState(false);
  const [destinationCoords, setDestinationCoords] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [destResolveStatus, setDestResolveStatus] = useState<
    "idle" | "pending" | "ok" | "failed"
  >("idle");
  const [showStreetView, setShowStreetView] = useState<boolean>(false);
  // Prevent multiple auto-start triggers
  const hasAutoStartedRef = useRef<boolean>(false);

  // Enhancements state removed (speed, heading, trail)
  const lastRouteTimeRef = useRef<number>(0);
  const lastOriginRef = useRef<google.maps.LatLngLiteral | null>(null);
  const recomputeCooldownMs = 90_000; // 90s
  const driftThresholdMeters = 120; // 120m drift threshold
  const etaIntervalRef = useRef<number | null>(null);
  const etaRefreshIntervalMs = 180_000; // default 3 minutes
  // New: Route deviation threshold (distance to current route polyline)
  const routeDeviationMeters = 60; // reroute when > 60m from current route
  // Low-power mode, speed, heading, and trail removed
  // Native polyline for rendering route on vis.gl map
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const altRoutePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const altRouteListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  // Allow user to toggle auto-centering on their current location
  const [followMe, setFollowMe] = useState<boolean>(false);
  // Dynamic colors from Tailwind
  const mainStrokeColorRef = useRef<string>("#2563eb");
  const altStrokeColorRef = useRef<string>("#93c5fd");
  useEffect(() => {
    // Try CSS variables first, then computed color via a temporary element
    try {
      const root = document.documentElement;
      const varPrimary = getComputedStyle(root)
        .getPropertyValue("--color-blue-600")
        .trim();
      const varAlt = getComputedStyle(root)
        .getPropertyValue("--color-blue-300")
        .trim();
      if (varPrimary) mainStrokeColorRef.current = varPrimary;
      if (varAlt) altStrokeColorRef.current = varAlt;
      // Fallback: compute from classes
      if (!varPrimary || !varAlt) {
        const probe = document.createElement("span");
        probe.style.display = "none";
        document.body.appendChild(probe);
        if (!varPrimary) {
          probe.className = "text-blue-600";
          mainStrokeColorRef.current =
            getComputedStyle(probe).color || mainStrokeColorRef.current;
        }
        if (!varAlt) {
          probe.className = "text-blue-300";
          altStrokeColorRef.current =
            getComputedStyle(probe).color || altStrokeColorRef.current;
        }
        document.body.removeChild(probe);
      }
    } catch {}
  }, []);

  // Decode Google encoded polyline to LatLngLiteral[] (fallback when steps.path absent)
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

  // Flatten route into a sequence of points for deviation checks
  const getRoutePath = useCallback((): google.maps.LatLngLiteral[] => {
    const path: google.maps.LatLngLiteral[] = [];
    if (!directionsResponse) return path;
    const route =
      directionsResponse.routes[selectedRouteIndex] ||
      directionsResponse.routes[0];
    if (!route) return path;
    try {
      // Prefer steps[].path if available
      for (const leg of route.legs) {
        for (const step of leg.steps) {
          if (Array.isArray((step as any).path)) {
            for (const p of (step as any).path) {
              const lat = (p as any).lat ? (p as any).lat() : (p as any).lat;
              const lng = (p as any).lng ? (p as any).lng() : (p as any).lng;
              if (typeof lat === "number" && typeof lng === "number")
                path.push({ lat, lng });
            }
          }
        }
      }
      if (path.length > 1) return path;
    } catch {}
    // Fallback: decode overview_polyline if present
    const poly = (route as any).overview_polyline?.points;
    if (typeof poly === "string" && poly.length > 0) {
      return decodePolyline(poly);
    }
    return path;
  }, [directionsResponse, selectedRouteIndex]);

  // Distance from point to polyline (equirectangular approximation, meters)
  const pointToPolylineDistanceM = (
    pt: google.maps.LatLngLiteral,
    poly: google.maps.LatLngLiteral[],
  ) => {
    if (poly.length < 2) return Infinity;
    // Local projection around pt using equirectangular approximation
    const lat0 = toRad(pt.lat);
    const cosLat0 = Math.cos(lat0);
    const toXY = (q: google.maps.LatLngLiteral) => {
      const dx = toRad(q.lng - pt.lng) * cosLat0 * EARTH_RADIUS_M;
      const dy = toRad(q.lat - pt.lat) * EARTH_RADIUS_M;
      return { x: dx, y: dy };
    };
    const P = { x: 0, y: 0 };
    let minD = Infinity;
    for (let i = 0; i < poly.length - 1; i++) {
      const a = toXY(poly[i]);
      const b = toXY(poly[i + 1]);
      const ABx = b.x - a.x,
        ABy = b.y - a.y;
      const APx = P.x - a.x,
        APy = P.y - a.y;
      const ab2 = ABx * ABx + ABy * ABy;
      let t = ab2 > 0 ? (APx * ABx + APy * ABy) / ab2 : 0;
      t = Math.max(0, Math.min(1, t));
      const projX = a.x + t * ABx;
      const projY = a.y + t * ABy;
      const dx = P.x - projX;
      const dy = P.y - projY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minD) minD = d;
    }
    return minD;
  };

  const mapApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "REPLACE_WITH_KEY";

  // Track provider's moving location via watchPosition
  useEffect(() => {
    if (!navigator.geolocation) return;
    // prevPos removed as speed/heading computation is no longer used
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const latest: google.maps.LatLngLiteral = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setProviderLocation(latest);
        // Initialize baseOrigin once
        if (!baseOrigin) setBaseOrigin(latest);
        // Drift detection vs last origin; recompute with cooldown
        if (lastOriginRef.current && directionsResponse) {
          const distFromOrigin = haversineDistanceMeters(
            latest,
            lastOriginRef.current,
          );
          const sinceLast = Date.now() - lastRouteTimeRef.current;
          if (
            distFromOrigin > driftThresholdMeters &&
            sinceLast > recomputeCooldownMs
          ) {
            computeDirections(latest);
          }
        }
        // Route deviation check: distance to current route polyline
        if (directionsResponse) {
          const path = getRoutePath();
          if (path.length > 1) {
            const d = pointToPolylineDistanceM(latest, path);
            const sinceLast = Date.now() - lastRouteTimeRef.current;
            if (d > routeDeviationMeters && sinceLast > recomputeCooldownMs) {
              computeDirections(latest);
            }
          }
        }
        // prevPos not used
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoDenied(true);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 4000 },
    );
    return () => {
      if (navigator.geolocation.clearWatch)
        navigator.geolocation.clearWatch(watchId);
    };
  }, [baseOrigin, directionsResponse]);

  const computeDirections = useCallback(
    (originOverride?: google.maps.LatLngLiteral) => {
      const origin = originOverride || baseOrigin;
      if (!(window as any).google?.maps || !origin || !destinationCoords)
        return;
      setDirectionsStatus("pending");
      const svc = new google.maps.DirectionsService();
      svc.route(
        {
          origin,
          destination: destinationCoords,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
          provideRouteAlternatives: true,
        },
        (res, status) => {
          if (status === google.maps.DirectionsStatus.OK && res) {
            setDirectionsResponse(res);
            setSelectedRouteIndex(0);
            setDirectionsStatus("ok");
            lastRouteTimeRef.current = Date.now();
            lastOriginRef.current = origin;
          } else {
            setDirectionsStatus("failed");
            // eslint-disable-next-line no-console
            console.error("Directions request failed:", status);
          }
        },
      );
    },
    [baseOrigin, destinationCoords],
  );

  useEffect(() => {
    computeDirections();
  }, [computeDirections]);

  // Periodic ETA refresh
  useEffect(() => {
    if (!(window as any).google?.maps || !destinationCoords) return;
    if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
    etaIntervalRef.current = window.setInterval(() => {
      if (!providerLocation || !destinationCoords) return;
      const dist = haversineDistanceMeters(providerLocation, destinationCoords);

      // Auto-start service when arriving near destination (within 50 meters)
      useEffect(() => {
        if (!bookingId || !destinationCoords || !providerLocation) return;
        if (hasAutoStartedRef.current) return;
        const dist = haversineDistanceMeters(
          providerLocation,
          destinationCoords,
        );
        const ARRIVE_THRESHOLD_M = 50; // meters
        if (dist <= ARRIVE_THRESHOLD_M) {
          hasAutoStartedRef.current = true;
          (async () => {
            const success = await startBookingById(bookingId);
            if (success) {
              const startTime = new Date().toISOString();
              localStorage.setItem(
                `activeServiceStartTime:${bookingId}`,
                startTime,
              );
              navigate(
                `/provider/active-service/${bookingId}?startTime=${encodeURIComponent(startTime)}`,
                { replace: true },
              );
            } else {
              // Allow retrigger if starting failed
              setTimeout(() => (hasAutoStartedRef.current = false), 5000);
            }
          })();
        }
      }, [
        bookingId,
        destinationCoords,
        providerLocation,
        startBookingById,
        navigate,
      ]);
      if (dist < 50) return; // close to destination
      const sinceLast = Date.now() - lastRouteTimeRef.current;
      if (sinceLast > 60_000 && directionsStatus !== "pending") {
        computeDirections(
          lastOriginRef.current || baseOrigin || providerLocation || undefined,
        );
      }
    }, etaRefreshIntervalMs);
    return () => {
      if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
    };
  }, [
    destinationCoords,
    providerLocation,
    directionsStatus,
    computeDirections,
    baseOrigin,
  ]);

  // Map ref updated in onCameraChanged
  const mapRef = useRef<google.maps.Map | null>(null);
  // When following is enabled, keep centering on provider's location
  useEffect(() => {
    if (!mapRef.current || !providerLocation || !followMe) return;
    mapRef.current.panTo(providerLocation);
  }, [providerLocation, followMe]);

  // Disable follow when user starts dragging the map
  const dragListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!(window as any).google?.maps || !map) return;
    // Clean existing
    if (dragListenerRef.current) {
      dragListenerRef.current.remove();
      dragListenerRef.current = null;
    }
    dragListenerRef.current = google.maps.event.addListener(
      map,
      "dragstart",
      () => setFollowMe(false),
    );
    return () => {
      if (dragListenerRef.current) {
        dragListenerRef.current.remove();
        dragListenerRef.current = null;
      }
    };
  }, [mapRef.current]);

  // Draw or update the route polylines on the underlying native map
  useEffect(() => {
    const map = mapRef.current;
    if (!(window as any).google?.maps || !map) return;
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

    const routes = directionsResponse?.routes || [];
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
        strokeColor: altStrokeColorRef.current,
        strokeOpacity: 0,
        strokeWeight: 4,
        icons: [{ icon: lineSymbol, offset: "0", repeat: "20px" } as any],
        clickable: true,
      });
      const listener = google.maps.event.addListener(pl, "click", () => {
        setSelectedRouteIndex(idx);
      });
      altRouteListenersRef.current.push(listener);
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
        strokeColor: altStrokeColorRef.current,
        strokeOpacity: 0,
        strokeWeight: 4,
        clickable: true,
        icons: [{ icon: lineSymbol, offset: "0", repeat: "20px" } as any],
      });
      pl.setMap(map);
      const listener = google.maps.event.addListener(pl, "click", () => {
        setSelectedRouteIndex(idx);
      });
      altRoutePolylinesRef.current.push(pl);
      altRouteListenersRef.current.push(listener);
    }
  }, [directionsResponse, selectedRouteIndex]);

  // Fit bounds to selected route
  useEffect(() => {
    const map = mapRef.current;
    if (!(window as any).google?.maps || !map || !directionsResponse) return;
    const pts = getRoutePath();
    if (!pts || pts.length === 0) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      for (const p of pts) bounds.extend(p);
      (map as any).fitBounds(bounds, 60);
    } catch {}
  }, [directionsResponse, selectedRouteIndex, getRoutePath]);

  // Cleanup polyline on unmount
  useEffect(() => {
    return () => {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      for (const pl of altRoutePolylinesRef.current) pl.setMap(null);
      altRoutePolylinesRef.current = [];
    };
  }, []);

  // -------- Destination coordinate resolution (fallback geocode) ---------
  useEffect(() => {
    if (!booking) return;
    // If explicit coords exist, use them directly.
    const explicitLat = (booking as any)?.latitude;
    const explicitLng = (booking as any)?.longitude;
    if (typeof explicitLat === "number" && typeof explicitLng === "number") {
      setDestinationCoords({ lat: explicitLat, lng: explicitLng });
      setDestResolveStatus("ok");
      return;
    }
    if (destResolveStatus === "pending" || destResolveStatus === "ok") return;
    const mapKeyMissing = mapApiKey === "REPLACE_WITH_KEY";
    if (mapKeyMissing) return; // can't geocode without a real key

    // Candidate address strings (ordered)
    const candidates: string[] = [];
    const formatted = (booking as any)?.formattedLocation;
    const rawLocation = (booking as any)?.location;
    if (typeof formatted === "string" && formatted.trim())
      candidates.push(formatted.trim());
    if (
      typeof rawLocation === "string" &&
      rawLocation.trim() &&
      rawLocation !== formatted
    )
      candidates.push(rawLocation.trim());

    if (candidates.length === 0) return;

    // Simple localStorage cache
    const CACHE_KEY = "GEOCODE_CACHE_V1";
    interface CacheEntry {
      lat: number;
      lng: number;
      ts: number;
    }
    const loadCache = (): Record<string, CacheEntry> => {
      try {
        return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      } catch {
        return {};
      }
    };
    const saveCache = (c: Record<string, CacheEntry>) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(c));
      } catch {}
    };
    const norm = (s: string) => s.toLowerCase();
    const cache = loadCache();
    for (const cand of candidates) {
      const hit = cache[norm(cand)];
      if (hit) {
        setDestinationCoords({ lat: hit.lat, lng: hit.lng });
        setDestResolveStatus("ok");
        return;
      }
    }

    if (!(window as any).google?.maps) return; // wait for script
    const geocoder = new google.maps.Geocoder();
    setDestResolveStatus("pending");
    let idx = 0;
    const tryNext = () => {
      if (idx >= candidates.length) {
        setDestResolveStatus("failed");
        return;
      }
      const addr = candidates[idx++];
      geocoder.geocode({ address: addr }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          setDestinationCoords({ lat, lng });
          setDestResolveStatus("ok");
          cache[norm(addr)] = { lat, lng, ts: Date.now() };
          saveCache(cache);
        } else {
          tryNext();
        }
      });
    };
    tryNext();
  }, [booking, mapApiKey, destResolveStatus]);

  // Removed manual start handler; auto-start is handled by proximity effect above

  if (loading || !providerLocation) {
    return (
      <InlineLoader
        message={
          geoDenied
            ? "Location permission required to show directions"
            : "Preparing directions..."
        }
      />
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-600">
        Error: {error}
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        Booking not found.
      </div>
    );
  }
  const destinationHasCoords = !!destinationCoords;

  return (
    <div className="relative h-screen w-screen">
      {providerLocation && destinationHasCoords && (
        <Map
          style={containerStyle}
          defaultZoom={15}
          defaultCenter={providerLocation}
          onCameraChanged={(ev) => (mapRef.current = ev.map)}
          gestureHandling="greedy"
          disableDefaultUI={true}
          zoomControl={true}
          mapId={"6922634ff75ae05ac38cc473"}
        >
          {providerLocation && (
            <AdvancedMarker position={providerLocation}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  border: "2px solid #ffffff",
                }}
              />
            </AdvancedMarker>
          )}
          {destinationHasCoords && destinationCoords && (
            <AdvancedMarker position={destinationCoords} />
          )}
        </Map>
      )}
      {/* Overlay controls */}
      <div className="absolute bottom-6 left-1/2 z-10 w-[90%] max-w-md -translate-x-1/2 space-y-3">
        {/* Street View button above Follow me */}
        {destinationHasCoords && destinationCoords && (
          <div className="flex w-full justify-end px-1">
            <button
              type="button"
              onClick={() => setShowStreetView(true)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-gray-700 shadow ring-1 ring-gray-200 hover:bg-white"
              title="Open Street View"
              aria-label="Open Street View"
            >
              {/* Eye icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M2 12c2.5-4 6.5-6 10-6s7.5 2 10 6c-2.5 4-6.5 6-10 6s-7.5-2-10-6z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        )}
        {/* Follow toggle and Re-center controls */}
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
          {/* Re-center moved above card */}
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
                const eta = leg.duration?.text || "N/A";
                const dist = leg.distance?.text || "N/A";
                return (
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    <div className="text-lg font-extrabold text-gray-900">
                      Estimated time of arrival: {eta}
                    </div>
                    <span className="text-gray-300">•</span>
                    <div className="text-base font-semibold text-gray-700">
                      Distance: {dist}
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
        {/* Start Service button removed; service auto-starts within 50 meters */}
        <button
          onClick={() => navigate(-1)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          Back
        </button>
      </div>
      {/* Street View modal */}
      {showStreetView && destinationHasCoords && destinationCoords && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" role="dialog" aria-modal="true">
          <div className="relative h-[80vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <button
              className="absolute right-3 top-3 z-10 rounded-full border border-gray-400 bg-gray-200 p-2 hover:bg-gray-300"
              onClick={() => setShowStreetView(false)}
              aria-label="Close Street View"
            >
              <span className="text-xl font-bold text-gray-700">&times;</span>
            </button>
            <div className="h-full w-full">
              <GStreetView
                position={destinationCoords}
                pov={{ heading: 0, pitch: 0 }}
                options={{ addressControl: true, linksControl: true, panControl: true }}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Floating button removed; recenter is in overlay */}
      {mapApiKey === "REPLACE_WITH_KEY" && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-orange-500/90 px-3 py-1 text-[11px] font-semibold text-white shadow">
          Missing Google Maps API key
        </div>
      )}
    </div>
  );
};

export default ProviderDirectionsPage;
