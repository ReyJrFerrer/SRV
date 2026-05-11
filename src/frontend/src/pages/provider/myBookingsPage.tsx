import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProviderBookingItemCard from "../../components/provider/ProviderBookingItemCard";
import {
  useProviderBookingManagement,
  ProviderEnhancedBooking,
} from "../../hooks/useProviderBookingManagement";
import useClientRating from "../../hooks/useClientRating";
import { useReputation } from "../../hooks/useReputation";
import CancelWithReasonButton from "../../components/common/cancellation/CancelWithReasonButton";
import DeclineConfirmDialog from "../../components/provider/booking-details/DeclineConfirmDialog";
import { bookingCanisterService } from "../../services/bookingCanisterService";
import ClientRatingInfoModal from "../../components/common/ClientRatingInfoModal";
import { dispatchBookingInteracted } from "../../utils/interactionEvents";
import { useProviderNotificationsWithPush } from "../../hooks/useProviderNotificationsWithPush";
import SharedMyBookingsPage, { SharedBooking } from "../../components/shared/MyBookingsPage/SharedMyBookingsPage";

const ProviderBookingsPage: React.FC = () => {
  const navigate = useNavigate();

  const [showDeclineConfirm, setShowDeclineConfirm] = useState<boolean>(false);
  const [decliningBookingId, setDecliningBookingId] = useState<string | null>(
    null,
  );
  const [cancellingBooking, setCancellingBooking] =
    useState<ProviderEnhancedBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const {
    bookings,
    loading,
    error,
    refreshBookings,
    declineBookingById,
    isBookingActionInProgress,
    acceptBookingById,
    startBookingById,
    startNavigationById,
  } = useProviderBookingManagement();

  const { notifications } = useProviderNotificationsWithPush();

  const notificationBookingIds = useMemo(() => {
    return new Set(
      notifications
        .filter((n) => !n.read && n.bookingId)
        .map((n) => n.bookingId as string),
    );
  }, [notifications]);

  const { getClientReviewsByUser } = useClientRating();
  const { fetchUserReputation } = useReputation();

  const getClientName = useCallback(
    (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      return booking?.clientName || "the client";
    },
    [bookings],
  );

  interface ClientData {
    reviews: any[];
    reputation: any;
    loading: boolean;
  }

  const [clientDataMap, setClientDataMap] = useState<
    Record<string, ClientData>
  >({});

  const handleDeclineBooking = async () => {
    if (!decliningBookingId) return;

    try {
      await declineBookingById(
        decliningBookingId,
        "Booking declined by provider",
      );
      setShowDeclineConfirm(false);
      toast.success("Booking declined successfully");
      await refreshBookings();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to decline booking. Please try again.",
      );
    } finally {
      setDecliningBookingId(null);
    }
  };

  const handleCancelBooking = async (reason: string) => {
    if (!cancellingBooking) return;

    try {
      setIsCancelling(true);
      await bookingCanisterService.cancelBooking(cancellingBooking.id, reason);
      toast.success("Booking has been cancelled.");
      await refreshBookings();
      setCancellingBooking(null);
    } catch (error) {
      toast.error("Failed to cancel booking. Please try again.");
      throw error;
    } finally {
      setIsCancelling(false);
    }
  };

  const [showRatingInfo, setShowRatingInfo] = useState(false);

  useEffect(() => {
    const fetchStatsForClients = async () => {
      const clientIds = Array.from(
        new Set(
          (bookings || [])
            .map(
              (booking) =>
                booking.clientProfile?.id?.toString() ||
                booking.clientId?.toString(),
            )
            .filter(Boolean) as string[],
        ),
      );

      const mapCopy = { ...clientDataMap };
      const toFetch = clientIds.filter((id) => !mapCopy[id]);
      if (toFetch.length === 0) return;

      await Promise.all(
        toFetch.map(async (clientId) => {
          try {
            mapCopy[clientId] = {
              reviews: [],
              reputation: null,
              loading: true,
            };

            const [clientReviews, clientReputation] = await Promise.all([
              getClientReviewsByUser(clientId),
              fetchUserReputation(clientId),
            ]);

            mapCopy[clientId] = {
              reviews: clientReviews || [],
              reputation: clientReputation || null,
              loading: false,
            };
          } catch (err) {
            mapCopy[clientId] = {
              reviews: [],
              reputation: null,
              loading: false,
            };
          }
        }),
      );

      setClientDataMap(mapCopy);
    };

    if ((bookings || []).length > 0) fetchStatsForClients();
  }, [bookings, getClientReviewsByUser, fetchUserReputation]);

  const handleCalendarItemClick = (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;
    dispatchBookingInteracted(booking.id);
    navigate(`/provider/booking/${booking.id}`);
  };

  const renderBookingCard = (booking: SharedBooking) => {
    const clientId =
      booking.clientProfile?.id?.toString() ||
      booking.clientId?.toString();
    const clientData =
      clientId && clientDataMap[clientId]
        ? clientDataMap[clientId]
        : { reviews: [], reputation: null };

    return (
      <div
        onClick={() => {
          if (
            booking.status?.toLowerCase() === "inprogress" &&
            booking.id
          ) {
            navigate(`/provider/active-service/${booking.id}`);
          } else if (booking.id) {
            dispatchBookingInteracted(booking.id);
            navigate(`/provider/booking/${booking.id}`);
          }
        }}
        className="w-full cursor-pointer transition-shadow hover:shadow-lg"
      >
        <ProviderBookingItemCard
          booking={booking as ProviderEnhancedBooking}
          review={clientData.reviews}
          reputation={clientData.reputation}
          onDeclineClick={() => {
            setDecliningBookingId(booking.id);
            setShowDeclineConfirm(true);
          }}
          onCancelClick={(b: ProviderEnhancedBooking) => setCancellingBooking(b)}
          isDeclining={isBookingActionInProgress(booking.id, "decline")}
          acceptBookingById={acceptBookingById}
          isBookingActionInProgress={isBookingActionInProgress}
          startBookingById={startBookingById}
          startNavigationById={startNavigationById}
          hasNotification={notificationBookingIds.has(booking.id)}
        />
      </div>
    );
  };

  return (
    <SharedMyBookingsPage
      role="provider"
      bookings={(bookings || []) as SharedBooking[]}
      loading={loading}
      error={error}
      onRetry={() => refreshBookings()}
      notificationBookingIds={notificationBookingIds}
      renderBookingCard={renderBookingCard}
      onCalendarItemClick={handleCalendarItemClick}
      renderDeclineModal={() => (
        <DeclineConfirmDialog
          show={showDeclineConfirm}
          clientName={
            decliningBookingId ? getClientName(decliningBookingId) : "the client"
          }
          isDeclinining={
            !!decliningBookingId &&
            isBookingActionInProgress(decliningBookingId, "decline")
          }
          onCancel={() => {
            setShowDeclineConfirm(false);
            setDecliningBookingId(null);
          }}
          onConfirm={handleDeclineBooking}
        />
      )}
      renderRatingModal={() => (
        <ClientRatingInfoModal
          isOpen={showRatingInfo}
          onClose={() => setShowRatingInfo(false)}
          role="provider"
        />
      )}
      renderCancellationModal={() => (
        <CancelWithReasonButton
          show={!!cancellingBooking}
          confirmTitle="Cancel Booking?"
          confirmDescription="Please provide a reason for cancelling this booking."
          textareaLabel="Reason for cancellation"
          submitText={isCancelling ? "Cancelling..." : "Submit"}
          cancelText="Back"
          isSubmitting={isCancelling}
          onSubmit={handleCancelBooking}
          onCancel={() => setCancellingBooking(null)}
        />
      )}
    />
  );
};

export default ProviderBookingsPage;
