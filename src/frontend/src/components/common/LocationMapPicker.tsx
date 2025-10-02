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

interface LocationMapPickerProps {
  value?: { lat: number; lng: number; address?: string } | null;
  onChange: (loc: { lat: number; lng: number; address?: string }) => void;
  apiKey?: string; // optional override
  label?: string;
  highlight?: boolean; // highlight if validation failed
}

const libraries: "places"[] = ["places"];

const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  value,
  onChange,
  apiKey,
  label = "Map Location",
  highlight = false,
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

  const reverseGeocodeAndUpdate = useCallback(
    (pos: { lat: number; lng: number }) => {
      if (!geocoderRef.current && (window as any).google) {
        geocoderRef.current = new google.maps.Geocoder();
      }
      const geocoder = geocoderRef.current;
      if (geocoder) {
        geocoder.geocode({ location: pos }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            const address = results[0].formatted_address;
            if (inputRef.current) inputRef.current.value = address;
            onChange({ ...pos, address });
          } else {
            const fallbackAddress = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
            if (inputRef.current) inputRef.current.value = fallbackAddress;
            onChange({ ...pos, address: fallbackAddress });
          }
        });
      } else {
        // No geocoder available yet
        onChange(pos);
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
        const loc = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address,
        };
        setInternalPosition(loc);
        if (inputRef.current && place.formatted_address) {
          inputRef.current.value = place.formatted_address;
        }
        onChange(loc);
        map?.panTo(loc);
        map?.setZoom(15);
      }
    }
  };

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
      {value?.address && (
        <p className="truncate text-xs text-gray-500">{value.address}</p>
      )}
      <p className="text-[10px] text-gray-400">
        Click map or drag marker to refine. Powered by Google Maps.
      </p>
    </div>
  );
};

export default LocationMapPicker;
