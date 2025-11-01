import React, { useEffect, useState } from "react";
import { useLocationStore } from "../../store/locationStore";
import LocationBlockedModal from "./LocationBlockedModal";

interface Props {
  className?: string;
}

const EnableLocationButton: React.FC<Props> = ({ className }) => {
  const { requestLocation, locationStatus, locationLoading } =
    useLocationStore();
  const [awaitingGeoResult, setAwaitingGeoResult] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  useEffect(() => {
    if (!awaitingGeoResult) return;
    if (locationStatus === "denied") {
      setAwaitingGeoResult(false);
      setShowBlockedModal(true);
    } else if (locationStatus === "allowed" || locationStatus === "unsupported") {
      setAwaitingGeoResult(false);
    }
  }, [awaitingGeoResult, locationStatus]);

  const handleClick = async () => {
    setAwaitingGeoResult(true);
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
        {locationLoading && awaitingGeoResult
          ? "Requesting..."
          : "Click to enable location"}
      </button>
      <LocationBlockedModal
        visible={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
      />
    </>
  );
};

export default EnableLocationButton;
