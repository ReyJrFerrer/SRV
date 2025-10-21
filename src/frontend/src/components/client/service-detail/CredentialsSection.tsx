import React from "react";
import { DocumentCheckIcon } from "@heroicons/react/24/outline";

const CredentialsSection: React.FC<{ isVerified: boolean }> = ({ isVerified }) => (
  <div className="mt-8 rounded-xl bg-white p-6 shadow-lg">
    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
      <DocumentCheckIcon className="h-6 w-6 text-blue-400" /> Credentials
    </h3>
    <div
      className={`flex items-center rounded-lg p-4 ${isVerified ? "border border-blue-200 bg-blue-50" : "border border-yellow-200 bg-yellow-50"}`}
    >
      <DocumentCheckIcon
        className={`mr-4 h-10 w-10 ${isVerified ? "text-blue-400" : "text-yellow-400"}`}
      />
      <div>
        <p className={`font-semibold ${isVerified ? "text-blue-700" : "text-yellow-700"}`}>
          {isVerified ? "Provider Verified" : "No Credentials Yet"}
        </p>
        <p className="text-sm text-gray-500">
          {isVerified
            ? "Credentials have been successfully verified."
            : "This provider has not uploaded any credentials yet. Once credentials are submitted and verified, they will be displayed here."}
        </p>
      </div>
    </div>
  </div>
);

export default CredentialsSection;
