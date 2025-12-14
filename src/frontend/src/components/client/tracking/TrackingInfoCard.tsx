/**
 * TrackingInfoCard Component
 *
 * A Grab-style bottom sheet card that shows provider info, ETA, distance,
 * and action buttons for the client tracking experience.
 */

import React from "react";
import { ChatBubbleLeftIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ClockIcon, MapIcon } from "@heroicons/react/24/outline";

interface TrackingInfoCardProps {
  providerName: string;
  providerPhoto?: string | null;
  etaText?: string | null;
  distanceText?: string | null;
  lastUpdated?: number | null;
  isStale?: boolean;
  onChat?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  className?: string;
}

const TrackingInfoCard: React.FC<TrackingInfoCardProps> = ({
  providerName,
  providerPhoto,
  etaText,
  distanceText,
  lastUpdated,
  isStale = false,
  onChat,
  onCancel,
  onClose,
  className = "",
}) => {
  // Calculate time since last update
  const getLastUpdatedText = () => {
    if (!lastUpdated) return null;
    const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
    if (seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  // Calculate progress (rough estimate based on ETA)
  const getProgressPercent = () => {
    // This is a visual approximation - in production you'd track actual progress
    if (!etaText) return 30;
    const match = etaText.match(/(\d+)/);
    if (!match) return 50;
    const mins = parseInt(match[1], 10);
    if (mins > 30) return 20;
    if (mins > 15) return 40;
    if (mins > 5) return 60;
    return 80;
  };

  return (
    <div
      className={`mx-4 mb-4 rounded-3xl bg-white px-5 pb-6 pt-4 shadow-xl sm:mx-auto sm:max-w-md ${className}`}
    >
      {/* Provider Info Row */}
      <div className="mb-4 flex items-center gap-4">
        {/* Provider Photo */}
        <div className="relative">
          {providerPhoto ? (
            <img
              src={providerPhoto}
              alt={providerName}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-blue-500"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white ring-2 ring-blue-300">
              {providerName.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Online indicator */}
          <div
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
              isStale ? "bg-yellow-400" : "bg-green-500"
            }`}
          />
        </div>

        {/* Name and status */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{providerName}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span className={isStale ? "text-yellow-600" : "text-green-600"}>
              {isStale ? "Updating..." : "En Route"}
            </span>
            {lastUpdated && (
              <>
                <span className="mx-1 text-gray-400">•</span>
                <span>{getLastUpdatedText()}</span>
              </>
            )}
          </div>
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ETA and Distance */}
      <div className="mb-4 flex gap-4">
        {etaText && (
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-blue-50 px-4 py-3">
            <ClockIcon className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-gray-900">{etaText}</div>
              <div className="text-xs text-gray-500">Estimated arrival</div>
            </div>
          </div>
        )}
        {distanceText && (
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
            <MapIcon className="h-5 w-5 text-gray-600" />
            <div>
              <div className="text-lg font-bold text-gray-900">
                {distanceText}
              </div>
              <div className="text-xs text-gray-500">Distance away</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000"
            style={{ width: `${getProgressPercent()}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>Provider departed</span>
          <span>Arriving soon</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onChat && (
          <button
            onClick={onChat}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            <ChatBubbleLeftIcon className="h-5 w-5" />
            <span>Chat</span>
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-600 transition-colors hover:bg-red-100"
          >
            <XMarkIcon className="h-5 w-5" />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TrackingInfoCard;
