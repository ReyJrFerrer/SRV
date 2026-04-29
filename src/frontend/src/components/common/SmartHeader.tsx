import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

interface SmartHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

const SmartHeader: React.FC<SmartHeaderProps> = ({
  title,
  showBackButton = true,
  onBack,
  rightAction,
  className = "",
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-gray-100 bg-white/90 px-4 py-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] backdrop-blur-md ${className}`}
    >
      <div className="mx-auto flex w-full max-w-screen-lg items-center justify-between">
        <div className="flex w-12 items-center justify-start">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100 active:scale-95"
              aria-label="Go back"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="flex flex-1 justify-center px-4">
          <h1 className="truncate text-xl font-bold text-gray-900">{title}</h1>
        </div>

        <div className="flex w-12 items-center justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  );
};

export default SmartHeader;
