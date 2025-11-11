import React, { useState } from "react";
import { PhoneIcon, InformationCircleIcon } from "@heroicons/react/24/solid";
import ClientReputationScore from "./ClientReputationScore";
import ClientRatingSummary from "./ClientRatingSummary";
import ClientRatingInfoModal from "../../common/ClientRatingInfoModal";

interface Props {
  providerImage: string;
  clientName: string;
  clientContact: string | undefined;
  clientId?: string;
  reviews: any;
  reputation: any;
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
  return (
    <div className="relative lg:min-w-[320px] max-w-md min-w-full flex-1 overflow-hidden rounded-2xl bg-white shadow-xl">
      {/* Header Section */}
      <div className="flex flex-col items-center gap-2 border-b border-blue-100 bg-gradient-to-r from-blue-100 to-yellow-50 p-8">
        {/* Profile Image */}
        <img
          src={providerImage}
          alt={`${clientName} profile`}
          className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/default-client.svg";
          }}
        />

        {/* Client Name */}
        <h2 className="mt-2 text-2xl font-bold text-slate-800">{clientName}</h2>

        {/* Reputation and Contact (Side-by-Side) */}
        <div className="mt-2 flex w-full flex-col items-center justify-center gap-2">
          {/* Reputation Score */}
          {clientId && <ClientReputationScore reputation={reputation} />}

          {/* Contact Info */}
          {clientContact && clientContact !== "Contact not available" && (
            <div className="flex items-center text-sm font-medium text-gray-600">
              <PhoneIcon className="mr-2 h-5 w-5 text-blue-500" />
              <span>{clientContact}</span>
            </div>
          )}
        </div>

        {/* Rating Summary (Bottom) */}
        {clientId && (
          <div className="mt-2 border-t border-blue-200 pt-2">
            <div className="flex items-center justify-between gap-2">
              <ClientRatingSummary reviews={reviews} />
              <button
                type="button"
                aria-label="About ratings"
                className="rounded-full p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={() => setShowRatingInfo(true)}
              >
                <InformationCircleIcon className="h-5 w-5 text-blue-500" />
              </button>
            </div>
          </div>
        )}
        <ClientRatingInfoModal
          isOpen={showRatingInfo}
          onClose={() => setShowRatingInfo(false)}
          role="provider"
        />
      </div>
    </div>
  );
};

export default ClientInfoCard;
