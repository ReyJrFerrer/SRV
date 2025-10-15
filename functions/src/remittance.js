const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

/**
 * Helper function to safely get user authentication info
 * @param {object} context - Firebase Functions context
 * @param {object} data - Request data
 * @return {object} User authentication info
 */
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

/**
 * Get all service providers with their analytics data
 */
exports.getAllServiceProviders = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get all service providers",
    );
  }

  try {
    // Get all users with provider role
    const usersSnapshot = await db.collection("profiles")
      .where("role", "==", "Provider")
      .get();

    const providers = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Get user's bookings to calculate analytics
      const bookingsSnapshot = await db.collection("bookings")
        .where("providerId", "==", userDoc.id)
        .get();

      let totalEarnings = 0;
      let totalOrdersCompleted = 0;
      let totalServiceAmount = 0;
      let settledCommission = 0;
      let pendingCommission = 0;

      bookingsSnapshot.forEach((bookingDoc) => {
        const booking = bookingDoc.data();
        if (booking.status === "Completed") {
          totalOrdersCompleted++;
          const amount = booking.amountPaid || 0;
          totalServiceAmount += amount;
          
          // Calculate commission (assuming 10% for now)
          const commission = Math.round(amount * 0.1);
          totalEarnings += commission;
          
          if (booking.paymentReleased) {
            settledCommission += commission;
          } else {
            pendingCommission += commission;
          }
        }
      });

      const averageOrderValue = totalOrdersCompleted > 0 
        ? Math.round(totalServiceAmount / totalOrdersCompleted) 
        : 0;

      providers.push({
        id: userDoc.id,
        name: userData.name || "Unknown",
        phone: userData.phone || "",
        totalEarnings: totalEarnings,
        pendingCommission: pendingCommission,
        settledCommission: settledCommission,
        lastActivity: userData.updatedAt?.toDate() || new Date(),
        outstandingBalance: pendingCommission,
        pendingOrders: 0, // TODO: Calculate from pending bookings
        overdueOrders: 0, // TODO: Calculate from overdue bookings
        totalOrdersCompleted: totalOrdersCompleted,
        averageOrderValue: averageOrderValue,
        nextDeadline: null, // TODO: Calculate next settlement deadline
      });
    }

    return {
      success: true,
      providers: providers,
    };
  } catch (error) {
    console.error("Error in getAllServiceProviders:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get system-wide remittance statistics
 */
exports.getSystemRemittanceStats = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get system remittance statistics",
    );
  }

  try {
    const {fromDate, toDate} = data.data || data;

    // Build query for bookings
    let bookingsQuery = db.collection("bookings");
    
    if (fromDate) {
      bookingsQuery = bookingsQuery.where("createdAt", ">=", new Date(fromDate));
    }
    if (toDate) {
      bookingsQuery = bookingsQuery.where("createdAt", "<=", new Date(toDate));
    }

    const bookingsSnapshot = await bookingsQuery.get();

    let totalOrders = 0;
    let totalSettledOrders = 0;
    let totalPendingOrders = 0;
    let totalCommissionPaid = 0;
    let totalServiceAmount = 0;
    let totalOverdueOrders = 0;
    let totalCommissionAmount = 0;

    bookingsSnapshot.forEach((bookingDoc) => {
      const booking = bookingDoc.data();
      
      if (booking.status === "Completed") {
        totalOrders++;
        const amount = booking.amountPaid || 0;
        totalServiceAmount += amount;
        
        // Calculate commission (assuming 10% for now)
        const commission = Math.round(amount * 0.1);
        totalCommissionAmount += commission;
        
        if (booking.paymentReleased) {
          totalSettledOrders++;
          totalCommissionPaid += commission;
        } else {
          totalPendingOrders++;
        }
      }
    });

    const averageOrderValue = totalOrders > 0 
      ? Math.round(totalServiceAmount / totalOrders) 
      : 0;

    const averageCommissionRate = totalServiceAmount > 0 
      ? (totalCommissionAmount / totalServiceAmount) * 100 
      : 0;

    const stats = {
      totalOrders: totalOrders,
      totalSettledOrders: totalSettledOrders,
      totalPendingOrders: totalPendingOrders,
      totalCommissionPaid: totalCommissionPaid,
      totalServiceAmount: totalServiceAmount,
      totalOverdueOrders: totalOverdueOrders,
      averageOrderValue: averageOrderValue,
      averageCommissionRate: averageCommissionRate,
    };

    return {
      success: true,
      stats: stats,
    };
  } catch (error) {
    console.error("Error in getSystemRemittanceStats:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Query remittance orders with filtering and pagination
 */
exports.queryRemittanceOrders = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can query remittance orders",
    );
  }

  try {
    const {filter = {}, page = {}} = data.data || data;
    const {status, serviceProviderId, fromDate, toDate} = filter;
    const {cursor, size = 50} = page;

    // Build query for bookings
    let bookingsQuery = db.collection("bookings");

    if (status && status.length > 0) {
      // Map remittance status to booking status
      const statusMap = {
        "AwaitingPayment": "Pending",
        "PaymentSubmitted": "Pending",
        "PaymentValidated": "InProgress",
        "Settled": "Completed",
        "Cancelled": "Cancelled",
      };
      
      const bookingStatuses = status.map(s => statusMap[s] || s).filter(Boolean);
      if (bookingStatuses.length > 0) {
        bookingsQuery = bookingsQuery.where("status", "in", bookingStatuses);
      }
    }

    if (serviceProviderId) {
      bookingsQuery = bookingsQuery.where("providerId", "==", serviceProviderId);
    }

    if (fromDate) {
      bookingsQuery = bookingsQuery.where("createdAt", ">=", new Date(fromDate));
    }
    if (toDate) {
      bookingsQuery = bookingsQuery.where("createdAt", "<=", new Date(toDate));
    }

    // Add pagination
    if (cursor) {
      const cursorDoc = await db.collection("bookings").doc(cursor).get();
      if (cursorDoc.exists) {
        bookingsQuery = bookingsQuery.startAfter(cursorDoc);
      }
    }

    bookingsQuery = bookingsQuery.limit(size + 1); // Get one extra to check if there are more

    const bookingsSnapshot = await bookingsQuery.get();
    const bookings = [];
    let nextCursor = null;

    bookingsSnapshot.forEach((bookingDoc, index) => {
      if (index < size) {
        const booking = bookingDoc.data();
        
        // Map booking to remittance order format
        const amount = booking.amountPaid || 0;
        const commission = Math.round(amount * 0.1); // Assuming 10% commission
        
        // Map booking status to remittance status
        let remittanceStatus = "AwaitingPayment";
        if (booking.status === "Completed") {
          remittanceStatus = booking.paymentReleased ? "Settled" : "PaymentValidated";
        } else if (booking.status === "Cancelled") {
          remittanceStatus = "Cancelled";
        } else if (booking.status === "InProgress") {
          remittanceStatus = "PaymentSubmitted";
        }

        bookings.push({
          id: bookingDoc.id,
          serviceProviderId: booking.providerId,
          serviceProviderName: booking.providerName || "Unknown",
          amount: amount,
          serviceType: booking.serviceName || "Service",
          serviceId: booking.serviceId,
          bookingId: bookingDoc.id,
          paymentMethod: "CashOnHand",
          status: remittanceStatus,
          commissionRuleId: "default-rule",
          commissionVersion: 1,
          commissionAmount: commission,
          paymentProofMediaIds: [],
          validatedBy: booking.paymentReleased ? "system" : undefined,
          validatedAt: booking.paymentReleased ? booking.updatedAt?.toDate() : undefined,
          createdAt: booking.createdAt?.toDate() || new Date(),
          paymentSubmittedAt: booking.status === "InProgress" ? booking.updatedAt?.toDate() : undefined,
          settledAt: booking.paymentReleased ? booking.updatedAt?.toDate() : undefined,
          updatedAt: booking.updatedAt?.toDate() || new Date(),
        });
      } else {
        nextCursor = bookingDoc.id;
      }
    });

    return {
      success: true,
      page: {
        items: bookings,
        nextCursor: nextCursor,
        totalCount: bookings.length, // This is approximate, could be improved with count queries
      },
    };
  } catch (error) {
    console.error("Error in queryRemittanceOrders:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
