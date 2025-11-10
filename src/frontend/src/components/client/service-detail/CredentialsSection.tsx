import React from "react";
import { DocumentCheckIcon, ClockIcon } from "@heroicons/react/24/outline";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";

interface CredentialsSectionProps {
  isVerified: boolean;
  hasCertificates: boolean;
  hasPendingCertificates: boolean;
}

const CredentialsSection: React.FC<CredentialsSectionProps> = ({
  isVerified,
  hasCertificates,
  hasPendingCertificates,
}) => {
  // Determine status and styling
  let statusText: string;
  let statusDescription: string;
  let borderColor: string;
  let bgColor: string;
  let iconColor: string;
  let Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;

  if (isVerified) {
    // At least one certificate is validated
    statusText = "Credentials Approved";
    statusDescription =
      "This provider's credentials have been verified and approved by our team.";
    borderColor = "border-green-200";
    bgColor = "bg-green-50";
    iconColor = "text-green-400";
    Icon = CheckBadgeIcon;
  } else if (hasCertificates && hasPendingCertificates) {
    // Certificates exist but are pending validation
    statusText = "Credentials Pending Approval";
    statusDescription =
      "This provider has submitted credentials that are awaiting admin review and approval.";
    borderColor = "border-yellow-200";
    bgColor = "bg-yellow-50";
    iconColor = "text-yellow-400";
    Icon = ClockIcon;
  } else if (hasCertificates) {
    // Certificates exist but all are rejected (edge case)
    statusText = "Credentials Under Review";
    statusDescription =
      "This provider's credentials are currently being reviewed.";
    borderColor = "border-yellow-200";
    bgColor = "bg-yellow-50";
    iconColor = "text-yellow-400";
    Icon = ClockIcon;
  } else {
    // No certificates uploaded
    statusText = "No Credentials Yet";
    statusDescription =
      "This provider has not uploaded any credentials yet. Once credentials are submitted and verified, they will have a badge here.";
    borderColor = "border-gray-200";
    bgColor = "bg-gray-50";
    iconColor = "text-gray-400";
    Icon = DocumentCheckIcon;
  }

  return (
    <div className="mt-8 rounded-xl bg-white p-6 shadow-lg">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
        <DocumentCheckIcon className="h-6 w-6 text-blue-400" /> Credentials
      </h3>
      <div
        className={`flex items-center rounded-lg border p-4 ${borderColor} ${bgColor}`}
      >
        <Icon className={`mr-4 h-10 w-10 ${iconColor}`} />
        <div>
          <p
            className={`font-semibold ${isVerified ? "text-green-700" : hasCertificates ? "text-yellow-700" : "text-gray-700"}`}
          >
            {statusText}
          </p>
          <p className="text-sm text-gray-500">{statusDescription}</p>
        </div>
      </div>
    </div>
  );
};

export default CredentialsSection;
