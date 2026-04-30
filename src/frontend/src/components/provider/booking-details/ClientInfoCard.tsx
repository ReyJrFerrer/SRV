import React, { useState } from "react";
import { PhoneIcon } from "@heroicons/react/24/solid";
import ClientReputationScore from "./ClientReputationScore";
import ClientRatingSummary from "./ClientRatingSummary";
import ClientRatingInfoModal from "../../common/ClientRatingInfoModal";

interface Props {
  providerImage: string;
  clientName: string;
  clientContact?: string;
  clientId?: string;
  reviews?: any;
  reputation?: any;
}

const ClientInfoCard: React.FC<Props> = ({
  providerImage,
  clientName,
  clientContact,
  clientId,
  reviews,
  reputation,
}) => {
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  const hasClientData = (reviews && reviews.length > 0) || reputation !== null;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
 

      <div className="p-5">
        {/* Profile Image - centered with ring effect */}
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={providerImage}
              alt={`${clientName} profile`}
              className="h-24 w-24 rounded-full object-cover shadow-md ring-4 ring-blue-50"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-client.svg";
              }}
            />
          </div>
        </div>

        {/* Client Name */}
        <div className="mt-4 text-center">
          <h2 className="text-xl font-bold text-gray-900">{clientName}</h2>
        </div>

        {/* Contact Info */}
        {clientContact && clientContact !== "Contact not available" && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600">
            <PhoneIcon className="h-4 w-4 text-blue-500" />
            <span>{clientContact}</span>
          </div>
        )}

        {/* Divider */}
        <div className="mt-5 border-t border-gray-100" />

        {/* Stats Section */}
        <div className="mt-4 flex items-center justify-center gap-6">
          {/* Reputation Score */}
          {clientId && reputation && (
            <div className="text-center">
              <ClientReputationScore reputation={reputation} />
            </div>
          )}

          {/* Rating */}
          {clientId && (
            <div className="flex items-center gap-2">
              {hasClientData ? (
                <ClientRatingSummary reviews={reviews} />
              ) : (
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              )}
              <button
                type="button"
                aria-label="About ratings"
                className="rounded-full p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={() => setShowRatingInfo(true)}
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <ClientRatingInfoModal
        isOpen={showRatingInfo}
        onClose={() => setShowRatingInfo(false)}
        role="provider"
      />
    </div>
  );
};

export default ClientInfoCard;