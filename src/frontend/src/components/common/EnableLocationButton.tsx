import React from "react";
import { useLocationStore } from "../../store/locationStore";

interface Props {
  className?: string;
}

const EnableLocationButton: React.FC<Props> = ({ className }) => {
  const { requestLocation, locationLoading } = useLocationStore();

  const handleClick = async () => {
    try {
      await requestLocation();
    } catch {
      // store handles errors; we'll rely on status changes
    }
  };

  return (
    <>
      <button
        type="button"
        className={`rounded-md border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-60 ${className ?? ""}`}
        aria-label="Enable location"
        onClick={handleClick}
        disabled={locationLoading}
      >
        {locationLoading ? "Requesting..." : "Click to enable location"}
      </button>
    </>
  );
};

export default EnableLocationButton;
