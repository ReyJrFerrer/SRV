const GMAPS_GEOCODE_CACHE_TTL_MS = 2 * 60 * 1000;

export interface GeocodingResult {
  displayAddress: string;
  locality: string;
  province: string;
}

const findAddressComponent = (
  components: any[],
  type: string,
): string | undefined => {
  const c = components.find(
    (cc: any) => cc.types && cc.types.indexOf(type) !== -1,
  );
  return c ? c.long_name : undefined;
};

const normalizePhilippinesAddress = (
  locality: string,
  province: string,
): { locality: string; province: string } => {
  const locLower = locality.toLowerCase();
  const provLower = province.toLowerCase();

  if (locLower === "baguio" || locLower === "baguio city") {
    if (
      provLower.includes("cordillera") ||
      provLower.includes("car") ||
      provLower === "region"
    ) {
      return {
        locality: "Baguio City",
        province: "Benguet",
      };
    }
  }

  return { locality, province };
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<GeocodingResult> => {
  const cacheKey = `gmaps_${latitude}_${longitude}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        displayAddress: string;
        locality: string;
        province: string;
        ts: number;
      };
      if (parsed && Date.now() - parsed.ts < GMAPS_GEOCODE_CACHE_TTL_MS) {
        return {
          displayAddress: parsed.displayAddress,
          locality: parsed.locality,
          province: parsed.province,
        };
      }
    }
  } catch {}

  return new Promise((resolve, reject) => {
    const geocoder = new (window as any).google.maps.Geocoder();

    geocoder.geocode(
      { location: { lat: latitude, lng: longitude } },
      (results: any, status: string) => {
        if (status === "OK" && results && results[0]) {
          const comps = results[0].address_components || [];

          const premise =
            findAddressComponent(comps, "premise") ||
            findAddressComponent(comps, "subpremise") ||
            findAddressComponent(comps, "establishment") ||
            findAddressComponent(comps, "point_of_interest");
          const streetNumber = findAddressComponent(comps, "street_number");
          const route = findAddressComponent(comps, "route");

          const barangay =
            findAddressComponent(comps, "sublocality_level_2") ||
            findAddressComponent(comps, "sublocality") ||
            findAddressComponent(comps, "neighborhood");

          const rawLocality =
            findAddressComponent(comps, "locality") ||
            findAddressComponent(comps, "postal_town") ||
            findAddressComponent(comps, "administrative_area_level_3") ||
            findAddressComponent(comps, "administrative_area_level_2");

          const rawProvince =
            findAddressComponent(comps, "administrative_area_level_2") ||
            findAddressComponent(comps, "administrative_area_level_1");

          const normalized = normalizePhilippinesAddress(
            rawLocality || "Unknown",
            rawProvince || "",
          );

          const line1 =
            premise ||
            (streetNumber && route
              ? `${streetNumber} ${route}`
              : route || streetNumber);

          const parts: string[] = [];
          if (line1) parts.push(line1);
          if (barangay) parts.push(barangay);
          if (normalized.locality) parts.push(normalized.locality);
          if (normalized.province) parts.push(normalized.province);

          const displayAddress =
            parts.length > 0 ? parts.join(", ") : results[0].formatted_address;

          const result: GeocodingResult = {
            displayAddress,
            locality: normalized.locality,
            province: normalized.province,
          };

          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({ ...result, ts: Date.now() }),
            );
          } catch {}

          resolve(result);
        } else {
          reject(new Error("Geocoding failed"));
        }
      },
    );
  });
};

export const isGoogleMapsApiLoaded = (): boolean => {
  return !!(window as any).google?.maps;
};
