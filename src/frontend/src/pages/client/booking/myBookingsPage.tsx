import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CancelWithReasonButton from "../../../components/common/cancellation/CancelWithReasonButton";
import ClientBookingItemCard from "../../../components/client/ClientBookingItemCard";
import {
  useBookingManagement,
  EnhancedBooking,
} from "../../../hooks/bookingManagement";
import { useReviewManagement } from "../../../hooks/reviewManagement";
import { useReputation } from "../../../hooks/useReputation";
import { useNotifications } from "../../../hooks/useNotificationsWithPush";
import SharedMyBookingsPage, { SharedBooking } from "../../../components/shared/MyBookingsPage/SharedMyBookingsPage";

const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const bookingManagement = useBookingManagement();
  const { getServiceReviews, calculateServiceRating } = useReviewManagement({
    autoLoadUserReviews: false,
  });

  const [cancellingBooking, setCancellingBooking] =
    useState<EnhancedBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { notifications } = useNotifications();

  const notificationBookingIds = useMemo(() => {
    return new Set(
      notifications
        .filter((n) => !n.read && n.bookingId)
        .map((n) => n.bookingId as string),
    );
  }, [notifications]);

  const [serviceStatsMap, setServiceStatsMap] = useState<
    Record<
      string,
      {
        averageRating: number | null;
        reviews: any[];
        loading: boolean;
        reputation?: {
          trustScore: number;
          trustLevel: string;
          completedBookings: number;
        } | null;
      }
    >
  >({});

  const { fetchUserReputation } = useReputation();

  useEffect(() => {
    const fetchStatsForServices = async () => {
      const bookings = bookingManagement.bookings || [];
      const serviceIds = Array.from(
        new Set(
          bookings.map((b) => b.serviceId).filter(Boolean) as string[],
        ),
      );

      const mapCopy = { ...serviceStatsMap };
      const toFetch = serviceIds.filter((id) => !mapCopy[id]);
      if (toFetch.length === 0) return;

      await Promise.all(
        toFetch.map(async (serviceId) => {
          try {
            const booking = bookings.find(
              (b) => b.serviceId === serviceId,
            );

            mapCopy[serviceId] = {
              averageRating: null,
              reviews: [],
              loading: true,
              reputation: null,
            };

            const [avgRating, reviews] = await Promise.all([
              calculateServiceRating(serviceId),
              getServiceReviews(serviceId),
            ]);

            let reputation = null;
            if (booking?.providerProfile?.id) {
              try {
                const rep = await fetchUserReputation(
                  booking.providerProfile.id,
                );
                if (rep) {
                  reputation = {
                    trustScore: rep.trustScore,
                    trustLevel: rep.trustLevel,
                    completedBookings: rep.completedBookings,
                  };
                }
              } catch (err) {}
            }

            mapCopy[serviceId] = {
              averageRating: avgRating ?? null,
              reviews: Array.isArray(reviews) ? reviews : [],
              loading: false,
              reputation,
            };
          } catch (err) {
            mapCopy[serviceId] = {
              averageRating: null,
              reviews: [],
              loading: false,
            };
          }
        }),
      );

      setServiceStatsMap(mapCopy);
    };

    if ((bookingManagement.bookings || []).length > 0) fetchStatsForServices();
  }, [bookingManagement.bookings]);

  const handleCancelBooking = async (reason: string) => {
    if (!cancellingBooking) return;
    setIsCancelling(true);
    try {
      await bookingManagement.updateBookingStatus(
        cancellingBooking.id,
        "Cancelled",
        reason,
      );
      toast.success("Booking has been cancelled.");
      setCancellingBooking(null);
    } catch (error) {
      toast.error("Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCalendarItemClick = (id: string) => {
    const booking = bookingManagement.bookings?.find((b) => b.id === id);
    if (!booking) return;
    navigate(`/client/booking/${booking.id}`);
  };

  const renderBookingCard = (booking: SharedBooking) => {
    return (
      <ClientBookingItemCard
        booking={booking as EnhancedBooking}
        onCancelClick={(b) => setCancellingBooking(b)}
        averageRating={serviceStatsMap[booking.serviceId || ""]?.averageRating}
        reviewCount={serviceStatsMap[booking.serviceId || ""]?.reviews.length ?? 0}
        reviews={serviceStatsMap[booking.serviceId || ""]?.reviews}
        reputation={serviceStatsMap[booking.serviceId || ""]?.reputation}
        hasNotification={notificationBookingIds.has(booking.id)}
      />
    );
  };

  return (
    <SharedMyBookingsPage
      role="client"
      bookings={(bookingManagement.bookings || []) as SharedBooking[]}
      loading={bookingManagement.loading}
      error={bookingManagement.error}
      onRetry={() => bookingManagement.retryOperation("loadBookings")}
      notificationBookingIds={notificationBookingIds}
      renderBookingCard={renderBookingCard}
      onCalendarItemClick={handleCalendarItemClick}
      renderCancellationModal={() => (
        <CancelWithReasonButton
          show={!!cancellingBooking}
          isSubmitting={isCancelling}
          onSubmit={handleCancelBooking}
          onCancel={() => setCancellingBooking(null)}
          confirmTitle="Cancel Booking?"
          confirmDescription="Please let us know why you're cancelling this booking."
          textareaLabel="Reason for cancellation"
          submitText={isCancelling ? "Cancelling..." : "Submit Cancellation"}
          cancelText="Back"
        />
      )}
    />
  );
};

export default MyBookingsPage;
