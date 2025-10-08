import React, { useEffect, useState } from "react";
import {
  AdminDashboardStats,
  ServiceProviderCommissionTable,
  PendingValidationCard,
  AdminFeedback,
} from "../components";
import { useAdmin } from "../hooks/useAdmin";
import { XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";

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

export const AdminHomePage: React.FC = () => {
  const {
    // Loading states
    loading,

    // Data states
    systemStats,
    serviceProviders,
    pendingValidations,

    // Action functions
    refreshSystemStats,
    refreshServiceProviders,
    refreshAll,
    validatePayment,
    viewMediaItems,
  } = useAdmin();

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

  // Calculate dashboard stats from current data
  const dashboardStats = {
    totalServiceProviders: serviceProviders.length,
    totalPendingValidations: pendingValidations.length,
    totalPendingTickets: systemStats?.totalCommissionRules || 0,
    totalAdminUsers: systemStats?.adminUsers || 0,
    totalPendingCommission: serviceProviders.reduce(
      (sum, p) => sum + p.pendingCommission,
      0,
    ),
    totalSettledCommission: serviceProviders.reduce(
      (sum, p) => sum + p.settledCommission,
      0,
    ),
  };

  // Load initial data on mount - streamlined to single toast notification
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handlers for actions
  const handleApprovePayment = async (orderId: string, reason?: string) => {
    await validatePayment(orderId, true, reason);
  };

  const handleRejectPayment = async (orderId: string, reason: string) => {
    await validatePayment(orderId, false, reason);
  };

  const handleViewMedia = async (mediaIds: string[]) => {
    // Since we only expect one media item, get the first one
    const mediaId = mediaIds[0];
    if (!mediaId) return;

    // Show modal with loading state
    setMediaModal({
      isOpen: true,
      mediaItem: null,
      loading: true,
      error: null,
    });

    try {
      const mediaItems = await viewMediaItems([mediaId]);
      const mediaItem = mediaItems[0];

      if (mediaItem) {
        setMediaModal({
          isOpen: true,
          mediaItem: {
            id: mediaItem.id,
            url: mediaItem.url,
            fileName: mediaItem.fileName,
            contentType: mediaItem.contentType,
          },
          loading: false,
          error: null,
        });
      } else {
        setMediaModal({
          isOpen: true,
          mediaItem: null,
          loading: false,
          error: "Media item not found",
        });
      }
    } catch (error) {
      //console.error("Error viewing media:", error);
      setMediaModal({
        isOpen: true,
        mediaItem: null,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load media",
      });
    }
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
      <header className="border-b border-blue-100 bg-gradient-to-r from-yellow-50 via-white to-blue-50 shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="w-full sm:w-auto">
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Monitor service providers, validate payments, and manage
                  system settings
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:space-x-4">
                <Link
                  to="/remittance"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-0 focus:outline-none sm:w-auto"
                >
                  <svg
                    className="mr-2 h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Remittance
                </Link>
                <Link
                  to="/users"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow hover:bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:outline-none sm:w-auto"
                >
                  <svg
                    className="mr-2 h-4 w-4 text-blue-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                  View Users
                </Link>
                {/* Refresh button removed as per design update */}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Dashboard Stats */}
          <AdminDashboardStats
            stats={dashboardStats}
            loading={loading.systemStats}
            onRefresh={() => refreshSystemStats(true)}
            showRefresh={false}
          />

          {/* Service Provider Commission Table */}
          <ServiceProviderCommissionTable
            providers={serviceProviders}
            loading={loading.serviceProviders}
            onRefresh={() => refreshServiceProviders(true)}
            showRefresh={false}
          />

          {/* User Feedback Section */}
          <AdminFeedback
            loading={loading.systemStats}
            onRefresh={() => refreshSystemStats(true)}
            showRefresh={false}
          />

          {/* Pending Validations Section */}
          <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-white px-6 py-4">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div className="w-full sm:w-auto">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending Payment Validations
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review and approve payment submissions from service
                    providers
                  </p>
                </div>
                {pendingValidations.length > 0 && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-yellow-200 sm:mt-0">
                    {pendingValidations.length} pending
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              {loading.pendingValidations ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading pending validations...
                  </p>
                </div>
              ) : pendingValidations.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 text-blue-300">
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      className="h-12 w-12"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    All caught up!
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    No pending payment validations at the moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingValidations.map((validation) => {
                    // Convert FrontendRemittanceOrder to the format expected by PendingValidationCard
                    const validationForCard = {
                      id: validation.id,
                      orderId: validation.id,
                      serviceProviderName: `Provider ${validation.serviceProviderId}`, // TODO: Get actual name
                      serviceType: validation.serviceType,
                      amount: validation.amount,
                      commissionAmount: validation.commissionAmount,
                      paymentMethod: validation.paymentMethod,
                      paymentProofMediaIds: validation.paymentProofMediaIds,
                      submittedAt:
                        validation.paymentSubmittedAt || validation.createdAt,
                    };

                    return (
                      <PendingValidationCard
                        key={validation.id}
                        validation={validationForCard}
                        onApprove={handleApprovePayment}
                        onReject={handleRejectPayment}
                        onViewMedia={handleViewMedia}
                        loading={loading.paymentValidation}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
