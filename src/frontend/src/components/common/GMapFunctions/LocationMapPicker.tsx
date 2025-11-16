// Imports
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "300px",
  borderRadius: "0.75rem",
};

// Constants
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
  // State/Refs
  const [internalPosition, setInternalPosition] = useState<{
    lat: number;
    lng: number;
  }>(value ? { lat: value.lat, lng: value.lng } : baguioCenter);

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // Legacy PlacesService removed to avoid console warnings for new customers
  const autocompleteRef = useRef<
    google.maps.places.AutocompleteService | null
  >(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [predictions, setPredictions] = useState<
    (google.maps.places.PlaceResult | google.maps.places.AutocompletePrediction)[]
  >([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isLoadingPred, setIsLoadingPred] = useState<boolean>(false);
  const debounceRef = useRef<number | null>(null);

  // Helpers
  const normalizePlace = (place: any) => {
    if (!place) return null;
    const g = (window as any).google;
    const hasOld = place.geometry?.location;
    const hasNew = place.location;
    const location = hasOld
      ? place.geometry.location
      : hasNew && g
        ? {
            lat: () => (typeof place.location.lat === "function" ? place.location.lat() : place.location.lat),
            lng: () => (typeof place.location.lng === "function" ? place.location.lng() : place.location.lng),
          }
        : null;

    const address_components = place.address_components
      ? place.address_components
      : Array.isArray(place.addressComponents)
        ? place.addressComponents.map((c: any) => ({
            long_name: c.longText || c.long_name || c.name || "",
            short_name: c.shortText || c.short_name || c.name || "",
            types: c.types || [],
          }))
        : undefined;

    return {
      ...place,
      name: place.name || place.displayName?.text || place.displayName || place.primaryText?.text,
      formatted_address: place.formatted_address || place.formattedAddress || place.secondaryText?.text,
      address_components,
      geometry: location ? { location } : place.geometry,
    };
  };
  const composeFormattedWithPlace = (
    rawName: string | undefined,
    formattedAddress: string | undefined,
  ): string => {
    let formatted = (formattedAddress || "").trim();
    if (!formatted) return rawName || "";
    const parts = formatted
      .split(",")
      .map((p) => p.trim())
      .filter((p) => {
        if (!p) return false;
        // plus-code pattern like "2FH3+G4C" (alphanum + plus + alphanum)
        const plusCodeRegex = /^[A-Z0-9]{1,}\+[A-Z0-9]{1,}$/i;
        if (plusCodeRegex.test(p)) return false;
        // remove generic unnamed road tokens
        if (/^Unnamed\s+Road$/i.test(p)) return false;
        return true;
      });

    const cleaned = parts.join(", ");
    if (!cleaned) return rawName || "";
    if (
      rawName &&
      rawName.trim() &&
      !cleaned.toLowerCase().includes(rawName.trim().toLowerCase())
    ) {
      return `${rawName.trim()}, ${cleaned}`;
    }
    return cleaned;
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

      mapRef.current?.panTo({ lat: structured.lat, lng: structured.lng });
      mapRef.current?.setZoom(17);
    },
    [onChange, persistLocation],
  );

  // Effects
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    try {
      mapRef.current.panTo(internalPosition);
      // Only bump zoom if the map is currently at a very low zoom
      const currentZoom = mapRef.current.getZoom?.() ?? 0;
      if ((currentZoom ?? 0) < 15) mapRef.current.setZoom(16);
    } catch {}
  }, [mapReady, internalPosition]);

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

  const fetchPlaceById = useCallback(async (placeId: string): Promise<any | null> => {
    const g = (window as any).google;
    try {
      if (g?.maps?.places?.Place) {
        const place = new g.maps.places.Place({ id: placeId });
        await place.fetchFields({
          fields: [
            "id",
            "displayName",
            "formattedAddress",
            "location",
            "addressComponents",
          ],
        });
        return normalizePlace(place);
      }
    } catch {}
    // If new Place API is unavailable, fall back to reverse geocode only
    return null;
  }, []);

  const onMapClick = useCallback(
    async (e: any) => {
      try {
        if ((e?.placeId || e?.detail?.placeId) && typeof e?.stop === "function") {
          e.stop();
        }
      } catch {}
      const placeId = e?.placeId || e?.detail?.placeId;
      if (placeId) {
        const detailed = await fetchPlaceById(placeId);
        if (detailed) {
          processPlaceDetails(detailed);
          return;
        }
      }

      const ll = (e?.detail?.latLng || e?.latLng) as any;
      const lat = typeof ll?.lat === "function" ? ll.lat() : ll?.lat;
      const lng = typeof ll?.lng === "function" ? ll.lng() : ll?.lng;
      if (typeof lat === "number" && typeof lng === "number") {
        const pos = { lat, lng };
        setInternalPosition(pos);
        reverseGeocodeAndUpdate(pos);
      }
    },
    [reverseGeocodeAndUpdate, processPlaceDetails, fetchPlaceById],
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

    // Prefer AutocompleteService
    if (!autocompleteRef.current && g?.maps?.places?.AutocompleteService) {
      autocompleteRef.current = new g.maps.places.AutocompleteService();
    }

    setIsLoadingPred(true);

    if (autocompleteRef.current?.getPlacePredictions) {
      const bias: any = {
        center: new g.maps.LatLng(baguioCenter.lat, baguioCenter.lng),
        radius: 15000,
      };
      try {
        autocompleteRef.current.getPlacePredictions(
          { input: query, locationBias: bias },
          (preds: any[] | null) => {
            setIsLoadingPred(false);
            if (preds && preds.length) {
              setPredictions(preds as any);
              setShowDropdown(true);
            } else {
              setPredictions([]);
              setShowDropdown(false);
            }
          },
        );
        return;
      } catch {}
    }

    // No legacy fallback: if Autocomplete is unavailable, clear results
    setIsLoadingPred(false);
    setPredictions([]);
    setShowDropdown(false);
  }, []);

  const onSelectPrediction = useCallback(
    async (
      pred:
        | google.maps.places.PlaceResult
        | google.maps.places.AutocompletePrediction
        | any,
    ) => {
      setShowDropdown(false);
      setPredictions([]);

      if (pred && (pred as any).place_id && !(pred as any).geometry) {
        const detailed = await fetchPlaceById((pred as any).place_id);
        if (detailed) {
          processPlaceDetails(detailed);
          return;
        }
      }
      processPlaceDetails(normalizePlace(pred));
    },
    [processPlaceDetails, fetchPlaceById],
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
                  <p className="font-medium text-gray-800">
                    {(p as any).name || (p as any).structured_formatting?.main_text || (p as any).description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(p as any).formatted_address || (p as any).structured_formatting?.secondary_text || ""}
                  </p>
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
          defaultZoom={18}
          onCameraChanged={(ev) => {
            mapRef.current = ev.map;
            setMapReady(true);
          }}
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
                // Pan the map to the new marker position without forcing zoom changes
                try {
                  mapRef.current?.panTo(pos);
                } catch {}
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
