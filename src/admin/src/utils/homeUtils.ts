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
  period: Period,
): BookingsChartData[] => {
  const today = new Date();
  const daysToShow = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const chartData: BookingsChartData[] = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    date.setUTCHours(0, 0, 0, 0);

    const dateStr = date.toISOString().slice(0, 10);

    const formattedDate = date
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      .toUpperCase()
      .replace(" ", ". ");

    let count = 0;

    if (bookings && bookings.length > 0) {
      count = bookings.filter((booking) => {
        if (!booking.createdAt || typeof booking.createdAt !== "string")
          return false;
        return booking.createdAt.slice(0, 10) === dateStr;
      }).length;
    }

    chartData.push({
      date: formattedDate,
      count,
      fullDate: dateStr,
    });
  }

  return chartData;
};

// Generate revenue and commission per day chart data
export const generateRevenueChartData = (
  bookings: any[],
  commissionTransactions: any[],
  period: Period,
): RevenueChartData[] => {
  const today = new Date();
  const daysToShow = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const chartData: RevenueChartData[] = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    date.setUTCHours(0, 0, 0, 0);

    const dateStr = date.toISOString().slice(0, 10);

    const formattedDate = date
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      .toUpperCase()
      .replace(" ", ". ");

    let revenue = 0;
    let commission = 0;

    if (bookings && bookings.length > 0) {
      revenue = bookings
        .filter((booking) => {
          if (!booking.createdAt || typeof booking.createdAt !== "string")
            return false;
          return (
            booking.createdAt.slice(0, 10) === dateStr &&
            (booking.status === "Completed" || booking.status === "Settled")
          );
        })
        .reduce((sum, booking) => sum + (booking.price || 0), 0);

      if (commissionTransactions && commissionTransactions.length > 0) {
        commission = commissionTransactions
          .filter((transaction) => {
            if (
              !transaction.timestamp ||
              typeof transaction.timestamp !== "string"
            )
              return false;
            return transaction.timestamp.slice(0, 10) === dateStr;
          })
          .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
      }
    }

    chartData.push({
      date: formattedDate,
      revenue,
      commission,
      fullDate: dateStr,
    });
  }

  return chartData;
};
