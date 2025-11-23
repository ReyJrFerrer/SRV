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
    // Normalize to midnight local time to avoid UTC conversion issues
    date.setHours(0, 0, 0, 0);
    const formattedDate = date
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      .toUpperCase()
      .replace(" ", ". ");

    // Use local date components for accurate comparison
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let count = 0;

    // Count bookings for specific date
    if (bookings && bookings.length > 0) {
      count = bookings.filter((booking) => {
        if (!booking.createdAt) return false;
        // Convert booking date to local date components
        const bookingDate = typeof booking.createdAt === "string" 
          ? new Date(booking.createdAt)
          : booking.createdAt instanceof Date
          ? booking.createdAt
          : null;
        if (!bookingDate) return false;
        
        const bookingYear = bookingDate.getFullYear();
        const bookingMonth = String(bookingDate.getMonth() + 1).padStart(2, '0');
        const bookingDay = String(bookingDate.getDate()).padStart(2, '0');
        const bookingDateStr = `${bookingYear}-${bookingMonth}-${bookingDay}`;
        
        return bookingDateStr === dateStr;
      }).length;
    } else if (i === 0) {
      count = totalBookings;
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
  systemStats: any,
  period: Period,
): RevenueChartData[] => {
  const today = new Date();
  const daysToShow = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const chartData: RevenueChartData[] = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    // Normalize to midnight local time to avoid UTC conversion issues
    date.setHours(0, 0, 0, 0);
    const formattedDate = date
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      .toUpperCase()
      .replace(" ", ". ");

    // Use local date components for accurate comparison
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let revenue = 0;
    let commission = 0;

    // Calculate revenue for specific date
    if (bookings && bookings.length > 0) {
      // Calculate revenue from completed bookings
      revenue = bookings
        .filter((booking) => {
          if (!booking.createdAt) return false;
          // Convert booking date to local date components
          const bookingDate = typeof booking.createdAt === "string" 
            ? new Date(booking.createdAt)
            : booking.createdAt instanceof Date
            ? booking.createdAt
            : null;
          if (!bookingDate) return false;
          
          const bookingYear = bookingDate.getFullYear();
          const bookingMonth = String(bookingDate.getMonth() + 1).padStart(2, '0');
          const bookingDay = String(bookingDate.getDate()).padStart(2, '0');
          const bookingDateStr = `${bookingYear}-${bookingMonth}-${bookingDay}`;
          
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
            if (!transaction.timestamp) return false;
            // Convert transaction date to local date components
            const transactionDate = typeof transaction.timestamp === "string" 
              ? new Date(transaction.timestamp)
              : transaction.timestamp instanceof Date
              ? transaction.timestamp
              : null;
            if (!transactionDate) return false;
            
            const transactionYear = transactionDate.getFullYear();
            const transactionMonth = String(transactionDate.getMonth() + 1).padStart(2, '0');
            const transactionDay = String(transactionDate.getDate()).padStart(2, '0');
            const transactionDateStr = `${transactionYear}-${transactionMonth}-${transactionDay}`;
            
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
      fullDate: dateStr,
    });
  }

  return chartData;
};
