import React from "react";
import { useLocationStore } from "../../../store/locationStore";

interface Props {
  className?: string;
}

const EnableLocationButton: React.FC<Props> = ({ className }) => {
  const { requestLocation, clearLocation, locationLoading, locationStatus } =
    useLocationStore();
  const isEnabled = locationStatus === "allowed";

  const handleToggle = async () => {
    try {
      if (locationLoading) return;
      if (isEnabled) {
        clearLocation();
      } else {
        await requestLocation();
      }
    } catch {
      // store handles errors; we'll rely on status changes
    }
  };

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        className={`flex items-center gap-3 rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${isEnabled ? "border-blue-600 bg-blue-600 text-white" : "border-blue-300 bg-white text-blue-700 hover:bg-blue-50"} ${className ?? ""}`}
        aria-label={isEnabled ? "Disable location" : "Enable location"}
        onClick={handleToggle}
        disabled={locationLoading}
      >
        <span>
          {locationLoading
            ? "Requesting..."
            : isEnabled
              ? "Disable Location"
              : "Enable Location"}
        </span>
        <span
          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${isEnabled ? "bg-white/40" : "bg-blue-200"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-4" : "translate-x-1"}`}
          />
        </span>
      </button>
    </>
  );
};

export default EnableLocationButton;
