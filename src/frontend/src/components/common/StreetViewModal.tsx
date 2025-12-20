import React, { useEffect } from "react";
import GStreetView from "./GMapFunctions/GStreetView";

interface StreetViewModalProps {
  show: boolean;
  position: google.maps.LatLngLiteral | null;
  onClose: () => void;
  showCloseButton?: boolean;
}

const StreetViewModal: React.FC<StreetViewModalProps> = ({
  show,
  position,
  onClose,
}) => {
  if (!show || !position) return null;

  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [show, onClose]);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="relative h-[80vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="h-full w-full">
          <GStreetView
            position={position}
            pov={{ heading: 0, pitch: 0 }}
            options={{
              addressControl: true,
              linksControl: true,
              panControl: true,
            }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    </div>
  );
};

export default StreetViewModal;
