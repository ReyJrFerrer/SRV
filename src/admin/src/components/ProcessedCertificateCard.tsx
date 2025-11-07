import React from "react";
import { DocumentIcon, ArrowUturnLeftIcon } from "@heroicons/react/24/solid";
import { useServiceCertificates } from "../../../frontend/src/hooks/useMediaLoader";

interface ProcessedCertificateCardProps {
  certificate: any;
  onViewCertificate: (url: string) => void;
  onUndo: (certificate: any) => void;
  isApproved?: boolean;
  onCardClick?: (
    service: any,
    certificateIndex: number,
    certificateUrl: string,
  ) => void;
}

export const ProcessedCertificateCard: React.FC<
  ProcessedCertificateCardProps
> = ({
  certificate,
  onViewCertificate,
  onUndo,
  isApproved = false,
  onCardClick,
}) => {
  const {
    certificates: serviceCertificates,
    isLoading: isLoadingCertificates,
    error: _certificateError,
  } = useServiceCertificates(
    certificate.service.serviceId,
    certificate.service.certificateUrls || [],
  );

  // Find the corresponding processed certificate
  const processedCert = serviceCertificates?.[certificate.certificateIndex];
  const displayUrl =
    processedCert?.dataUrl || processedCert?.url || certificate.certificateUrl;

  const bgColor = isApproved ? "bg-green-50" : "bg-red-50";
  const borderColor = isApproved ? "border-green-200" : "border-red-200";
  const iconColor = isApproved ? "text-green-600" : "text-red-600";
  const buttonBgColor = isApproved
    ? "bg-green-100 hover:bg-green-200"
    : "bg-red-100 hover:bg-red-200";
  const buttonFocusColor = isApproved
    ? "focus:ring-green-500"
    : "focus:ring-red-500";
  const statusText = isApproved ? "Approved" : "Rejected";
  const statusDate = isApproved
    ? certificate.approvedAt
    : certificate.rejectedAt;

  return (
    <div
      className={`flex flex-col gap-2 border p-3 ${borderColor} rounded-lg ${bgColor} relative cursor-pointer shadow-sm transition-all hover:shadow-md`}
      onClick={() =>
        onCardClick?.(
          certificate.service,
          certificate.certificateIndex,
          certificate.certificateUrl,
        )
      }
    >
      {/* Undo button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUndo(certificate);
        }}
        className="absolute right-2 top-2 z-10 rounded-full bg-gray-100 p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
        title={`Undo ${statusText.toLowerCase()}`}
      >
        <ArrowUturnLeftIcon className="h-4 w-4" />
      </button>

      {/* Service info header */}
      <div className="mb-2 flex items-start space-x-2 pr-8">
        <DocumentIcon className={`h-4 w-4 ${iconColor} mt-0.5`} />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-gray-900">
            {certificate.service.serviceTitle}
          </h4>
          <p className={`text-xs ${iconColor}`}>
            {statusText}: {new Date(statusDate || "").toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Certificate image */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewCertificate(displayUrl);
        }}
        className={`group relative h-32 w-full overflow-hidden rounded-lg border ${borderColor} ${buttonBgColor} focus:outline-none focus:ring-2 ${buttonFocusColor} flex items-center justify-center`}
      >
        {isLoadingCertificates ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
            <div
              className={`h-6 w-6 animate-spin rounded-full border-b-2 ${iconColor}`}
            ></div>
          </div>
        ) : processedCert?.error ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
            <DocumentIcon className="h-8 w-8" />
            <p className="mt-1 text-xs">Failed to load</p>
          </div>
        ) : (
          <img
            src={displayUrl}
            alt={`${statusText} Certificate ${certificate.certificateIndex + 1}`}
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
    </div>
  );
};
