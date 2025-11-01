import React, { useEffect, useMemo, useState } from "react";
import { useLocationStore } from "../../store/locationStore";
import phLocations from "../../data/ph_locations.json";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const LocationBlockedModal: React.FC<Props> = ({ visible, onClose }) => {
  const { userAddress, userProvince, setAddress, setAddressMode, setDisplayAddress } =
    useLocationStore();

  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState<string>("");

  // Prefill from any existing values
  useEffect(() => {
    if (userProvince) setProvince(userProvince);
    if (userAddress) setCity(userAddress);
  }, [userAddress, userProvince]);

  const cityOptions = useMemo(() => {
    if (!province) return [] as string[];
    const prov = (phLocations as any).provinces?.find((p: any) => p.name === province);
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

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-gray-700 hover:bg-gray-200"
          onClick={onClose}
        >
          ×
        </button>

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
          <h2 className="mb-2 text-center text-xl font-bold text-blue-800">Choose your location</h2>
          <p className="mb-4 text-center text-sm text-gray-600">
            Your browser blocked location access. Select your City/Municipality and Province so we can
            show nearby services.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-blue-700">Province</label>
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
              <label className="mb-1 block text-sm font-medium text-blue-700">City / Municipality</label>
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

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              disabled={!province || !city}
              onClick={handleSave}
            >
              Save location
            </button>
            <button
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              Continue without location
            </button>
          </div>
          <div className="mt-3 text-center text-xs text-gray-500">
            You can enable GPS later to refine your exact position.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationBlockedModal;
