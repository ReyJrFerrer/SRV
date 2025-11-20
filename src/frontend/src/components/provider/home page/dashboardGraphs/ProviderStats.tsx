import React, { useState, useEffect, Suspense, useRef } from "react";
import {
  CheckCircleIcon,
  StarIcon,
  ChartBarIcon,
  BanknotesIcon,
  ChartPieIcon,
  WalletIcon,
} from "@heroicons/react/24/solid";
// Import your new chart components
const BookingStatusPieChart = React.lazy(
  () => import("./BookingStatusPieChart"),
);
const MonthlyRevenueLineChart = React.lazy(
  () => import("./MonthlyRevenueLineChart"),
);
const DailyBookingsBarChart = React.lazy(
  () => import("./DailyBookingsBarChart"),
);
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

// Dedicated mobile carousel component so hooks aren't called conditionally
const MobileChartsCarousel: React.FC<{
  className?: string;
  isLoading: boolean;
  analytics: any;
  getMonthlyRevenue: any;
  getBookingCountByDay: any;
  ratingData: { averageRating: number; totalReviews: number };
}> = ({
  className = "",
  isLoading,
  analytics,
  getMonthlyRevenue,
  getBookingCountByDay,
  ratingData,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      setIndex(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true } as any);
    return () => el.removeEventListener("scroll", onScroll as any);
  }, []);

  const slides = isLoading
    ? [0, 1, 2, 3].map((k) => (
        <div key={`skeleton-${k}`} className="w-full shrink-0 snap-center px-1">
          <div className="h-72 w-full animate-pulse rounded-2xl bg-gray-200" />
        </div>
      ))
    : [
        <div key="pie" className="w-full shrink-0 snap-center px-1">
          <div className="h-72 rounded-2xl border border-blue-50 bg-white p-3 shadow-md">
            <Suspense
              fallback={
                <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <BookingStatusPieChart analytics={analytics} />
            </Suspense>
          </div>
        </div>,
        <div key="line" className="w-full shrink-0 snap-center px-1">
          <div className="h-72 rounded-2xl border border-blue-50 bg-white p-3 shadow-md">
            <Suspense
              fallback={
                <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <MonthlyRevenueLineChart
                analytics={analytics}
                getMonthlyRevenue={getMonthlyRevenue}
              />
            </Suspense>
          </div>
        </div>,
        <div key="bar" className="w-full shrink-0 snap-center px-1">
          <div className="h-72 rounded-2xl border border-blue-50 bg-white p-3 shadow-md">
            <Suspense
              fallback={
                <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <DailyBookingsBarChart
                getBookingCountByDay={getBookingCountByDay}
              />
            </Suspense>
          </div>
        </div>,
        <div key="rating" className="w-full shrink-0 snap-center px-1">
          <div className="flex h-72 items-center justify-center rounded-2xl border border-blue-50 bg-white p-3 shadow-md">
            <CustomerRatingStars analytics={ratingData} />
          </div>
        </div>,
      ];

  const dots = slides.map((_, i) => (
    <button
      key={`dot-${i}`}
      aria-label={`Go to slide ${i + 1}`}
      onClick={() => {
        const el = containerRef.current;
        if (!el) return;
        el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
        setIndex(i);
      }}
      className={`${i === index ? "bg-blue-600" : "bg-gray-300"} h-2 w-2 rounded-full transition-colors`}
    />
  ));

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="-mx-4 flex snap-x snap-mandatory overflow-x-auto scroll-smooth px-4 pb-3"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {slides}
      </div>
      <div className="mt-1 flex items-center justify-center gap-2">{dots}</div>
    </div>
  );
};

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
  reviewsError,
}) => {
  const { balance } = useWallet();

  const navigate = useNavigate();

  const handleWalletClick = () => {
    navigate("/provider/wallet");
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

      return [
        {
          title: "Earnings This Month",
          value: `₱${monthlyRevenue.toFixed(2)}`,
          icon: <BanknotesIcon className="h-6 w-6 text-white" />,
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
      return defaultStats;
    }
  }, [analytics, getRevenueByPeriod, ratingData]);

  const statPairs: Array<typeof stats> = [];
  for (let i = 0; i < stats.length; i += 2) {
    statPairs.push(stats.slice(i, i + 2));
  }

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
            <Suspense
              fallback={
                <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <BookingStatusPieChart analytics={analytics} />
            </Suspense>
          </div>
          <div className="h-80 rounded-2xl border border-blue-50 bg-white p-6 shadow-md">
            <Suspense
              fallback={
                <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <MonthlyRevenueLineChart
                analytics={analytics}
                getMonthlyRevenue={getMonthlyRevenue}
              />
            </Suspense>
          </div>
          <div className="h-80 rounded-2xl border border-blue-50 bg-white p-6 shadow-md">
            <Suspense
              fallback={
                <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <DailyBookingsBarChart
                getBookingCountByDay={getBookingCountByDay}
              />
            </Suspense>
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
        <WalletIcon className="h-5 w-5 text-white" />
        View Wallet
      </button>
    </div>
  );

  if (hasError) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            Error loading stats:{" "}
            {bookingsError || reviewsError || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <h1
        className="my-6 text-xl font-extrabold
 tracking-tight text-blue-900 sm:text-3xl md:text-3xl lg:text-2xl"
      >
        Dashboard
      </h1>

      <div className="mb-8">
        <WalletCard />
      </div>

      {isMobile ? (
        <MobileChartsCarousel
          className={className}
          isLoading={isLoading}
          analytics={analytics}
          getMonthlyRevenue={getMonthlyRevenue}
          getBookingCountByDay={getBookingCountByDay}
          ratingData={ratingData}
        />
      ) : (
        renderCharts()
      )}
    </div>
  );
};

export default ProviderStats;
