import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocationStore } from "../../../store/locationStore";
import phLocations from "../../../data/ph_locations.json";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const LocationBlockedModal: React.FC<Props> = ({ visible, onClose }) => {
  const {
    userAddress,
    userProvince,
    locationStatus,
    setAddress,
    setAddressMode,
    setDisplayAddress,
  } = useLocationStore();

  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [geoPermission, setGeoPermission] = useState<string>("unknown");
  const [suppressed, setSuppressed] = useState<boolean>(false);

  // Load suppression flag (avoid flashing after success within same session)
  useEffect(() => {
    try {
      const sup = localStorage.getItem("loc_block_modal_suppress");
      if (sup === "1") setSuppressed(true);
    } catch {}
  }, []);

  // Observe geolocation permission; auto-dismiss when not denied
  useEffect(() => {
    let isMounted = true;
    const checkPermission = async () => {
      if (typeof navigator === "undefined" || !(navigator as any).permissions)
        return;
      try {
        const status: PermissionStatus = await (
          navigator as any
        ).permissions.query({ name: "geolocation" });
        if (!isMounted) return;
        setGeoPermission(status.state);
        const handleChange = () => {
          if (!isMounted) return;
          setGeoPermission(status.state);
          if (status.state !== "denied") {
            // Close and suppress modal when user allows or reverts permission
            try {
              localStorage.setItem("loc_block_modal_suppress", "1");
            } catch {}
            if (visible) onClose();
          }
        };
        status.onchange = handleChange;
      } catch {
        // Ignore errors (older browsers)
      }
    };
    checkPermission();
    return () => {
      isMounted = false;
    };
  }, [visible, onClose]);

  // Auto-dismiss if store already has a derived address & permission not explicitly denied
  useEffect(() => {
    if (!visible) return;
    const hasContextLocation = !!userAddress && !!userProvince;
    if (hasContextLocation && geoPermission !== "denied") {
      try {
        localStorage.setItem("loc_block_modal_suppress", "1");
      } catch {}
      onClose();
    }
  }, [visible, userAddress, userProvince, geoPermission, onClose]);

  // Prefill from any existing values
  useEffect(() => {
    if (userProvince) setProvince(userProvince);
    if (userAddress) setCity(userAddress);
  }, [userAddress, userProvince]);

  const cityOptions = useMemo(() => {
    if (!province) return [] as string[];
    const prov = (phLocations as any).provinces?.find(
      (p: any) => p.name === province,
    );
    if (prov && Array.isArray(prov.municipalities)) {
      return prov.municipalities.map((m: any) => m.name);
    }
    return [] as string[];
  }, [province]);

  const handleSave = () => {
    if (!province || !city) return;
    // Persist to global store so header and booking can use it
    setAddressMode("manual");
    setAddress(city, province);
    setDisplayAddress(`${city}, ${province}`);
    onClose();
  };

  // Guard: show whenever explicitly requested and underlying geolocation permission is denied.
  const permissionDenied =
    geoPermission === "denied" || locationStatus === "denied";
  const shouldShow = visible && !suppressed && permissionDenied;

  if (!shouldShow) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Close button removed - modal requires user to pick a location */}

        {/* Character */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <img
            src="/images/srv characters (SVG)/tech guy.svg"
            alt="SRV Character"
            className="h-20 w-20 rounded-full border-4 border-white bg-blue-100 shadow-lg"
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className="mt-12">
          <h2 className="mb-2 text-center text-xl font-bold text-blue-800">
            Choose your location
          </h2>
          <p className="mb-4 text-center text-sm text-gray-600">
            Your browser blocked location access. Select your City/Municipality
            and Province so we can show nearby services.
          </p>
          <p className="mb-3 text-center text-xs text-gray-500">
            Note: If you want the app to use your device GPS instead of manual
            selection, enable location access for this site in your browser
            settings (Site settings → Location).
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-blue-700">
                Province
              </label>
              <select
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setCity("");
                }}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Province</option>
                {Array.isArray((phLocations as any).provinces) &&
                  (phLocations as any).provinces.map((prov: any) => (
                    <option key={prov.name} value={prov.name}>
                      {prov.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-blue-700">
                City / Municipality
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!province}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm capitalize disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">Select City / Municipality</option>
                {cityOptions.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="w-full max-w-xs">
              <button
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                disabled={!province || !city}
                onClick={handleSave}
              >
                Save location
              </button>
            </div>
          </div>
          <div className="mt-3 text-center text-xs text-gray-500">
            You can enable GPS later to refine your exact position.
          </div>
        </div>
      </div>
    </div>
  );

  // Render via portal to avoid being clipped by header or parent stacking contexts
  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default LocationBlockedModal;
