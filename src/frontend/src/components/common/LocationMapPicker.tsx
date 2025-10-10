import React, { useState, useCallback, useRef, useEffect } from "react";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "300px",
  borderRadius: "0.75rem",
};

const defaultCenter = { lat: 16.413, lng: 120.5914 }; // Manila fallback

interface StructuredLocation {
  lat: number;
  lng: number;
  address: string;
  rawName?: string;
  route?: string;
  barangay?: string; // sublocality/neighborhood
  city?: string;
  province?: string;
}

interface LocationMapPickerProps {
  value?: StructuredLocation | null;
  onChange: (loc: StructuredLocation) => void;
  label?: string;
  highlight?: boolean; // highlight if validation failed
  persistKey?: string; // localStorage key to persist last selection
}

// removed explicit libraries; APIProvider handles script loading

const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  value,
  onChange,
  label = "Map Location",
  highlight = false,
  persistKey,
}) => {
  const [internalPosition, setInternalPosition] = useState<{
    lat: number;
    lng: number;
  }>(value ? { lat: value.lat, lng: value.lng } : defaultCenter);
  const mapRef = useRef<google.maps.Map | null>(null); // Use a ref for the map instance
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const composeFormattedWithPlace = (
    rawName: string | undefined,
    formattedAddress: string | undefined,
  ): string => {
    let formatted = (formattedAddress || "").trim();
    // Remove leading Plus Code if present (e.g., "+2345+X7, ...")
    formatted = formatted.replace(/^\+[^,]+,\s*/i, "").trim();
    if (!formatted) return rawName || "";
    if (
      rawName &&
      rawName.trim() &&
      !formatted.toLowerCase().startsWith(rawName.trim().toLowerCase()) &&
      !formatted.toLowerCase().includes(rawName.trim().toLowerCase())
    ) {
      return `${rawName.trim()}, ${formatted}`;
    }
    return formatted;
  };

  const persistLocation = (loc: StructuredLocation) => {
    if (persistKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(persistKey, JSON.stringify(loc));
      } catch {}
    }
  };

  const reverseGeocodeAndUpdate = useCallback(
    (pos: { lat: number; lng: number }) => {
      if (!geocoderRef.current && (window as any).google) {
        geocoderRef.current = new google.maps.Geocoder();
      }
      const geocoder = geocoderRef.current;
      if (geocoder) {
        geocoder.geocode({ location: pos }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            const primary = results[0];
            const getComponent = (type: string): string => {
              const comp = primary.address_components?.find((c: any) =>
                c.types.includes(type),
              );
              return comp ? comp.long_name : "";
            };
            const rawName =
              getComponent("point_of_interest") ||
              getComponent("premise") ||
              getComponent("establishment") ||
              "";
            const route = getComponent("route");
            const barangay =
              getComponent("sublocality_level_1") ||
              getComponent("sublocality") ||
              getComponent("neighborhood") ||
              "";
            const city =
              getComponent("locality") ||
              getComponent("administrative_area_level_2") ||
              "";
            const province = getComponent("administrative_area_level_1") || "";
            // Primary strategy now: use Google's formatted address, optionally
            // prefixed with the raw place/establishment name if absent.
            let displayAddress = composeFormattedWithPlace(
              rawName,
              primary.formatted_address,
            );
            if (!displayAddress) {
              displayAddress = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
            }
            if (inputRef.current) inputRef.current.value = displayAddress;
            const structured: StructuredLocation = {
              lat: pos.lat,
              lng: pos.lng,
              address: displayAddress,
              rawName: rawName || undefined,
              route: route || undefined,
              barangay: barangay || undefined,
              city: city || undefined,
              province: province || undefined,
            };
            onChange(structured);
            persistLocation(structured);
          } else {
            const fallbackAddress = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
            if (inputRef.current) inputRef.current.value = fallbackAddress;
            const structured: StructuredLocation = {
              lat: pos.lat,
              lng: pos.lng,
              address: fallbackAddress,
            };
            onChange(structured);
            persistLocation(structured);
          }
        });
      } else {
        const structured: StructuredLocation = {
          lat: pos.lat,
          lng: pos.lng,
          address: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
        };
        onChange(structured);
      }
    },
    [onChange],
  );

  const onMapClick = useCallback(
    (e: any) => {
      // @vis.gl/react-google-maps wraps the native event; latLng is under e.detail
      const lat = e?.detail?.latLng?.lat?.();
      const lng = e?.detail?.latLng?.lng?.();
      if (typeof lat === "number" && typeof lng === "number") {
        const pos = { lat, lng };
        setInternalPosition(pos);
        reverseGeocodeAndUpdate(pos);
      }
    },
    [reverseGeocodeAndUpdate],
  );

  useEffect(() => {
    if (mapRef.current && value?.lat && value?.lng) {
      mapRef.current.panTo({ lat: value.lat, lng: value.lng });
      mapRef.current.setZoom(15);
    }
  }, [value, mapRef]);

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        // Build user-friendly address from components (avoid raw formatted address / plus codes)
        const rawName = place.name || "";
        const getAddressComponent = (type: string): string => {
          if (!place.address_components) return "";
          const comp = place.address_components.find((c: any) =>
            c.types.includes(type),
          );
          return comp ? comp.long_name : "";
        };
        const route = getAddressComponent("route");
        const barangay =
          getAddressComponent("sublocality_level_1") ||
          getAddressComponent("sublocality") ||
          getAddressComponent("neighborhood");
        const city =
          getAddressComponent("locality") ||
          getAddressComponent("administrative_area_level_2");
        const province = getAddressComponent("administrative_area_level_1");

        let displayAddress = composeFormattedWithPlace(
          rawName,
          place.formatted_address,
        );
        if (!displayAddress) {
          displayAddress = `${place.geometry.location
            .lat()
            .toFixed(5)}, ${place.geometry.location.lng().toFixed(5)}`;
        }
        const structured: StructuredLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: displayAddress,
          rawName: rawName || undefined,
          route: route || undefined,
          barangay: barangay || undefined,
          city: city || undefined,
          province: province || undefined,
        };
        setInternalPosition({ lat: structured.lat, lng: structured.lng });
        if (inputRef.current) inputRef.current.value = structured.address;
        onChange(structured);
        persistLocation(structured);
        mapRef.current?.panTo({ lat: structured.lat, lng: structured.lng });
        mapRef.current?.setZoom(17);
      }
    }
  };

  // Initialize native Places Autocomplete on the input (no @react-google-maps/api wrapper)
  useEffect(() => {
    let intervalId: number | null = null;
    const init = () => {
      if (autocompleteRef.current || !inputRef.current) return false;
      const g = (window as any).google;
      if (!g?.maps?.places) return false;
      try {
        autocompleteRef.current = new g.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: [
              "geometry",
              "name",
              "formatted_address",
              "address_components",
            ],
            types: ["geocode"],
            // You can add componentRestrictions here if needed
          },
        );
        // Listen for selection changes
        if (autocompleteRef.current) {
          placeListenerRef.current = autocompleteRef.current.addListener(
            "place_changed",
            onPlaceChanged,
          );
        }
        return true;
      } catch {
        return false;
      }
    };
    // Try to initialize immediately; if API not yet ready, poll briefly
    if (!init()) {
      intervalId = window.setInterval(() => {
        if (init()) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }, 200);
    }
    return () => {
      if (placeListenerRef.current) {
        placeListenerRef.current.remove();
        placeListenerRef.current = null;
      }
    };
  }, [onPlaceChanged]);

  // Load persisted location if available and no value provided
  React.useEffect(() => {
    if (!value && persistKey && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(persistKey);
        if (raw) {
          const parsed: StructuredLocation = JSON.parse(raw);
          if (parsed.lat && parsed.lng) {
            setInternalPosition({ lat: parsed.lat, lng: parsed.lng });
            onChange(parsed);
          }
        }
      } catch {}
    }
  }, [value, persistKey, onChange]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search location or drag the pin"
        className={`w-full rounded-lg border p-2 text-sm focus:border-blue-500 focus:outline-none ${highlight ? "border-red-500 ring-2 ring-red-200" : "border-gray-300"}`}
      />
      <div
        className={`rounded-xl ${highlight ? "border-2 border-red-500 ring-2 ring-red-200" : "border border-gray-200"}`}
        style={{ overflow: "hidden" }}
      >
        <Map
          style={containerStyle}
          defaultCenter={defaultCenter}
          defaultZoom={12}
          center={internalPosition}
          onCameraChanged={(ev) => (mapRef.current = ev.map)}
          onClick={onMapClick}
          disableDefaultUI={true}
          zoomControl={true}
          mapId={"6922634ff75ae05ac38cc473"}
        >
          <AdvancedMarker
            position={internalPosition}
            draggable={true}
            onDragEnd={(e) => {
              const lat = (e as any)?.detail?.latLng?.lat?.();
              const lng = (e as any)?.detail?.latLng?.lng?.();
              if (lat && lng) {
                const pos = { lat, lng };
                setInternalPosition(pos);
                reverseGeocodeAndUpdate(pos);
              }
            }}
          />
        </Map>
      </div>

      <p className="text-[10px] text-gray-400">
        Click map or drag marker to refine. Powered by Google Maps.
      </p>
    </div>
  );
};

export default LocationMapPicker;
