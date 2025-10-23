import React from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  showWhenDisabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  showWhenDisabled = false,
}) => {
  if (showWhenDisabled) {
    return (
      <div className="group relative">
        {children}
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-800 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {content}
          <div className="absolute left-1/2 top-full -translate-x-1/2 transform border-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

export default Tooltip;
