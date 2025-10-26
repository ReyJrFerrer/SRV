import React from "react";

interface Props {
  className?: string;
}

const EnableLocationButton: React.FC<Props> = ({ className }) => {
  return (
    <button
      type="button"
      className={`rounded-md border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 ${className ?? ""}`}
      aria-label="Enable location"
    >
      Click to enable location
    </button>
  );
};

export default EnableLocationButton;
