// Count active service providers from users
export const countActiveServiceProviders = (users: any[]): number => {
  if (!users) return 0;
  return (
    users.filter((user: any) => {
      if (typeof user.activeRole === "string") {
        return user.activeRole === "ServiceProvider";
      } else if (user.activeRole && typeof user.activeRole === "object") {
        return "ServiceProvider" in user.activeRole;
      }
      return false;
    }).length || 0
  );
};

// Calculate settled bookings count
export const calculateSettledBookings = (
  bookings: any[],
  systemStats: any,
): number => {
  if (bookings && bookings.length > 0) {
    return bookings.filter(
      (booking) =>
        booking.status?.toLowerCase() === "completed" ||
        booking.status?.toLowerCase() === "settled",
    ).length;
  }
  return systemStats?.settledBookings || 0;
};

// Calculate dashboard stats
export interface DashboardStats {
  totalServiceProviders: number;
  totalPendingValidations: number;
  totalPendingTickets: number;
  totalAdminUsers: number;
  totalBookings: number;
  appFeedbackAverageRating: number;
  appFeedbackCount: number;
}

export const calculateDashboardStats = (
  activeServiceProvidersCount: number,
  servicesWithCertificates: any[],
  reports: any[],
  systemStats: any,
  totalBookings: number,
  feedbackStats: { averageRating: number; totalFeedback: number } | null,
): DashboardStats => {
  return {
    totalServiceProviders: activeServiceProvidersCount,
    totalPendingValidations: servicesWithCertificates.reduce(
      (total, service) => total + (service.certificateUrls?.length || 0),
      0,
    ),
    totalPendingTickets: reports.filter(
      (report) => !report.status || report.status === "open",
    ).length,
    totalAdminUsers: systemStats?.adminUsers || 0,
    totalBookings: totalBookings,
    appFeedbackAverageRating: feedbackStats?.averageRating || 0,
    appFeedbackCount: feedbackStats?.totalFeedback || 0,
  };
};

// Chart data types
export type Period = "7d" | "30d" | "90d";

export interface BookingsChartData {
  date: string;
  count: number;
  fullDate: string;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
  commission: number;
  fullDate: string;
}

// Generate bookings per day chart data
export const generateBookingsChartData = (
  bookings: any[],
  totalBookings: number,
  period: Period,
): BookingsChartData[] => {
  const today = new Date();
  const daysToShow = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const chartData: BookingsChartData[] = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const formattedDate = date
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      .toUpperCase()
      .replace(" ", ". ");

    let count = 0;

    // Count bookings for specific date
    if (bookings && bookings.length > 0) {
      const dateStr = date.toISOString().slice(0, 10);
      count = bookings.filter((booking) => {
        let bookingDateStr;
        if (booking.createdAt instanceof Date) {
          bookingDateStr = booking.createdAt.toISOString().slice(0, 10);
        } else if (typeof booking.createdAt === "string") {
          bookingDateStr = booking.createdAt.slice(0, 10);
        } else {
          return false;
        }
        return bookingDateStr === dateStr;
      }).length;
    } else if (i === 0) {
      count = totalBookings;
    }

    chartData.push({
      date: formattedDate,
      count,
      fullDate: date.toISOString().slice(0, 10),
    });
  }

  return chartData;
};

// Generate revenue and commission per day chart data
export const generateRevenueChartData = (
  bookings: any[],
  commissionTransactions: any[],
  systemStats: any,
  period: Period,
): RevenueChartData[] => {
  const today = new Date();
  const daysToShow = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const chartData: RevenueChartData[] = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const formattedDate = date
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      .toUpperCase()
      .replace(" ", ". ");

    let revenue = 0;
    let commission = 0;

    // Calculate revenue for specific date
    if (bookings && bookings.length > 0) {
      const dateStr = date.toISOString().slice(0, 10);

      // Calculate revenue from completed bookings
      revenue = bookings
        .filter((booking) => {
          let bookingDateStr;
          if (booking.createdAt instanceof Date) {
            bookingDateStr = booking.createdAt.toISOString().slice(0, 10);
          } else if (typeof booking.createdAt === "string") {
            bookingDateStr = booking.createdAt.slice(0, 10);
          } else {
            return false;
          }
          return (
            bookingDateStr === dateStr &&
            (booking.status === "Completed" || booking.status === "Settled")
          );
        })
        .reduce((sum, booking) => sum + (booking.price || 0), 0);

      // Calculate commission from commission transactions
      if (commissionTransactions && commissionTransactions.length > 0) {
        commission = commissionTransactions
          .filter((transaction) => {
            const transactionDateStr = transaction.timestamp
              .toISOString()
              .slice(0, 10);
            return transactionDateStr === dateStr;
          })
          .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
      }
    } else if (i === 0) {
      revenue = systemStats?.totalRevenue || 0;
      commission = systemStats?.totalCommission || 0;
    }

    chartData.push({
      date: formattedDate,
      revenue,
      commission,
      fullDate: date.toISOString().slice(0, 10),
    });
  }

  return chartData;
};
