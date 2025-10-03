import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
// import { PendingValidationCard } from "../components/PendingValidationCard";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/solid";
import { useServiceCertificates } from "../../../frontend/src/hooks/useMediaLoader";

// Types for media modal
interface MediaViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: {
    id: string;
    url: string;
    fileName: string;
    contentType: string;
  } | null;
  loading?: boolean;
  error?: string | null;
}

// MediaViewModal component for full-screen image display
const MediaViewModal: React.FC<MediaViewModalProps> = ({
  isOpen,
  onClose,
  mediaItem,
  loading = false,
  error = null,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset image error when modal opens with new media
  useEffect(() => {
    setImageError(false);
  }, [mediaItem?.id]);

  // Handle download
  const handleDownload = () => {
    if (mediaItem?.url && mediaItem?.fileName) {
      const link = document.createElement("a");
      link.href = mediaItem.url;
      link.download = mediaItem.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close and download buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {mediaItem?.fileName || "Media Viewer"}
          </h3>
          <div className="flex items-center space-x-2">
            {mediaItem && !loading && !error && (
              <button
                onClick={handleDownload}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal content */}
        <div className="p-4">
          {loading ? (
            <div className="flex h-96 w-96 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500">Loading media...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-96 w-96 items-center justify-center">
              <div className="text-center">
                <div className="mb-4 text-red-500">
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-red-600">
                  Failed to load media
                </p>
                <p className="mt-2 text-xs text-gray-500">{error}</p>
              </div>
            </div>
          ) : mediaItem && imageError ? (
            <div className="flex h-96 w-96 items-center justify-center">
              <div className="text-center">
                <div className="mb-4 text-gray-400">
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">
                  Image failed to load
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  The image may be corrupted or unavailable
                </p>
              </div>
            </div>
          ) : mediaItem ? (
            <img
              src={mediaItem.url}
              alt={mediaItem.fileName}
              className="max-h-[70vh] max-w-full rounded object-contain"
              onError={handleImageError}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Individual Certificate Card Component
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
}

// Processed Certificate Card Component (for approved/rejected sections)
interface ProcessedCertificateCardProps {
  certificate: {
    service: any;
    certificateIndex: number;
    certificateUrl: string;
    approvedAt?: string;
    rejectedAt?: string;
    id: string;
  };
  onViewCertificate: (url: string) => void;
  onUndo: (certificate: any) => void;
  isApproved?: boolean;
  onCardClick?: (
    service: any,
    certificateIndex: number,
    certificateUrl: string,
  ) => void;
}

const CertificateCard: React.FC<CertificateCardProps> = ({
  service,
  certificateUrl,
  certificateIndex,
  onViewCertificate,
  onApprove,
  onReject,
  onCardClick,
}) => {
  // Use the useServiceCertificates hook to properly load certificate images
  const {
    certificates: serviceCertificates,
    isLoading: isLoadingCertificates,
    error: _certificateError,
  } = useServiceCertificates(service.serviceId, service.certificateUrls || []);

  // Find the corresponding processed certificate
  const processedCert = serviceCertificates?.[certificateIndex];
  const displayUrl =
    processedCert?.dataUrl || processedCert?.url || certificateUrl;

  return (
    <div
      className="flex cursor-pointer flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
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
        className="group relative flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-blue-100 hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            onLoad={(_e) => {
              console.log("Certificate loaded successfully:", displayUrl);
            }}
            onError={(e) => {
              console.log("Certificate failed to load:", displayUrl);
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </button>

      {/* Action buttons below the image */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApprove(service, certificateIndex, certificateUrl);
          }}
          className="flex-1 rounded bg-green-600 px-3 py-2 text-xs text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none"
        >
          Approve
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReject(service, certificateIndex, certificateUrl);
          }}
          className="flex-1 rounded bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
        >
          Reject
        </button>
      </div>
    </div>
  );
};

const ProcessedCertificateCard: React.FC<ProcessedCertificateCardProps> = ({
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
        className="absolute top-2 right-2 z-10 rounded-full bg-gray-100 p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-800 focus:ring-2 focus:ring-gray-500 focus:outline-none"
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
        className={`group relative h-32 w-full overflow-hidden rounded-lg border ${borderColor} ${buttonBgColor} focus:ring-2 focus:outline-none ${buttonFocusColor} flex items-center justify-center`}
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
            onLoad={(_e) => {
              console.log("Certificate loaded successfully:", displayUrl);
            }}
            onError={(e) => {
              console.log("Certificate failed to load:", displayUrl);
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </button>
    </div>
  );
};

export const ValidationInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    pendingValidations,
    refreshPendingValidations,
    validatePayment: _validatePayment,
    viewMediaItems: _viewMediaItems,
  } = useAdmin();

  // Certificate validation state
  const [servicesWithCertificates, setServicesWithCertificates] = useState<
    any[]
  >([]);
  const [certificateLoading, setCertificateLoading] = useState(false);

  // Statistics state
  const [stats, setStats] = useState({
    totalCertificates: 0,
    certificatesPending: 0,
    completedToday: 0,
    completedTotal: 0,
    rejectedTotal: 0,
  });

  // Certificate validation state
  const [approvedCertificates, setApprovedCertificates] = useState<any[]>([]);
  const [rejectedCertificates, setRejectedCertificates] = useState<any[]>([]);

  // State for media modal
  const [mediaModal, setMediaModal] = useState<{
    isOpen: boolean;
    mediaItem: {
      id: string;
      url: string;
      fileName: string;
      contentType: string;
    } | null;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    mediaItem: null,
    loading: false,
    error: null,
  });

  // Calculate statistics
  const calculateStats = () => {
    const certificatesPending = servicesWithCertificates.reduce(
      (total, service) => total + service.certificateUrls.length,
      0,
    );
    const completedTotal = approvedCertificates.length;
    const rejectedTotal = rejectedCertificates.length;
    const totalCertificates =
      certificatesPending + completedTotal + rejectedTotal;
    const today = new Date().toDateString();
    const completedToday = approvedCertificates.filter(
      (cert) => new Date(cert.approvedAt).toDateString() === today,
    ).length;

    setStats({
      totalCertificates,
      certificatesPending,
      completedToday,
      completedTotal,
      rejectedTotal,
    });
  };

  // Load services with certificates
  const loadServicesWithCertificates = async () => {
    setCertificateLoading(true);
    try {
      const { adminServiceCanister } = await import(
        "../services/adminServiceCanister"
      );
      const services = await adminServiceCanister.getServicesWithCertificates();
      setServicesWithCertificates(services);
    } catch (error) {
      console.error("Error loading services with certificates:", error);
    } finally {
      setCertificateLoading(false);
    }
  };

  // Load validated certificates from backend
  const loadValidatedCertificates = async () => {
    try {
      const { adminServiceCanister } = await import(
        "../services/adminServiceCanister"
      );
      const validatedCerts =
        await adminServiceCanister.getValidatedCertificates();
      setApprovedCertificates(validatedCerts);
    } catch (error) {
      console.error("Error loading validated certificates:", error);
    }
  };

  // Load rejected certificates from backend
  const loadRejectedCertificates = async () => {
    try {
      const { adminServiceCanister } = await import(
        "../services/adminServiceCanister"
      );
      const rejectedCerts =
        await adminServiceCanister.getRejectedCertificates();
      setRejectedCertificates(rejectedCerts);
    } catch (error) {
      console.error("Error loading rejected certificates:", error);
    }
  };

  // Load initial data on mount
  useEffect(() => {
    refreshPendingValidations();
    loadServicesWithCertificates();
    loadValidatedCertificates();
    loadRejectedCertificates();
  }, [refreshPendingValidations]);

  // Calculate stats when any certificate data changes
  useEffect(() => {
    calculateStats();
  }, [servicesWithCertificates, approvedCertificates, rejectedCertificates]);

  // Handle certificate approval
  const handleApproveCertificate = async (
    service: any,
    certificateIndex: number,
    certificateUrl: string,
  ) => {
    try {
      const mediaId = certificateUrl.split("/media/")[1];

      if (mediaId) {
        // Update validation status in media canister
        const { adminServiceCanister } = await import(
          "../services/adminServiceCanister"
        );
        await adminServiceCanister.updateCertificateValidationStatus(
          mediaId,
          "Validated",
        );
      }

      const uniqueId = `${service.serviceId}-${certificateUrl}-${Date.now()}`;
      const certificateData = {
        service,
        certificateIndex,
        certificateUrl,
        approvedAt: new Date().toISOString(),
        id: uniqueId,
      };
      setApprovedCertificates((prev) => [...prev, certificateData]);

      console.log("Certificate approved:", certificateData);

      // Refresh data from backend
      await loadServicesWithCertificates();
    } catch (error) {
      console.error("Error approving certificate:", error);
    }
  };

  // Handle certificate rejection
  const handleRejectCertificate = async (
    service: any,
    certificateIndex: number,
    certificateUrl: string,
  ) => {
    try {
      const mediaId = certificateUrl.split("/media/")[1];

      if (mediaId) {
        // Update validation status in media canister
        const { adminServiceCanister } = await import(
          "../services/adminServiceCanister"
        );
        await adminServiceCanister.updateCertificateValidationStatus(
          mediaId,
          "Rejected",
        );
      }

      // Add to rejected certificates for UI display
      const uniqueId = `${service.serviceId}-${certificateUrl}-${Date.now()}`;
      const certificateData = {
        service,
        certificateIndex,
        certificateUrl,
        rejectedAt: new Date().toISOString(),
        id: uniqueId,
      };
      setRejectedCertificates((prev) => [...prev, certificateData]);

      console.log("Certificate rejected:", certificateData);

      // Refresh data from backend
      await loadServicesWithCertificates();
    } catch (error) {
      console.error("Error rejecting certificate:", error);
    }
  };

  // Handle undoing certificate approval/rejection
  const handleUndoCertificate = async (certificate: any) => {
    try {
      const mediaId = certificate.certificateUrl.split("/media/")[1];

      if (mediaId) {
        // Reset validation status to Pending in media canister
        const { adminServiceCanister } = await import(
          "../services/adminServiceCanister"
        );
        await adminServiceCanister.updateCertificateValidationStatus(
          mediaId,
          "Pending",
        );
      }

      // Remove from approved/rejected lists using the unique ID
      setApprovedCertificates((prev) =>
        prev.filter((cert) => cert.id !== certificate.id),
      );
      setRejectedCertificates((prev) =>
        prev.filter((cert) => cert.id !== certificate.id),
      );

      console.log("Certificate undone:", certificate);

      // Refresh data from backend
      await loadServicesWithCertificates();
    } catch (error) {
      console.error("Error undoing certificate:", error);
    }
  };

  const handleViewCertificate = (url: string) => {
    setMediaModal({
      isOpen: true,
      mediaItem: {
        id: "certificate",
        url: url,
        fileName: "Certificate",
        contentType: "image/jpeg",
      },
      loading: false,
      error: null,
    });
  };

  // Handle modal close
  const handleCloseMediaModal = () => {
    setMediaModal({
      isOpen: false,
      mediaItem: null,
      loading: false,
      error: null,
    });
  };

  // Handle refresh
  const handleRefresh = async () => {
    await refreshPendingValidations();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Media View Modal */}
      <MediaViewModal
        isOpen={mediaModal.isOpen}
        onClose={handleCloseMediaModal}
        mediaItem={mediaModal.mediaItem}
        loading={mediaModal.loading}
        error={mediaModal.error}
      />

      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Validation Inbox
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Review and approve submitted certificate images from service
                    providers
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading.pendingValidations}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className={`mr-2 h-4 w-4 ${loading.pendingValidations ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Stats Summary */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalCertificates}
                </div>
                <div className="text-sm text-gray-500">Total Certificates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.certificatesPending}
                </div>
                <div className="text-sm text-gray-500">
                  Certificates Pending
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.completedToday}
                </div>
                <div className="text-sm text-gray-500">Completed Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.completedTotal}
                </div>
                <div className="text-sm text-gray-500">Completed Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.rejectedTotal}
                </div>
                <div className="text-sm text-gray-500">Rejected Total</div>
              </div>
            </div>
          </div>

          {/* Pending Validations List */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending Certificate Validations
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review and approve submitted certificate images from service
                    providers
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pendingValidations.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                      {pendingValidations.length} pending
                    </span>
                  )}
                  {stats.certificatesPending > 0 && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {stats.certificatesPending} certificates
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              {certificateLoading ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading certificate validations...
                  </p>
                </div>
              ) : servicesWithCertificates.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <DocumentIcon className="h-12 w-12" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    All caught up!
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    No services with certificates to validate at the moment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {servicesWithCertificates.flatMap((service) => {
                    // Use the useServiceCertificates hook for each service to get processed certificates
                    return service.certificateUrls.map(
                      (url: string, index: number) => {
                        // For now, use the raw URL - we'll need to process this differently
                        return (
                          <CertificateCard
                            key={`${service.serviceId}-${index}`}
                            service={service}
                            certificateUrl={url}
                            certificateIndex={index}
                            onViewCertificate={handleViewCertificate}
                            onApprove={handleApproveCertificate}
                            onReject={handleRejectCertificate}
                            onCardClick={(
                              service,
                              _certificateIndex,
                              _certificateUrl,
                            ) => {
                              // Navigate to admin service details with validation inbox referrer
                              navigate(
                                `/user/${service.providerId}/services/${service.serviceId}?from=validation-inbox`,
                              );
                            }}
                          />
                        );
                      },
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Completed Certificate Validations */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Completed Certificate Validations
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Successfully approved certificate validations
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  {approvedCertificates.length} completed
                </span>
              </div>
            </div>
            <div className="p-6">
              {approvedCertificates.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <DocumentIcon className="h-12 w-12" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No completed validations
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Approved certificates will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {approvedCertificates.map((certificate) => (
                    <ProcessedCertificateCard
                      key={certificate.id}
                      certificate={certificate}
                      onViewCertificate={handleViewCertificate}
                      onUndo={handleUndoCertificate}
                      isApproved={true}
                      onCardClick={(
                        service,
                        certificateIndex,
                        certificateUrl,
                      ) => {
                        // TODO: Add card click functionality
                        console.log("Validated certificate card clicked:", {
                          service,
                          certificateIndex,
                          certificateUrl,
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rejected Certificate Validations */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Rejected Certificate Validations
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Certificate validations that were rejected
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                  {rejectedCertificates.length} rejected
                </span>
              </div>
            </div>
            <div className="p-6">
              {rejectedCertificates.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <DocumentIcon className="h-12 w-12" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No rejected validations
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Rejected certificates will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {rejectedCertificates.map((certificate) => (
                    <ProcessedCertificateCard
                      key={certificate.id}
                      certificate={certificate}
                      onViewCertificate={handleViewCertificate}
                      onUndo={handleUndoCertificate}
                      isApproved={false}
                      onCardClick={(
                        service,
                        certificateIndex,
                        certificateUrl,
                      ) => {
                        // TODO: Add card click functionality
                        console.log("Rejected certificate card clicked:", {
                          service,
                          certificateIndex,
                          certificateUrl,
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
