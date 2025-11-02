import React from "react";
import GStreetView from "../../common/GMapFunctions/GStreetView";

interface StreetViewModalProps {
  show: boolean;
  position: google.maps.LatLngLiteral | null;
  onClose: () => void;
}

const StreetViewModal: React.FC<StreetViewModalProps> = ({
  show,
  position,
  onClose,
}) => {
  if (!show || !position) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative h-[80vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <button
          className="absolute right-3 top-3 z-10 rounded-full border border-gray-400 bg-gray-200 p-2 hover:bg-gray-300"
          onClick={onClose}
          aria-label="Close Street View"
        >
          <span className="text-xl font-bold text-gray-700">&times;</span>
        </button>
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
