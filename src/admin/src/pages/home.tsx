import React, { useEffect } from "react";
import {
  AdminDashboardStats,
  ServiceProviderCommissionTable,
  PendingValidationCard,
} from "../components";
import { useAdmin } from "../hooks/useAdmin";

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

  // Calculate dashboard stats from current data
  const dashboardStats = {
    totalServiceProviders: serviceProviders.length,
    totalPendingValidations: pendingValidations.length,
    totalCommissionRules: systemStats?.totalCommissionRules || 0,
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
    try {
      const mediaItems = await viewMediaItems(mediaIds);
      // TODO: Open modal or new tab to display media items
      console.log("Media items loaded:", mediaItems);
      alert(
        `Loaded ${mediaItems.length} media items. Check console for details.`,
      );
    } catch (error) {
      console.error("Error viewing media:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Monitor service providers, validate payments, and manage system
              settings
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Dashboard Stats */}
          <AdminDashboardStats
            stats={dashboardStats}
            loading={loading.systemStats}
            onRefresh={() => refreshSystemStats(true)}
          />

          {/* Service Provider Commission Table */}
          <ServiceProviderCommissionTable
            providers={serviceProviders}
            loading={loading.serviceProviders}
            onRefresh={() => refreshServiceProviders(true)}
          />

          {/* Pending Validations Section */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending Payment Validations
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review and approve payment submissions from service
                    providers
                  </p>
                </div>
                {pendingValidations.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
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
                  <div className="mx-auto h-12 w-12 text-gray-400">
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
