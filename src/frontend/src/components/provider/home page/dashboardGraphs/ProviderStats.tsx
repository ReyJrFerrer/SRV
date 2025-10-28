import React, { useState, useEffect } from "react";
import {
  ClockIcon,
  CheckCircleIcon,
  StarIcon,
  ChartBarIcon,
  BanknotesIcon,
  ChartPieIcon,
} from "@heroicons/react/24/solid";
// Import your new chart components
import BookingStatusPieChart from "./BookingStatusPieChart";
import MonthlyRevenueLineChart from "./MonthlyRevenueLineChart";
import DailyBookingsBarChart from "./DailyBookingsBarChart";
import CustomerRatingStars from "./CustomerRatingStars";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../../../hooks/useWallet";

interface ProviderStatsProps {
  className?: string;
  loading?: boolean;
  analytics: any;
  bookingsLoading: any;
  bookingsError: any;
  getMonthlyRevenue: any;
  getBookingCountByDay: any;
  getRevenueByPeriod: any;
  reviewAnalytics: any;
  reviewsLoading: any;
  reviewsError: any;
}

const ProviderStats: React.FC<ProviderStatsProps> = ({
  className = "",
  loading: externalLoading = false,
  analytics,
  bookingsLoading,
  bookingsError,
  getMonthlyRevenue,
  getBookingCountByDay,
  getRevenueByPeriod,
  reviewAnalytics,
  reviewsLoading,
  reviewsError
}) => {
  const { balance, fetchBalance } = useWallet();

  const navigate = useNavigate();

  const handleWalletClick = () => {
    navigate("/provider/wallet");
  };

  const handleRefreshBalance = async () => {
    try {
      await fetchBalance();
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    }
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isLoading = externalLoading || bookingsLoading || reviewsLoading;
  const hasError = bookingsError || reviewsError;

  const ratingData = React.useMemo(() => {
    if (reviewAnalytics) {
      return {
        averageRating: reviewAnalytics.averageRating || 0,
        totalReviews: reviewAnalytics.totalReviews || 0,
      };
    }
    return {
      averageRating: 0,
      totalReviews: 0,
    };
  }, [reviewAnalytics]);

  const stats = React.useMemo(() => {
    const defaultStats = [
      {
        title: "Earnings This Month",
        value: "₱0.00",
        icon: <BanknotesIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Pending Payout",
        value: "₱0.00",
        icon: <ClockIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Completed Jobs",
        value: "0",
        icon: <CheckCircleIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Customer Rating",
        value: "0 (0)",
        icon: <StarIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Completion Rate",
        value: "0%",
        icon: <ChartBarIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
      {
        title: "Total Earnings",
        value: "₱0.00",
        icon: <ChartPieIcon className="h-6 w-6 text-white" />,
        bgColor: "bg-[#4068F4]",
      },
    ];

    if (!analytics) {
      return defaultStats.map((stat) => {
        if (stat.title === "Customer Rating") {
          return {
            ...stat,
            value: `${ratingData.averageRating.toFixed(1)} (${
              ratingData.totalReviews
            })`,
          };
        }
        return stat;
      });
    }

    try {
      const monthlyRevenue = getRevenueByPeriod("month");
      const pendingPayout = analytics.expectedRevenue || 0;

      return [
        {
          title: "Earnings This Month",
          value: `₱${monthlyRevenue.toFixed(2)}`,
          icon: <BanknotesIcon className="h-6 w-6 text-white" />,
          bgColor: "bg-[#4068F4]",
        },
        {
          title: "Pending Payout",
          value: `₱${pendingPayout.toFixed(2)}`,
          icon: <ClockIcon className="h-6 w-6 text-white" />,
          bgColor: "bg-[#4068F4]",
        },
        {
          title: "Completed Jobs",
          value: (analytics.completedBookings || 0).toString(),
          icon: <CheckCircleIcon className="h-6 w-6 text-white" />,
          bgColor: "bg-[#4068F4]",
        },
        {
          title: "Customer Rating",
          value: `${ratingData.averageRating.toFixed(1)} (${
            ratingData.totalReviews
          })`,
          icon: <StarIcon className="h-6 w-6 text-white" />,
          bgColor: "bg-[#4068F4]",
        },
        {
          title: "Completion Rate",
          value: `${(analytics.completionRate || 0).toFixed(0)}%`,
          icon: <ChartBarIcon className="h-6 w-6 text-white" />,
          bgColor: "bg-[#4068F4]",
        },
        {
          title: "Total Earnings",
          value: `₱${(analytics.totalRevenue || 0).toFixed(2)}`,
          icon: <ChartPieIcon className="h-6 w-6 text-white" />,
          bgColor: "bg-[#4068F4]",
        },
      ];
    } catch (err) {
      //console.error("Error calculating stats:", err);
      return defaultStats;
    }
  }, [analytics, getRevenueByPeriod, ratingData]);

  const statPairs: Array<typeof stats> = [];
  for (let i = 0; i < stats.length; i += 2) {
    statPairs.push(stats.slice(i, i + 2));
  }

  // --- Improved Stat Card ---
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

  // --- Improved Mobile Stat Cards Layout ---
  const renderCards = () => (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {isLoading
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
        : stats.map((stat, index) => (
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

  // --- Improved Desktop Charts Layout ---
  const renderCharts = () => (
    <div
      className={`grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2 ${className}`}
    >
      {isLoading ? (
        <>
          <div className="h-80 w-full animate-pulse rounded-lg bg-gray-200"></div>
          <div className="h-80 w-full animate-pulse rounded-lg bg-gray-200"></div>
          <div className="h-80 w-full animate-pulse rounded-lg bg-gray-200"></div>
          <div className="h-80 w-full animate-pulse rounded-lg bg-gray-200"></div>
        </>
      ) : (
        <>
          <div className="h-80 rounded-2xl border border-blue-50 bg-white p-6 shadow-md">
            <BookingStatusPieChart analytics={analytics} />
          </div>
          <div className="h-80 rounded-2xl border border-blue-50 bg-white p-6 shadow-md">
            <MonthlyRevenueLineChart
              analytics={analytics}
              getMonthlyRevenue={getMonthlyRevenue}
            />
          </div>
          <div className="h-80 rounded-2xl border border-blue-50 bg-white p-6 shadow-md">
            <DailyBookingsBarChart
              getBookingCountByDay={getBookingCountByDay}
            />
          </div>
          <div className="flex h-80 items-center justify-center rounded-2xl border border-blue-50 bg-white p-6 shadow-md">
            <CustomerRatingStars analytics={ratingData} />
          </div>
        </>
      )}
    </div>
  );

  // --- Improved Outstanding Commission Card ---
  const WalletCard = () => (
    <div className="relative flex flex-col items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6 shadow-lg md:flex-row">
      <div className="flex items-center gap-4">
        <BanknotesIcon className="h-10 w-10 text-blue-500 drop-shadow" />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-blue-700">SRV Wallet</p>
            <button
              onClick={handleRefreshBalance}
              className="rounded-full p-1 text-blue-600 transition-colors hover:bg-blue-100"
              title="Refresh balance"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-gray-900">
            ₱ {balance.toFixed(2)}
          </p>
        </div>
      </div>
      <button
        onClick={handleWalletClick}
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M17 9V7a5 5 0 00-10 0v2M5 12h14m-1 9H6a2 2 0 01-2-2V7a2 2 0 012-2h12a2 2 0 012-2z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        View Wallet
      </button>
    </div>
  );

  if (hasError) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            Error loading stats: {bookingsError || reviewsError || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="mb-6 pt-6 text-2xl font-extrabold tracking-tight text-blue-900 sm:text-3xl md:text-3xl">
        Dashboard
      </h1>

      <div className="mb-8">
        <WalletCard />
      </div>

      {isMobile ? renderCards() : renderCharts()}
    </div>
  );
};

export default ProviderStats;
