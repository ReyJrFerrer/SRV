import React from "react";

export interface TooltipProps {
  children: React.ReactNode;
  content: string;
  showWhenDisabled?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

// Shared Tooltip with consistent API across app.
// Usage: <Tooltip content="..." showWhenDisabled={bool}><button disabled>...</button></Tooltip>
const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  showWhenDisabled = false,
  side = "top",
  className,
}) => {
  const positionClass = (() => {
    switch (side) {
      case "bottom":
        return "top-full mt-2 left-1/2 -translate-x-1/2";
      case "left":
        return "right-full mr-2 top-1/2 -translate-y-1/2";
      case "right":
        return "left-full ml-2 top-1/2 -translate-y-1/2";
      case "top":
      default:
        return "bottom-full mb-2 left-1/2 -translate-x-1/2";
    }
  })();

  return (
    <div
      className={`group relative align-middle${className ? ` ${className}` : ""}`}
    >
      {children}
      {showWhenDisabled && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-2 text-sm text-white opacity-0 shadow transition-opacity duration-200 group-hover:opacity-100 ${positionClass}`}
        >
          {content}
          {/* Arrow */}
          {side === "top" && (
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
          )}
          {side === "bottom" && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800" />
          )}
          {side === "left" && (
            <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-800" />
          )}
          {side === "right" && (
            <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
          )}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
