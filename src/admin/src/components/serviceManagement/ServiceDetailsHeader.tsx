import React from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

interface ServiceDetailsHeaderProps {
  onBackClick: () => void;
}

export const ServiceDetailsHeader: React.FC<ServiceDetailsHeaderProps> = ({
  onBackClick,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="relative flex w-full items-center px-4 py-3">
        <button
          onClick={onBackClick}
          className="rounded-full p-2 transition-colors hover:bg-blue-100"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold tracking-tight text-black">
          Service Details
        </h1>
      </div>
    </header>
  );
};
