/**
 * TrackingInfoCard Component
 *
 * A Grab-style bottom sheet card that shows provider info, ETA, distance,
 * and action buttons for the client tracking experience.
 */

import React from "react";
import {
  // ChatBubbleLeftIcon,
  // XMarkIcon,
  EyeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
interface TrackingInfoCardProps {
  providerName: string;
  providerPhoto?: string | null;
  etaText?: string | null;
  distanceText?: string | null;
  /** Remaining distance in meters between provider and destination */
  distanceMeters?: number | null;
  /** Original/total route distance in meters used to compute progress */
  totalDistanceMeters?: number | null;
  destinationName?: string | null;
  lastUpdated?: number | null;
  isStale?: boolean;
  onChat?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  onStreetView?: () => void;
  showStreetViewButton?: boolean;
  followMe?: boolean;
  setFollowMe?: (value: boolean) => void;
  onRecenter?: () => void;
  className?: string;
}

const TrackingInfoCard: React.FC<TrackingInfoCardProps> = ({
  providerName,
  providerPhoto,
  etaText,
  distanceText,
  destinationName,
  lastUpdated,
  isStale = false,
  // onChat,
  // onCancel,
  onStreetView,
  showStreetViewButton = false,
  followMe = false,
  setFollowMe,
  onRecenter,
  distanceMeters = null,
  totalDistanceMeters = null,
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
  // distance based progress
  const getProgressPercent = () => {
    if (
      typeof distanceMeters === "number" &&
      typeof totalDistanceMeters === "number" &&
      totalDistanceMeters > 0
    ) {
      const fraction = 1 - Math.max(0, Math.min(1, distanceMeters / totalDistanceMeters));
      const percent = Math.round(fraction * 100);
      return Math.max(0, Math.min(100, percent));
    }

    // Fallback: visual approximation based on ETA text
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
    <div className="absolute bottom-6 left-1/2 z-10 w-[90%] max-w-md -translate-x-1/2 space-y-3">
      {/* Street View Button - positioned above the card */}
      {showStreetViewButton && onStreetView && (
        <div className="flex w-full justify-end px-1">
          <button
            onClick={onStreetView}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-gray-700 shadow-lg ring-1 ring-gray-200 backdrop-blur hover:bg-white"
            title="Open Street View"
            aria-label="Open Street View"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        </div>
      )}
      {/* Follow me checkbox and recenter button */}
      {setFollowMe && onRecenter && (
        <div className="flex items-center justify-between px-1">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={followMe}
              onChange={(e) => setFollowMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Follow me
          </label>
          <button
            type="button"
            onClick={onRecenter}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-gray-700 shadow ring-1 ring-gray-200 hover:bg-white"
            title="Re-center map on provider"
            aria-label="Re-center map"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mx-4 mb-4 rounded-3xl bg-white px-5 pb-6 pt-4 shadow-xl sm:mx-auto sm:max-w-md">
        {(etaText || distanceText) && (
          <div className="text-center">
            {(etaText || distanceText) && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                  <div className="text-lg font-extrabold text-gray-900">
                    {etaText}
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="text-base font-semibold text-gray-700">
                    {distanceText}
                  </div>
                </div>
                {/** Destination name shown under ETA/distance */}
                {typeof destinationName === "string" &&
                  destinationName.trim() !== "" && (
                    <div className="mt-1 max-w-[90%] text-sm text-gray-600">
                      {destinationName}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={`mx-4 mb-4 rounded-3xl bg-white px-5 pb-6 pt-4 shadow-xl sm:mx-auto sm:max-w-md ${className}`}
      >
        {/* Provider Info Row */}
        <div className="mb-4 flex items-start gap-4">
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

          {/* Name, status, and ETA/Distance */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Provider name and ETA/Distance on same row */}
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {providerName}
                  </h3>
                </div>
                {/* Status and last updated */}
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span
                    className={isStale ? "text-yellow-600" : "text-green-600"}
                  >
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
            </div>
          </div>
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
        {/* <div className="flex gap-3">
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
        </div> */}
      </div>
    </div>
  );
};

export default TrackingInfoCard;
