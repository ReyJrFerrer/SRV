/**
 * Client Tracking Page
 *
 * Full-screen Grab-style tracking experience for clients to see
 * their provider's real-time location as they navigate to the service location.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useBookingManagement } from "../../../hooks/bookingManagement";
import { useProviderLocationSubscriber } from "../../../hooks/useProviderLocationSubscriber";
import { useChat } from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import ProviderTrackingMap from "../../../components/client/tracking/ProviderTrackingMap";
import TrackingInfoCard from "../../../components/client/tracking/TrackingInfoCard";
import StreetViewModal from "../../../components/provider/directions/StreetViewModal";

const ClientTrackingPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { identity } = useAuth();
  const { bookings, loading: bookingsLoading } = useBookingManagement();
  const { conversations, createConversation } = useChat();

  // Find the specific booking
  const booking = bookings.find((b) => b.id === bookingId);

  // Subscribe to provider location
  const {
    providerLocation,
    isLoading: locationLoading,
    error: locationError,
    lastUpdated,
    isStale,
  } = useProviderLocationSubscriber({
    bookingId: bookingId,
    enabled: Boolean(booking && (booking as any).navigationStartedNotified),
  });

  // Destination coordinates from booking
  const [destinationCoords, setDestinationCoords] =
    useState<google.maps.LatLngLiteral | null>(null);

  // Street view modal state
  const [showStreetView, setShowStreetView] = useState<boolean>(false);

  // Track if Google Maps API is loaded
  const [isMapApiLoaded, setIsMapApiLoaded] = useState(false);

  // ETA and distance from map
  const [etaText, setEtaText] = useState<string | null>(null);
  const [distanceText, setDistanceText] = useState<string | null>(null);

  // Follow me state and map ref
  const [followMe, setFollowMe] = useState<boolean>(true);
  const mapRef = React.useRef<google.maps.Map | null>(null);

  const mapApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Resolve destination coordinates from booking location
  useEffect(() => {
    if (!booking || !isMapApiLoaded) return;

    // Check for explicit coordinates
    const explicitLat = (booking as any)?.latitude;
    const explicitLng = (booking as any)?.longitude;
    if (typeof explicitLat === "number" && typeof explicitLng === "number") {
      setDestinationCoords({ lat: explicitLat, lng: explicitLng });
      return;
    }

    // If we already have destination coords, don't re-geocode
    if (destinationCoords) return;

    // Geocode the location string
    const location =
      (booking as any)?.formattedLocation || (booking as any)?.location;
    if (!location || !(window as any).google?.maps) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: location }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        setDestinationCoords(coords);
      }
    });
  }, [booking, isMapApiLoaded, destinationCoords]);

  // Redirect if booking not valid for tracking
  useEffect(() => {
    if (bookingsLoading) return;

    // Wait for bookings to load before checking if booking exists
    if (bookings.length === 0) return;

    if (!booking) {
      navigate("/client/booking", { replace: true });
      return;
    }

    // Check if navigation has started
    if (!(booking as any).navigationStartedNotified) {
      navigate(`/client/booking/${bookingId}`, { replace: true });
      return;
    }

    // Check if booking is still trackable
    if (!["Accepted"].includes(booking.status || "")) {
      navigate(`/client/booking/${bookingId}`, { replace: true });
    }
  }, [booking, bookings.length, bookingsLoading, bookingId, navigate]);

  // Handle chat with provider
  const handleChat = useCallback(async () => {
    if (!booking?.providerId || !identity) return;

    try {
      const currentUserId = identity.getPrincipal().toString();
      const providerIdString = booking.providerId.toString();

      // Check for existing conversation
      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === providerIdString) ||
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === providerIdString),
      );

      if (existingConversation) {
        navigate(`/client/chat/${existingConversation.conversation.id}`);
        return;
      }

      // Create new conversation
      const newConv = await createConversation(currentUserId, providerIdString);
      if (newConv?.id) {
        navigate(`/client/chat/${newConv.id}`);
      }
    } catch (error) {
      console.error("Failed to start chat:", error);
    }
  }, [booking, identity, conversations, createConversation, navigate]);

  // Handle booking cancellation
  const handleCancel = useCallback(() => {
    navigate(`/client/booking/${bookingId}`);
  }, [bookingId, navigate]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Handle close tracking
  const handleClose = useCallback(() => {
    navigate(`/client/booking/${bookingId}`);
  }, [bookingId, navigate]);

  // Loading state
  if (bookingsLoading || !booking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-gray-600">Loading tracking...</p>
        </div>
      </div>
    );
  }

  const providerProfile = (booking as any).providerProfile;
  const providerName = providerProfile?.name || "Provider";
  const providerPhoto = providerProfile?.profilePicture?.imageUrl || null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-100">
      {/* Map fills entire screen */}
      <ProviderTrackingMap
        providerLocation={
          providerLocation
            ? { lat: providerLocation.lat, lng: providerLocation.lng }
            : null
        }
        clientLocation={destinationCoords}
        heading={providerLocation?.heading}
        mapApiKey={mapApiKey}
        onMapReady={(map) => {
          setIsMapApiLoaded(true);
          mapRef.current = map;
        }}
        autoFollow={followMe}
        onAutoFollowChange={setFollowMe}
        className="h-full w-full"
        destinationName={
          (booking as any)?.formattedLocation || (booking as any)?.location
        }
        onRouteCalculated={(eta, distance) => {
          setEtaText(eta);
          setDistanceText(distance);
        }}
      />

      {/* Back button overlay */}
      <div className="absolute left-4 top-4 z-20">
        <button
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-lg backdrop-blur hover:bg-white"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      {/* Error state overlay */}
      {locationError && (
        <div className="absolute left-4 right-4 top-16 z-20 rounded-lg bg-red-50 p-3 text-sm text-red-700 shadow">
          Unable to get provider location: {locationError}
        </div>
      )}

      {/* Loading state overlay */}
      {locationLoading && !providerLocation && (
        <div className="absolute left-1/2 top-1/3 z-20 -translate-x-1/2 rounded-xl bg-white/95 p-6 text-center shadow-lg backdrop-blur">
          <div className="border-3 mx-auto h-8 w-8 animate-spin rounded-full border-blue-500 border-t-transparent" />
          <p className="mt-3 font-medium text-gray-700">
            Connecting to provider...
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Please wait while we locate your provider
          </p>
        </div>
      )}

      {/* Bottom tracking info card */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <TrackingInfoCard
          providerName={providerName}
          providerPhoto={providerPhoto}
          etaText={etaText}
          distanceText={distanceText}
          destinationName={
            (booking as any)?.formattedLocation || (booking as any)?.location
          }
          lastUpdated={lastUpdated}
          isStale={isStale}
          onChat={handleChat}
          onCancel={handleCancel}
          onClose={handleClose}
          onStreetView={() => setShowStreetView(true)}
          showStreetViewButton={!!destinationCoords}
          followMe={followMe}
          setFollowMe={setFollowMe}
          onRecenter={() => {
            if (mapRef.current && providerLocation) {
              mapRef.current.panTo({
                lat: providerLocation.lat,
                lng: providerLocation.lng,
              });
            }
          }}
        />
      </div>

      {/* Street View Modal */}
      <StreetViewModal
        show={showStreetView}
        position={destinationCoords}
        onClose={() => setShowStreetView(false)}
      />

      {/* Hide navigation bar on this page for immersive experience */}
    </div>
  );
};

export default ClientTrackingPage;
