import React, { useState } from "react";
import {
  AdminDashboardStats,
  ServiceProviderCommissionTable,
  PendingValidationCard,
} from "../components";
// import { adminServiceCanister } from "../services/adminServiceCanister"; // TODO: Will be used when implementing actual API calls

// Mock data interfaces (will be replaced with actual data from hooks later)
interface ServiceProviderData {
  id: string;
  name: string;
  phone: string;
  totalEarnings: number;
  pendingCommission: number;
  settledCommission: number;
  lastActivity: Date;
}

interface PendingValidation {
  id: string;
  orderId: string;
  serviceProviderName: string;
  serviceType: string;
  amount: number;
  commissionAmount: number;
  paymentMethod: string;
  paymentProofMediaIds: string[];
  submittedAt: Date;
}

// Mock data (will be replaced with actual API calls later)
const mockServiceProviders: ServiceProviderData[] = [
  {
    id: "1",
    name: "Juan Dela Cruz",
    phone: "+63 917 123 4567",
    totalEarnings: 15750.5,
    pendingCommission: 1250.0,
    settledCommission: 14500.5,
    lastActivity: new Date("2025-08-17"),
  },
  {
    id: "2",
    name: "Maria Santos",
    phone: "+63 918 234 5678",
    totalEarnings: 22300.75,
    pendingCommission: 2100.25,
    settledCommission: 20200.5,
    lastActivity: new Date("2025-08-16"),
  },
  {
    id: "3",
    name: "Roberto Garcia",
    phone: "+63 919 345 6789",
    totalEarnings: 8900.0,
    pendingCommission: 0.0,
    settledCommission: 8900.0,
    lastActivity: new Date("2025-08-15"),
  },
];

const mockPendingValidations: PendingValidation[] = [
  {
    id: "1",
    orderId: "ORD-2025081801",
    serviceProviderName: "Juan Dela Cruz",
    serviceType: "House Cleaning",
    amount: 2500.0,
    commissionAmount: 250.0,
    paymentMethod: "GCash",
    paymentProofMediaIds: ["media1", "media2"],
    submittedAt: new Date("2025-08-18T09:30:00"),
  },
  {
    id: "2",
    orderId: "ORD-2025081802",
    serviceProviderName: "Maria Santos",
    serviceType: "Laundry Service",
    amount: 1800.0,
    commissionAmount: 180.0,
    paymentMethod: "GCash",
    paymentProofMediaIds: ["media3"],
    submittedAt: new Date("2025-08-18T10:15:00"),
  },
];

export const AdminHomePage: React.FC = () => {
  const [statsLoading, setStatsLoading] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [validationsLoading, setValidationsLoading] = useState(false);

  // State for actual data (will be managed by hooks later)
  const [serviceProviders] =
    useState<ServiceProviderData[]>(mockServiceProviders);
  const [pendingValidations, setPendingValidations] = useState<
    PendingValidation[]
  >(mockPendingValidations);

  // Calculate stats from current data
  const dashboardStats = {
    totalServiceProviders: serviceProviders.length,
    totalPendingValidations: pendingValidations.length,
    totalCommissionRules: 5, // This will come from the actual API
    totalAdminUsers: 3, // This will come from the actual API
    totalPendingCommission: serviceProviders.reduce(
      (sum, p) => sum + p.pendingCommission,
      0,
    ),
    totalSettledCommission: serviceProviders.reduce(
      (sum, p) => sum + p.settledCommission,
      0,
    ),
  };

  // Handlers for actions (will be implemented with actual API calls later)
  const handleRefreshStats = async () => {
    setStatsLoading(true);
    try {
      // TODO: Call actual API to refresh stats
      console.log("Refreshing dashboard stats...");
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Error refreshing stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRefreshProviders = async () => {
    setProvidersLoading(true);
    try {
      // TODO: Call actual API to refresh service providers
      console.log("Refreshing service providers...");
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Error refreshing service providers:", error);
    } finally {
      setProvidersLoading(false);
    }
  };

  const handleApprovePayment = async (orderId: string, reason?: string) => {
    setValidationsLoading(true);
    try {
      console.log(
        `Approving payment for order ${orderId}`,
        reason ? `with reason: ${reason}` : "",
      );
      // TODO: Call adminServiceCanister.validatePayment(orderId, true, reason)

      // Simulate API call and remove from pending validations
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPendingValidations((prev) =>
        prev.filter((v) => v.orderId !== orderId),
      );

      // Show success notification (TODO: implement with actual toast system)
      alert(`Payment for order ${orderId} has been approved successfully!`);
    } catch (error) {
      console.error("Error approving payment:", error);
      alert("Failed to approve payment. Please try again.");
    } finally {
      setValidationsLoading(false);
    }
  };

  const handleRejectPayment = async (orderId: string, reason: string) => {
    setValidationsLoading(true);
    try {
      console.log(
        `Rejecting payment for order ${orderId} with reason: ${reason}`,
      );
      // TODO: Call adminServiceCanister.validatePayment(orderId, false, reason)

      // Simulate API call and remove from pending validations
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPendingValidations((prev) =>
        prev.filter((v) => v.orderId !== orderId),
      );

      // Show success notification (TODO: implement with actual toast system)
      alert(`Payment for order ${orderId} has been rejected.`);
    } catch (error) {
      console.error("Error rejecting payment:", error);
      alert("Failed to reject payment. Please try again.");
    } finally {
      setValidationsLoading(false);
    }
  };

  const handleViewMedia = async (mediaIds: string[]) => {
    try {
      console.log("Viewing media items:", mediaIds);
      // TODO: Call adminServiceCanister.getRemittanceMediaItems(mediaIds)
      // TODO: Open modal or new tab to display media items
      alert(`Would open media viewer for ${mediaIds.length} items`);
    } catch (error) {
      console.error("Error viewing media:", error);
      alert("Failed to load media items.");
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
            loading={statsLoading}
            onRefresh={handleRefreshStats}
          />

          {/* Service Provider Commission Table */}
          <ServiceProviderCommissionTable
            providers={serviceProviders}
            loading={providersLoading}
            onRefresh={handleRefreshProviders}
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
              {pendingValidations.length === 0 ? (
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
                  {pendingValidations.map((validation) => (
                    <PendingValidationCard
                      key={validation.id}
                      validation={validation}
                      onApprove={handleApprovePayment}
                      onReject={handleRejectPayment}
                      onViewMedia={handleViewMedia}
                      loading={validationsLoading}
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
