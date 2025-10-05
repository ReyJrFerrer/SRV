import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  MarkerF,
  Polyline,
} from "@react-google-maps/api";
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
const toDeg = (rad: number) => (rad * 180) / Math.PI;
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

function bearingDegrees(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = Math.atan2(y, x);
  return (toDeg(brng) + 360) % 360;
}

// Compute a destination point given start, distance (m) and bearing (deg)
function offsetPoint(
  start: google.maps.LatLngLiteral,
  distanceM: number,
  bearingDeg: number,
): google.maps.LatLngLiteral {
  const δ = distanceM / EARTH_RADIUS_M; // angular distance
  const θ = toRad(bearingDeg);
  const φ1 = toRad(start.lat);
  const λ1 = toRad(start.lng);

  const sinφ1 = Math.sin(φ1),
    cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ),
    cosδ = Math.cos(δ);
  const sinθ = Math.sin(θ),
    cosθ = Math.cos(θ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * cosθ;
  const φ2 = Math.asin(sinφ2);
  const y = sinθ * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

// Use same libraries + loader id as rest of app to avoid duplicate loader error; must match globally
const libraries: "places"[] = ["places"];

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

  // Enhancements state
  const [trail, setTrail] = useState<google.maps.LatLngLiteral[]>([]);
  const [speedKph, setSpeedKph] = useState<number | null>(null);
  const [headingDeg, setHeadingDeg] = useState<number | null>(null);
  const lastRouteTimeRef = useRef<number>(0);
  const lastOriginRef = useRef<google.maps.LatLngLiteral | null>(null);
  const recomputeCooldownMs = 90_000; // 90s
  const driftThresholdMeters = 120; // 120m drift threshold
  const etaIntervalRef = useRef<number | null>(null);
  const etaRefreshIntervalMs = 180_000; // 3 minutes

  const mapApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "REPLACE_WITH_KEY";
  const { isLoaded } = useJsApiLoader({
    id: "header-gmap-script", // unified id
    googleMapsApiKey: mapApiKey,
    libraries,
  });

  // Track provider's moving location via watchPosition
  useEffect(() => {
    if (!navigator.geolocation) return;
    let prevPos: GeolocationPosition | null = null;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const latest: google.maps.LatLngLiteral = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setProviderLocation(latest);
        setTrail((t) => {
          const next = [...t, latest];
          return next.length > 100 ? next.slice(next.length - 100) : next;
        });
        // Speed (prefer native m/s, fallback to compute)
        if (typeof pos.coords.speed === "number" && !isNaN(pos.coords.speed)) {
          setSpeedKph(Math.max(0, pos.coords.speed) * 3.6);
        } else if (prevPos) {
          const dt = (pos.timestamp - prevPos.timestamp) / 1000; // seconds
          if (dt > 0) {
            const dist = haversineDistanceMeters(
              { lat: prevPos.coords.latitude, lng: prevPos.coords.longitude },
              latest,
            );
            setSpeedKph((dist / dt) * 3.6);
          }
        }
        // Heading (prefer native, fallback to compute)
        if (
          typeof pos.coords.heading === "number" &&
          !isNaN(pos.coords.heading)
        ) {
          setHeadingDeg(pos.coords.heading);
        } else if (prevPos) {
          setHeadingDeg(
            bearingDegrees(
              { lat: prevPos.coords.latitude, lng: prevPos.coords.longitude },
              latest,
            ),
          );
        }
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
        prevPos = pos;
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
      if (!isLoaded || !origin || !destinationCoords) return;
      setDirectionsStatus("pending");
      const svc = new google.maps.DirectionsService();
      svc.route(
        {
          origin,
          destination: destinationCoords,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
          provideRouteAlternatives: false,
        },
        (res, status) => {
          if (status === google.maps.DirectionsStatus.OK && res) {
            setDirectionsResponse(res);
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
    [isLoaded, baseOrigin, destinationCoords],
  );

  useEffect(() => {
    computeDirections();
  }, [computeDirections]);

  // Periodic ETA refresh
  useEffect(() => {
    if (!isLoaded || !destinationCoords) return;
    if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
    etaIntervalRef.current = window.setInterval(() => {
      if (!providerLocation || !destinationCoords) return;
      const dist = haversineDistanceMeters(providerLocation, destinationCoords);
      if (dist < 100) return; // close to destination
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
    isLoaded,
    destinationCoords,
    providerLocation,
    directionsStatus,
    computeDirections,
    baseOrigin,
  ]);

  // Forward-view auto-pan: center slightly ahead along heading
  const mapRef = useRef<google.maps.Map | null>(null);
  const handleMapLoad = (m: google.maps.Map) => {
    mapRef.current = m;
  };
  useEffect(() => {
    if (!mapRef.current || !providerLocation) return;
    if (headingDeg != null) {
      const projected = offsetPoint(providerLocation, 60, headingDeg);
      mapRef.current.panTo(projected);
    } else {
      mapRef.current.panTo(providerLocation);
    }
  }, [providerLocation, headingDeg]);

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
    if (
      !isLoaded ||
      destResolveStatus === "pending" ||
      destResolveStatus === "ok"
    )
      return;
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
  }, [booking, isLoaded, mapApiKey, destResolveStatus]);

  const handleStartService = async () => {
    if (!bookingId) return;
    const success = await startBookingById(bookingId);
    if (success) {
      const startTime = new Date().toISOString();
      localStorage.setItem(`activeServiceStartTime:${bookingId}`, startTime);
      navigate(
        `/provider/active-service/${bookingId}?startTime=${encodeURIComponent(startTime)}`,
      );
    }
  };

  if (loading || !isLoaded || !providerLocation) {
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
      {isLoaded && providerLocation && destinationHasCoords && (
        <GoogleMap
          onLoad={handleMapLoad}
          mapContainerStyle={containerStyle}
          zoom={15}
          center={providerLocation}
          options={{ disableDefaultUI: true, zoomControl: true }}
        >
          {directionsResponse && (
            <DirectionsRenderer directions={directionsResponse} />
          )}
          {trail.length > 1 && (
            <Polyline
              path={trail}
              options={{
                strokeColor: "#2563eb",
                strokeOpacity: 0.5,
                strokeWeight: 3,
              }}
            />
          )}
          {providerLocation && (
            <MarkerF
              position={providerLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "#2563eb",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff",
              }}
            />
          )}
        </GoogleMap>
      )}
      {/* Overlay controls */}
      <div className="absolute bottom-6 left-1/2 z-10 w-[90%] max-w-md -translate-x-1/2 space-y-3">
        <div className="rounded-lg bg-white/90 p-3 shadow backdrop-blur">
          <p className="text-xs font-medium text-gray-700">
            {directionsStatus === "pending" && "Calculating route..."}
            {directionsStatus === "ok" &&
              directionsResponse &&
              (() => {
                const leg = directionsResponse.routes[0].legs[0];
                return `ETA: ${leg.duration?.text || "N/A"} • Distance: ${leg.distance?.text || "N/A"}`;
              })()}
            {directionsStatus === "failed" && "Could not compute directions."}
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-gray-600">
            {speedKph != null && <span>Speed: {speedKph.toFixed(1)} km/h</span>}
            {headingDeg != null && (
              <span>
                Heading: {Math.round(((headingDeg % 360) + 360) % 360)}°
              </span>
            )}
            {trail.length > 1 && <span>Trail pts: {trail.length}</span>}
          </div>
          {!destinationHasCoords && destResolveStatus !== "pending" && (
            <p className="mt-1 text-[11px] text-red-600">
              Destination coordinates missing for this booking.
            </p>
          )}
          {!destinationHasCoords && destResolveStatus === "pending" && (
            <p className="mt-1 text-[11px] text-gray-600">
              Resolving destination...
            </p>
          )}
        </div>
        <button
          onClick={handleStartService}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-blue-700 disabled:opacity-50"
          disabled={!destinationHasCoords}
        >
          I've Arrived – Start Service
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          Back
        </button>
      </div>
      {mapApiKey === "REPLACE_WITH_KEY" && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-orange-500/90 px-3 py-1 text-[11px] font-semibold text-white shadow">
          Missing Google Maps API key
        </div>
      )}
    </div>
  );
};

export default ProviderDirectionsPage;
