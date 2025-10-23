import React from "react";
import { PhoneIcon } from "@heroicons/react/24/solid";
import ClientReputationScore from "./ClientReputationScore";
import ClientRatingSummary from "./ClientRatingSummary";

interface Props {
  providerImage: string;
  clientName: string;
  clientContact: string | undefined;
  clientId?: string;
}

const ClientInfoCard: React.FC<Props> = ({ providerImage, clientName, clientContact, clientId }) => {
  return (
    <div className="relative min-w-[320px] max-w-md flex-1 overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="flex flex-col items-center gap-2 border-b border-blue-100 bg-gradient-to-r from-blue-100 to-yellow-50 px-6 py-8">
        <img
          src={providerImage}
          alt="Client"
          className="h-24 w-24 rounded-full border-4 border-white bg-gray-100 object-cover shadow-md"
          onError={(e) => { (e.target as HTMLImageElement).src = "/default-client.svg"; }}
        />
        <h2 className="w-full text-center text-2xl font-bold text-slate-800">{clientName}</h2>
        <div className="flex w-full flex-col items-center sm:mt-2">
          <div className="flex items-center gap-2">
            {clientId && <ClientReputationScore clientId={clientId} />}
            {clientId && <ClientRatingSummary clientId={clientId} />}
          </div>
          {clientContact && clientContact !== "Contact not available" && (
            <div className="mt-1 flex items-center text-sm font-medium text-gray-600">
              <PhoneIcon className="mr-2 h-5 w-5 text-blue-500" />
              <span>{clientContact}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientInfoCard;
