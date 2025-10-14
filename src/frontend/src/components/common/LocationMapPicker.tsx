// Component: LocationMapPicker
// Purpose: Pin/search control for selecting a precise map location with reverse geocoding.
// Inputs: props.value (StructuredLocation | null), props.highlight, props.label, props.persistKey
// Outputs: onChange(StructuredLocation) with lat/lng and a user-friendly address
// Side effects: persists to localStorage when persistKey is provided
// Dependencies: @vis.gl/react-google-maps Map/AdvancedMarker; Google Maps JS (Places + Geocoder)
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "300px",
  borderRadius: "0.75rem",
};

// Center of Baguio City for location biasing
const baguioCenter = { lat: 16.4023, lng: 120.596 };

interface StructuredLocation {
  lat: number;
  lng: number;
  address: string;
  rawName?: string;
  route?: string;
  barangay?: string;
  city?: string;
  province?: string;
}

interface LocationMapPickerProps {
  value?: StructuredLocation | null;
  onChange: (loc: StructuredLocation) => void;
  label?: string;
  highlight?: boolean;
  persistKey?: string;
}

const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  value,
  onChange,
  label = "Map Location",
  highlight = false,
  persistKey,
}) => {
  // SECTION: State/Refs
  const [internalPosition, setInternalPosition] = useState<{
    lat: number;
    lng: number;
  }>(value ? { lat: value.lat, lng: value.lng } : baguioCenter);

  const mapRef = useRef<google.maps.Map | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
    null,
  );
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [predictions, setPredictions] = useState<
    google.maps.places.PlaceResult[]
  >([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isLoadingPred, setIsLoadingPred] = useState<boolean>(false);
  const debounceRef = useRef<number | null>(null);

  // SECTION: Helpers
  const composeFormattedWithPlace = (
    rawName: string | undefined,
    formattedAddress: string | undefined,
  ): string => {
    let formatted = (formattedAddress || "")
      .trim()
      .replace(/^\+[^,]+,\s*/i, "");
    if (!formatted) return rawName || "";
    if (
      rawName &&
      rawName.trim() &&
      !formatted.toLowerCase().includes(rawName.trim().toLowerCase())
    ) {
      return `${rawName.trim()}, ${formatted}`;
    }
    return formatted;
  };

  const persistLocation = (loc: StructuredLocation) => {
    if (persistKey) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(loc));
      } catch {}
    }
  };

  const processPlaceDetails = useCallback(
    (
      place: google.maps.places.PlaceResult | google.maps.GeocoderResult | any,
    ) => {
      if (!place?.geometry?.location) return;

      const getComponent = (type: string): string => {
        const comp = place.address_components?.find((c: any) =>
          c.types.includes(type),
        );
        return comp ? comp.long_name : "";
      };

      const structured: StructuredLocation = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: composeFormattedWithPlace(
          (place as any).name,
          place.formatted_address,
        ),
        rawName: (place as any).name,
        route: getComponent("route"),
        barangay:
          getComponent("sublocality_level_1") || getComponent("neighborhood"),
        city:
          getComponent("locality") ||
          getComponent("administrative_area_level_2"),
        province: getComponent("administrative_area_level_1"),
      };

      setInternalPosition({ lat: structured.lat, lng: structured.lng });
      setSearchText(structured.address);
      onChange(structured);
      persistLocation(structured);

      // Only adjust camera on selection to focus the chosen place.
      mapRef.current?.panTo({ lat: structured.lat, lng: structured.lng });
      mapRef.current?.setZoom(17);
    },
    [onChange, persistLocation],
  );

  const reverseGeocodeAndUpdate = useCallback(
    (pos: { lat: number; lng: number }) => {
      if (!geocoderRef.current && (window as any).google) {
        geocoderRef.current = new (window as any).google.maps.Geocoder();
      }
      geocoderRef.current?.geocode({ location: pos }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          processPlaceDetails(results[0]);
        } else {
          const fallbackAddress = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
          setSearchText(fallbackAddress);
          const structured = {
            lat: pos.lat,
            lng: pos.lng,
            address: fallbackAddress,
          } as StructuredLocation;
          onChange(structured);
          persistLocation(structured);
        }
      });
    },
    [onChange, persistLocation, processPlaceDetails],
  );

  const onMapClick = useCallback(
    (e: any) => {
      const ll = (e?.detail?.latLng || e?.latLng) as any;
      const lat = typeof ll?.lat === "function" ? ll.lat() : ll?.lat;
      const lng = typeof ll?.lng === "function" ? ll.lng() : ll?.lng;
      if (typeof lat === "number" && typeof lng === "number") {
        const pos = { lat, lng };
        setInternalPosition(pos);
        reverseGeocodeAndUpdate(pos);
      }
    },
    [reverseGeocodeAndUpdate],
  );

  useEffect(() => {
    if (value?.lat && value?.lng) {
      const latChanged = Math.abs(value.lat - internalPosition.lat) > 1e-7;
      const lngChanged = Math.abs(value.lng - internalPosition.lng) > 1e-7;
      if (latChanged || lngChanged) {
        setInternalPosition({ lat: value.lat, lng: value.lng });
      }
    }
  }, [value?.lat, value?.lng, internalPosition.lat, internalPosition.lng]);

  const fetchPredictions = useCallback((query: string) => {
    const g = (window as any).google;
    if (!query.trim() || !g?.maps?.places) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    if (!placesServiceRef.current) {
      const target = mapRef.current || document.createElement("div");
      placesServiceRef.current = new g.maps.places.PlacesService(target);
    }
    if (!placesServiceRef.current) return;

    setIsLoadingPred(true);
    const request: google.maps.places.TextSearchRequest = {
      query: query,
      location: new g.maps.LatLng(baguioCenter.lat, baguioCenter.lng),
      radius: 15000, // 15km radius around Baguio
      region: "ph",
    };

    placesServiceRef.current.textSearch(
      request,
      (
        results: google.maps.places.PlaceResult[] | null,
        status: google.maps.places.PlacesServiceStatus,
      ) => {
        if (status === g.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setShowDropdown(true);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
        setIsLoadingPred(false);
      },
    );
  }, []);

  const onSelectPrediction = useCallback(
    (place: google.maps.places.PlaceResult) => {
      setShowDropdown(false);
      setPredictions([]);
      processPlaceDetails(place);
    },
    [processPlaceDetails],
  );

  useEffect(() => {
    if (!value && persistKey) {
      try {
        const raw = localStorage.getItem(persistKey);
        if (raw) {
          const parsed: StructuredLocation = JSON.parse(raw);
          if (parsed.lat && parsed.lng) {
            setInternalPosition({ lat: parsed.lat, lng: parsed.lng });
            onChange(parsed);
            if (parsed.address) setSearchText(parsed.address);
          }
        }
      } catch {}
    }
  }, [value, persistKey, onChange]);

  useEffect(() => {
    if (value?.address) {
      setSearchText(value.address);
    }
  }, [value?.address]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        <input
          value={searchText}
          onChange={(e) => {
            const val = e.target.value;
            setSearchText(val);
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(
              () => fetchPredictions(val),
              300,
            );
            setShowDropdown(true);
          }}
          onFocus={() => searchText && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          type="text"
          placeholder="Search location or drag the pin"
          className={`w-full rounded-lg border p-2 text-sm focus:border-blue-500 focus:outline-none ${
            highlight ? "border-red-500 ring-2 ring-red-200" : "border-gray-300"
          }`}
        />
        {showDropdown && (predictions.length > 0 || isLoadingPred) && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg">
            {isLoadingPred && (
              <div className="px-3 py-2 text-gray-500">Searching…</div>
            )}
            {!isLoadingPred &&
              predictions.map((p) => (
                <button
                  type="button"
                  key={p.place_id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectPrediction(p)}
                  className="block w-full cursor-pointer px-3 py-2 text-left hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.formatted_address}</p>
                </button>
              ))}
          </div>
        )}
      </div>

      <div
        className={`rounded-xl ${highlight ? "border-2 border-red-500 ring-2 ring-red-200" : "border border-gray-200"}`}
        style={{ overflow: "hidden" }}
      >
        <Map
          style={containerStyle}
          defaultCenter={baguioCenter}
          defaultZoom={12}
          center={internalPosition}
          onCameraChanged={(ev) => (mapRef.current = ev.map)}
          onClick={onMapClick}
          disableDefaultUI={true}
          zoomControl={true}
          mapId={"6922634ff75ae05ac38cc473"}
          gestureHandling="greedy"
        >
          <AdvancedMarker
            position={internalPosition}
            draggable={true}
            onDragEnd={(e: any) => {
              const ll = (e?.detail?.latLng || e?.latLng) as any;
              const lat = typeof ll?.lat === "function" ? ll.lat() : ll?.lat;
              const lng = typeof ll?.lng === "function" ? ll.lng() : ll?.lng;
              if (typeof lat === "number" && typeof lng === "number") {
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
