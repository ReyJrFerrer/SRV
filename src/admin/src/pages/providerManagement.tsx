import React, { useEffect, useState, useMemo } from "react";
import { useAdmin } from "../hooks/useAdmin";
import { formatCurrency, formatDate, formatRelativeTime } from "../utils/formatUtils";
import {
  ProviderManagementHeader,
  ProviderStatsOverview,
  ProviderFilters,
  ProviderTable,
  ProviderDetailsModal,
} from "../components";
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export const ProviderManagementPage: React.FC = () => {
  const { serviceProviders, loading, refreshServiceProviders } = useAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "totalEarnings" | "outstandingBalance" | "lastActivity"
  >("totalEarnings");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [providerDashboard, setProviderDashboard] = useState<any | null>(null);
  const [providerAnalytics, setProviderAnalytics] = useState<any | null>(null);
  const [analyticsMode, setAnalyticsMode] = useState<"details" | "analytics">(
    "details",
  );
  const [analyticsLoading] = useState(false);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  const [showMobileBar, setShowMobileBar] = useState(false);

  useEffect(() => {
    refreshServiceProviders();
  }, [refreshServiceProviders]);

  useEffect(() => {
    const onScroll = () => {
      setShowMobileBar(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filteredProviders = useMemo(() => {
    return serviceProviders
      .filter(
        (provider) =>
          provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          provider.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          provider.id.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "totalEarnings":
            aValue = a.totalEarnings;
            bValue = b.totalEarnings;
            break;
          case "outstandingBalance":
            aValue = a.outstandingBalance;
            bValue = b.outstandingBalance;
            break;
          case "lastActivity":
            aValue = new Date(a.lastActivity).getTime();
            bValue = new Date(b.lastActivity).getTime();
            break;
          default:
            return 0;
        }

        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [serviceProviders, searchTerm, sortBy, sortOrder]);


  const handleViewProvider = async (provider: any) => {
    setSelectedProvider(provider);
    setShowProviderDetails(true);
    setAnalyticsMode("details");
    setProviderAnalytics(null);
  };

  const loadInlineProviderAnalytics = async (_providerId: string) => {
    // tbd
  };

  // Status chip helpers for provider status
  const getStatusColor = (overdueOrders: number, pendingOrders: number) => {
    if (overdueOrders > 0) return "bg-red-100 text-red-800";
    if (pendingOrders > 0) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusIcon = (overdueOrders: number, pendingOrders: number) => {
    if (overdueOrders > 0)
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    if (pendingOrders > 0) return <ClockIcon className="h-4 w-4" />;
    return <CheckCircleIcon className="h-4 w-4" />;
  };

  const getStatusText = (overdueOrders: number, pendingOrders: number) => {
    if (overdueOrders > 0) return `${overdueOrders} overdue`;
    if (pendingOrders > 0) return `${pendingOrders} pending`;
    return "All clear";
  };

  // Determine if current viewport is mobile (< sm breakpoint)
  const isMobileViewport =
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 639px)").matches
      : true;

  // Calculate stats for overview
  const totalEarnings = useMemo(() => {
    return serviceProviders.reduce((sum, p) => sum + p.totalEarnings, 0);
  }, [serviceProviders]);

  const outstandingBalance = useMemo(() => {
    return serviceProviders.reduce(
      (sum, p) => sum + (p.outstandingBalance || 0),
      0,
    );
  }, [serviceProviders]);

  const overdueBookings = useMemo(() => {
    return serviceProviders.reduce((sum, p) => sum + (p.overdueOrders || 0), 0);
  }, [serviceProviders]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ProviderManagementHeader showMobileBar={showMobileBar} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        {/* Stats Overview */}
        <ProviderStatsOverview
          totalProviders={serviceProviders.length}
          totalEarnings={totalEarnings}
          outstandingBalance={outstandingBalance}
          overdueBookings={overdueBookings}
          loading={loading.serviceProviders}
          formatCurrency={formatCurrency}
        />

        {/* Filters and Search */}
        <ProviderFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
        />

        {/* Providers Table */}
        <ProviderTable
          providers={filteredProviders}
          loading={loading.serviceProviders}
          searchTerm={searchTerm}
          formatCurrency={formatCurrency}
          formatRelativeTime={formatRelativeTime}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getStatusText={getStatusText}
          isMobileViewport={isMobileViewport}
          onViewProvider={handleViewProvider}
        />
      </main>

      {/* Provider Details Modal */}
      <ProviderDetailsModal
        isOpen={showProviderDetails}
        provider={selectedProvider}
        providerDashboard={providerDashboard}
        providerAnalytics={providerAnalytics}
        analyticsMode={analyticsMode}
        analyticsLoading={analyticsLoading}
        onClose={() => {
          setShowProviderDetails(false);
          setSelectedProvider(null);
          setProviderDashboard(null);
        }}
        onModeChange={setAnalyticsMode}
        onLoadAnalytics={loadInlineProviderAnalytics}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
        getStatusText={getStatusText}
      />
    </div>
  );
};
