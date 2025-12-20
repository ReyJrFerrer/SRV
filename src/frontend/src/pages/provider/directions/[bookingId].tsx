import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import InlineLoader from "../../../components/provider/directions/InlineLoader";
import MapView from "../../../components/provider/directions/MapView";
import ControlsOverlay from "../../../components/provider/directions/ControlsOverlay";
import StreetViewModal from "../../../components/common/StreetViewModal";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";
import { useCachedProviderBooking } from "../../../hooks/useCachedBooking";
import { useProviderLocationPublisher } from "../../../hooks/useProviderLocationPublisher";

// SECTION: Math helpers (Haversine)
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

// Note: heading/forward-view helpers not used in current UI

const ProviderDirectionsPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { startBookingById } = useProviderBookingManagement();

  // Use cached booking hook - fetches once, shares across all pages
  const { booking, isLoading: isLoadingBooking } =
    useCachedProviderBooking(bookingId);

  // Real-time location publisher for client tracking
  const { publishLocation } = useProviderLocationPublisher({
    bookingId: bookingId,
    enabled: Boolean(booking && booking.status === "Accepted"),
    throttleMs: 3000,
    minDistanceM: 20,
    minHeadingChange: 30,
  });

  // Redirect if booking doesn't exist or wrong status
  useEffect(() => {
    if (!bookingId) {
      navigate("/provider/bookings", { replace: true });
      return;
    }

    // Wait for loading to complete before checking booking
    if (isLoadingBooking) {
      return;
    }

    if (!booking) {
      navigate("/provider/bookings", { replace: true });
      return;
    }

    if (booking.status !== "Accepted") {
      navigate("/provider/bookings", { replace: true });
      return;
    }
  }, [booking, isLoadingBooking, bookingId, navigate]);

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
  const [isStartingService, setIsStartingService] = useState(false);

  // Navigation mode and device heading (compass)
  const [isInNavigationMode, setIsInNavigationMode] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);

  // Timing and reroute thresholds
  const lastRouteTimeRef = useRef<number>(0);
  const lastOriginRef = useRef<google.maps.LatLngLiteral | null>(null);
  const recomputeCooldownMs = 90_000; // 90s
  const driftThresholdMeters = 120; // 120m drift threshold

  // Route deviation threshold
  const routeDeviationMeters = 60; // reroute when > 60m from current route
  // Native polylines for rendering
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const altRoutePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const altRouteListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const altInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
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

  // Flatten selected route into a sequence of points for deviation checks
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

  // SECTION: Geolocation watch
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

        // Publish location for real-time client tracking
        publishLocation(
          latest,
          pos.coords.heading ?? null,
          pos.coords.speed ?? null,
          pos.coords.accuracy,
        );
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
          }
        },
      );
    },
    [baseOrigin, destinationCoords],
  );

  useEffect(() => {
    computeDirections();
  }, [computeDirections]);

  // Device orientation (compass) when in navigation mode
  useEffect(() => {
    if (!isInNavigationMode) return;
    const anyDeviceOrientation: any = (window as any).DeviceOrientationEvent;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) setDeviceHeading(event.alpha);
    };

    const addListener = () => {
      window.addEventListener("deviceorientation", handleOrientation);
    };

    try {
      if (
        anyDeviceOrientation &&
        typeof anyDeviceOrientation.requestPermission === "function"
      ) {
        anyDeviceOrientation.requestPermission().then((state: string) => {
          if (state === "granted") addListener();
        });
      } else {
        addListener();
      }
    } catch {
      addListener();
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [isInNavigationMode]);

  // Map ref updated in onCameraChanged
  const mapRef = useRef<google.maps.Map | null>(null);
  // Camera control: navigation mode uses tilt/heading; otherwise follow-me pans to location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !providerLocation) return;
    if (isInNavigationMode) {
      const heading = deviceHeading ?? 0;
      // Zoom in to road level for navigation mode.
      map.moveCamera({ center: providerLocation, zoom: 20, heading, tilt: 45 });
    } else if (followMe) {
      map.panTo(providerLocation);
    }
  }, [providerLocation, followMe, isInNavigationMode, deviceHeading]);

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
      () => {
        setFollowMe(false);
        setIsInNavigationMode(false);
      },
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
      // Use the same base blue color as the main route for visual consistency
      pl.setOptions({
        strokeColor: mainStrokeColorRef.current,
        strokeOpacity: 0,
        strokeWeight: 4,
        icons: [{ icon: lineSymbol, offset: "0", repeat: "20px" } as any],
        clickable: true,
      });

      // attach listeners: click selects route and shows an info window; hover/touch highlight
      const clickLn = google.maps.event.addListener(pl, "click", (ev: any) => {
        setSelectedRouteIndex(idx);
        try {
          if (!altInfoWindowRef.current)
            altInfoWindowRef.current = new google.maps.InfoWindow();
          const route = directionsResponse?.routes[idx];
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
          const route = directionsResponse?.routes[idx];
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
  }, [directionsResponse, selectedRouteIndex]);

  // SECTION: Fit bounds to selected route
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

  // SECTION: Cleanup on unmount
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

  // SECTION: Destination coordinate resolution (fallback geocode)
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

  const handleStartService = async () => {
    if (!bookingId || isStartingService) return;

    try {
      setIsStartingService(true);
      const success = await startBookingById(bookingId);
      if (success) {
        const startTime = new Date().toISOString();
        localStorage.setItem(`activeServiceStartTime:${bookingId}`, startTime);
        navigate(
          `/provider/active-service/${bookingId}?startTime=${encodeURIComponent(startTime)}`,
        );
      }
    } catch (error) {
    } finally {
      setIsStartingService(false);
    }
  };

  if (!providerLocation) {
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

  const destinationHasCoords = !!destinationCoords;

  const toggleNavigationMode = () => {
    setIsInNavigationMode((prev) => {
      const next = !prev;
      const map = mapRef.current;
      if (next && map && providerLocation) {
        setFollowMe(true);
        map.moveCamera({ center: providerLocation, zoom: 18, tilt: 45 });
      } else if (!next && map) {
        map.moveCamera({ zoom: 15, tilt: 0, heading: 0 });
      }
      return next;
    });
  };

  return (
    <div className="relative h-screen w-screen">
      <MapView
        mapApiKey={mapApiKey}
        providerLocation={providerLocation}
        destinationCoords={destinationCoords}
        isInNavigationMode={isInNavigationMode}
        deviceHeading={deviceHeading}
        setMapRef={(m) => (mapRef.current = m)}
        destinationName={
          (booking as any)?.formattedLocation ||
          (booking as any)?.location ||
          null
        }
      />

      <ControlsOverlay
        destinationHasCoords={destinationHasCoords}
        destinationCoords={destinationCoords}
        directionsStatus={directionsStatus}
        destResolveStatus={destResolveStatus}
        directionsResponse={directionsResponse}
        selectedRouteIndex={selectedRouteIndex}
        setShowStreetView={setShowStreetView}
        followMe={followMe}
        setFollowMe={setFollowMe}
        isInNavigationMode={isInNavigationMode}
        toggleNavigationMode={toggleNavigationMode}
        handleStartService={handleStartService}
        isStartingService={isStartingService}
        mapRef={mapRef}
        providerLocation={providerLocation}
        navigateBack={() => navigate(-1)}
        destinationName={
          (booking as any)?.formattedLocation ||
          (booking as any)?.location ||
          null
        }
      />

      <StreetViewModal
        show={showStreetView}
        position={destinationCoords}
        onClose={() => setShowStreetView(false)}
      />

      {mapApiKey === "REPLACE_WITH_KEY" && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded bg-orange-500/90 px-3 py-1 text-[11px] font-semibold text-white shadow">
          Missing Google Maps API key
        </div>
      )}
    </div>
  );
};

export default ProviderDirectionsPage;
