import React, { useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";

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
  apiKey?: string; // optional override
  label?: string;
  highlight?: boolean; // highlight if validation failed
  persistKey?: string; // localStorage key to persist last selection
}

const libraries: "places"[] = ["places"];

const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  value,
  onChange,
  apiKey,
  label = "Map Location",
  highlight = false,
  persistKey,
}) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [internalPosition, setInternalPosition] = useState<{
    lat: number;
    lng: number;
  }>(value ? { lat: value.lat, lng: value.lng } : defaultCenter);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Compose a display address that prioritizes Google's formatted_address, but
  // will prepend a place/establishment name (rawName) if it's available and
  // not already present at the start. We still strip any leading plus codes.
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
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setInternalPosition(pos);
      reverseGeocodeAndUpdate(pos);
    },
    [reverseGeocodeAndUpdate],
  );

  const onLoad = useCallback(
    (m: google.maps.Map) => {
      setMap(m);
      if (value?.lat && value?.lng) {
        m.panTo({ lat: value.lat, lng: value.lng });
        m.setZoom(15);
      }
    },
    [value],
  );

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
        map?.panTo({ lat: structured.lat, lng: structured.lng });
        map?.setZoom(17);
      }
    }
  };

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

  if (!isLoaded)
    return <div className="text-sm text-gray-500">Loading map...</div>;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <Autocomplete
        onLoad={(ac) => (autocompleteRef.current = ac)}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Search location or drag the pin"
          className={`w-full rounded-lg border p-2 text-sm focus:border-blue-500 focus:outline-none ${highlight ? "border-red-500 ring-2 ring-red-200" : "border-gray-300"}`}
        />
      </Autocomplete>
      <div
        className={`rounded-xl ${highlight ? "border-2 border-red-500 ring-2 ring-red-200" : "border border-gray-200"}`}
        style={{ overflow: "hidden" }}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          /* center will follow internalPosition state */
          center={internalPosition}
          zoom={12}
          onLoad={onLoad}
          onClick={onMapClick}
          options={{ disableDefaultUI: true, zoomControl: true }}
        >
          <Marker
            position={internalPosition}
            draggable
            onDragEnd={(e) => {
              const lat = e.latLng?.lat();
              const lng = e.latLng?.lng();
              if (lat && lng) {
                const pos = { lat, lng };
                setInternalPosition(pos);
                reverseGeocodeAndUpdate(pos);
              }
            }}
          />
        </GoogleMap>
      </div>

      <p className="text-[10px] text-gray-400">
        Click map or drag marker to refine. Powered by Google Maps.
      </p>
    </div>
  );
};

export default LocationMapPicker;
