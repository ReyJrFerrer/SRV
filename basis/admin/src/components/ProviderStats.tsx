import React, { useState, useEffect } from "react";
import {
  ClockIcon,
  CheckCircleIcon,
  StarIcon,
  ChartBarIcon,
  BanknotesIcon,
  ChartPieIcon,
} from "@heroicons/react/24/solid";

interface ProviderStatsProps {
  className?: string;
  loading?: boolean;
  providerId?: string;
  onUpdateCommission?: (newAmount: number) => void;
  outstandingCommission?: number;
  userData?: {
    totalEarnings: number;
    pendingCommission: number;
    settledCommission: number;
    completedJobs: number;
    averageRating: number;
    totalReviews: number;
    completionRate: number;
    monthlyRevenue?: number;
    totalRevenue?: number;
  };
}

const ProviderStats: React.FC<ProviderStatsProps> = ({
  className = "",
  loading: externalLoading = false,
  onUpdateCommission,
  outstandingCommission = 3200.0,
  userData,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [newCommissionAmount, setNewCommissionAmount] = useState("");

  // Initialize commission amount when modal opens
  useEffect(() => {
    if (showCommissionModal) {
      setNewCommissionAmount(outstandingCommission.toFixed(2));
    }
  }, [showCommissionModal, outstandingCommission]);

  const handleUpdateCommission = () => {
    const amount = parseFloat(newCommissionAmount);
    if (!isNaN(amount) && amount >= 0 && onUpdateCommission) {
      onUpdateCommission(amount);
      setShowCommissionModal(false);
    }
  };

  const handleOpenModal = () => {
    setShowCommissionModal(true);
  };

  const handleCloseModal = () => {
    setShowCommissionModal(false);
    setNewCommissionAmount("");
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const stats = userData
    ? {
        monthlyRevenue: userData.monthlyRevenue || userData.totalEarnings * 0.3,
        pendingPayout: userData.pendingCommission,
        completedJobs: userData.completedJobs,
        averageRating: userData.averageRating,
        totalReviews: userData.totalReviews,
        completionRate: userData.completionRate,
        totalRevenue: userData.totalRevenue || userData.totalEarnings,
        outstandingCommission: userData.pendingCommission,
      }
    : {
        monthlyRevenue: 15750.0,
        pendingPayout: 3200.0,
        completedJobs: 23,
        averageRating: 4.7,
        totalReviews: 18,
        completionRate: 92,
        totalRevenue: 45200.0,
        outstandingCommission: 3200.0,
      };

  const statsCards = React.useMemo(() => {
    return [
      {
        title: "Earnings This Month",
        value: `₱${stats.monthlyRevenue.toFixed(2)}`,
        icon: <BanknotesIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Pending Payout",
        value: `₱${stats.pendingPayout.toFixed(2)}`,
        icon: <ClockIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Completed Jobs",
        value: stats.completedJobs.toString(),
        icon: <CheckCircleIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Customer Rating",
        value: `${stats.averageRating.toFixed(1)} (${stats.totalReviews})`,
        icon: <StarIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Completion Rate",
        value: `${stats.completionRate}%`,
        icon: <ChartBarIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Total Earnings",
        value: `₱${stats.totalRevenue.toFixed(2)}`,
        icon: <ChartPieIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
    ];
  }, [stats]);

  // --- Outstanding Commission Card ---
  const OutstandingCommissionCard = () => (
    <div className="relative flex flex-col items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6 shadow-lg md:flex-row">
      <div className="flex items-center gap-4">
        <BanknotesIcon className="h-10 w-10 text-blue-500 drop-shadow" />
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Outstanding Commission
          </p>
          <p className="text-3xl font-extrabold tracking-tight text-gray-900">
            ₱{outstandingCommission.toFixed(2)}
          </p>
        </div>
      </div>
      <button
        onClick={handleOpenModal}
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Update Commission
      </button>
    </div>
  );

  // --- Stat Card ---
  const StatCard = ({
    icon,
    value,
    title,
    bgColor,
  }: {
    icon: React.ReactNode;
    value: string;
    title: string;
    bgColor: string;
  }) => (
    <div className="flex min-w-[210px] items-center gap-4 rounded-2xl border border-blue-50 bg-white/90 p-5 shadow-md">
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${bgColor} shadow`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  );

  // --- Mobile Stat Cards Layout ---
  const renderCards = () => (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {externalLoading
        ? Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex w-64 flex-shrink-0 flex-col gap-4">
              <div className="flex animate-pulse items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-gray-300"></div>
                <div className="flex-1">
                  <div className="mb-2 h-6 w-3/4 rounded bg-gray-200"></div>
                  <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                </div>
              </div>
              <div className="flex animate-pulse items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-gray-300"></div>
                <div className="flex-1">
                  <div className="mb-2 h-6 w-3/4 rounded bg-gray-200"></div>
                  <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          ))
        : statsCards.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              value={stat.value}
              title={stat.title}
              bgColor={stat.bgColor}
            />
          ))}
    </div>
  );

  // --- Desktop Stats Layout ---
  const renderStats = () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {externalLoading
        ? Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-gray-200"
            ></div>
          ))
        : statsCards.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              value={stat.value}
              title={stat.title}
              bgColor={stat.bgColor}
            />
          ))}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <OutstandingCommissionCard />
      </div>

      {isMobile ? renderCards() : renderStats()}

      {/* Update Commission Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Update Commission
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Outstanding Commission Amount
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">₱</span>
                    </div>
                    <input
                      type="number"
                      value={newCommissionAmount}
                      onChange={(e) => setNewCommissionAmount(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 py-2 pl-7 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the new outstanding commission amount
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 bg-gray-50 px-6 py-4">
              <button
                onClick={handleCloseModal}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCommission}
                disabled={
                  !newCommissionAmount ||
                  isNaN(parseFloat(newCommissionAmount)) ||
                  parseFloat(newCommissionAmount) < 0
                }
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Update Commission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderStats;
