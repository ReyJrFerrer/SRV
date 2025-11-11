import React from "react";
import { DocumentIcon } from "@heroicons/react/24/solid";
import { useServiceCertificates } from "../../../frontend/src/hooks/useMediaLoader";

interface CertificateCardProps {
  service: {
    serviceId: string;
    serviceTitle: string;
    providerId: any;
    providerName?: string;
    certificateUrls: string[];
    createdAt: number | bigint;
  };
  certificateUrl: string;
  certificateIndex: number;
  onViewCertificate: (url: string) => void;
  onApprove: (
    service: any,
    certificateIndex: number,
    certificateUrl: string,
  ) => void;
  onReject: (
    service: any,
    certificateIndex: number,
    certificateUrl: string,
  ) => void;
  onCardClick?: (
    service: any,
    certificateIndex: number,
    certificateUrl: string,
  ) => void;

  isApproving?: boolean;
  isRejecting?: boolean;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  service,
  certificateUrl,
  certificateIndex,
  onViewCertificate,
  onApprove,
  onReject,
  onCardClick,
  isApproving = false,
  isRejecting = false,
}) => {
  const {
    certificates: serviceCertificates,
    isLoading: isLoadingCertificates,
    error: _certificateError,
  } = useServiceCertificates(service.serviceId, service.certificateUrls || []);

  const processedCert = serviceCertificates?.[certificateIndex];
  const displayUrl =
    processedCert?.dataUrl || processedCert?.url || certificateUrl;

  return (
    <div
      className="relative flex cursor-pointer flex-col gap-2 rounded-lg border border-gray-200 p-3 shadow-sm transition-all hover:shadow-md"
      onClick={() => onCardClick?.(service, certificateIndex, certificateUrl)}
    >
      {/* Service info header */}
      <div className="mb-2 flex items-start space-x-2">
        <DocumentIcon className="mt-0.5 h-4 w-4 text-blue-600" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-gray-900">
            {service.serviceTitle}
          </h4>
        </div>
      </div>

      {/* Certificate image */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewCertificate(displayUrl);
        }}
        className="group relative flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {isLoadingCertificates ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : processedCert?.error ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
            <DocumentIcon className="h-8 w-8" />
            <p className="mt-1 text-xs">Failed to load</p>
          </div>
        ) : (
          <img
            src={displayUrl}
            alt={`Certificate ${certificateIndex + 1}`}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </button>

      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApprove(service, certificateIndex, certificateUrl);
          }}
          disabled={isApproving || isRejecting}
          className="flex-1 rounded bg-green-600 px-3 py-2 text-xs text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isApproving ? (
            <>
              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Approving...
            </>
          ) : (
            "Approve"
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReject(service, certificateIndex, certificateUrl);
          }}
          disabled={isApproving || isRejecting}
          className="flex-1 rounded bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isRejecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Rejecting...
            </>
          ) : (
            "Reject"
          )}
        </button>
      </div>
    </div>
  );
};
