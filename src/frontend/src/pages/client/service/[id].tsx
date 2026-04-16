// SECTION: Imports — dependencies for this page
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  StarIcon,
  MapPinIcon,
  CheckBadgeIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/solid";
import useServiceById from "../../../hooks/serviceDetail";
import { useServiceReviews } from "../../../hooks/reviewManagement";
import { useChat } from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import {
  useServiceImages,
  useServiceCertificates,
} from "../../../hooks/useMediaLoader";
import { useReputation } from "../../../hooks/useReputation";
import BottomNavigation from "../../../components/client/NavigationBar";
import {
  ServicePackage,
  serviceCanisterService,
} from "../../../services/serviceCanisterService";
import { useUserImage } from "../../../hooks/useMediaLoader";
import bookingCanisterService from "../../../services/bookingCanisterService";
import ReputationScore from "../../../components/client/service-detail/ReputationScore";
import ReviewsSection from "../../../components/client/service-detail/ReviewsSection";
import ServiceGallerySection from "../../../components/client/service-detail/ServiceGallerySection";
import CredentialsSection from "../../../components/client/service-detail/CredentialsSection";
import AvailabilitySection, {
  Availability,
} from "../../../components/client/service-detail/AvailabilitySection";
import EmptyState from "../../../components/common/EmptyState";

function formatTime12Hour(time: string): string {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (isNaN(hour) || isNaN(minute)) return time;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

const ClientServiceDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: serviceId } = useParams<{ id: string }>();
  const { identity } = useAuth();

  const {
    service,
    loading: serviceLoading,
    error: serviceError,
  } = useServiceById(serviceId as string);

  const {
    reviews,
    getAverageRating,
    getRatingDistribution,
    loading: reviewsLoading,
    error: reviewsError,
  } = useServiceReviews(serviceId as string);

  const { images: heroImages } = useServiceImages(
    service?.id,
    service?.media || [],
  );

  const {
    certificates: serviceCertificates,
    isLoading: isLoadingCertificates,
  } = useServiceCertificates(service?.id, service?.certificateUrls || []);

  const { conversations, createConversation, loading: chatLoading } = useChat();
  const { userImageUrl } = useUserImage(service?.providerAvatar);

  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true);
  const [chatErrorMessage, setChatErrorMessage] = useState<string | null>(null);
  const [isCheckingReputation, setIsCheckingReputation] = useState(false);
  const [reputationError, setReputationError] = useState<string | null>(null);
  const [hasSufficientReputation, setHasSufficientReputation] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const { fetchUserReputation } = useReputation();
  const [providerRep, setProviderRep] = useState<any | null>(null);

  useEffect(() => {
    const checkReputations = async () => {
      if (!service?.providerId || !identity) {
        setHasSufficientReputation(true);
        return;
      }

      try {
        setIsCheckingReputation(true);
        setReputationError(null);

        const currentUserRep = await fetchUserReputation(
          identity.getPrincipal().toString(),
        );
        const fetchedProviderRep = await fetchUserReputation(
          service.providerId,
        );
        setProviderRep(fetchedProviderRep);
        const isCurrentUserEligible =
          currentUserRep && currentUserRep.trustScore >= 5;
        const isProviderEligible =
          fetchedProviderRep && fetchedProviderRep.trustScore >= 5;

        if (!isCurrentUserEligible || !isProviderEligible) {
          if (!isCurrentUserEligible) {
            setReputationError(
              "Your reputation score is too low to book this service. Please complete your profile and earn more positive reviews.",
            );
          } else if (!isProviderEligible) {
            setReputationError(
              "This service provider's reputation score is currently too low to accept new bookings.",
            );
          }
          setHasSufficientReputation(false);
        } else {
          setHasSufficientReputation(true);
        }
      } catch (error) {
        setReputationError(
          "Unable to verify reputation requirements. Please try again later.",
        );
        setHasSufficientReputation(false);
      } finally {
        setIsCheckingReputation(false);
      }
    };

    checkReputations();
  }, [service, identity, fetchUserReputation]);

  useEffect(() => {
    if (service) {
      document.title = `${service.name} | SRV`;
    }
  }, [service]);

  useEffect(() => {
    if (!service?.id) {
      setPackages([]);
      setLoadingPackages(false);
      return;
    }

    setLoadingPackages(true);

    const unsubscribe = serviceCanisterService.subscribeToServicePackages(
      service.id,
      (packageData) => {
        setPackages(packageData);
        setLoadingPackages(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [service?.id]);

  const handleBookNow = () => {
    if (!service) return;
    navigate(`/client/book/${service.id}`);
  };

  const isOwnService = Boolean(
    identity &&
      service &&
      identity.getPrincipal().toString() === service.providerId,
  );

  const handleChatProviderClick = async () => {
    if (!service?.providerId) {
      setChatErrorMessage("Provider information is missing.");
      return;
    }

    if (!identity) {
      setChatErrorMessage("You must be logged in to start a conversation.");
      return;
    }

    if (isCreatingChat) return;

    setChatErrorMessage(null);
    setIsCreatingChat(true);

    try {
      const currentUserId = identity.getPrincipal().toString();

      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === service.providerId) ||
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === service.providerId),
      );

      const resolveHeroImage = (): string | undefined => {
        const firstImage = heroImages?.[0]?.dataUrl;
        const isValidUrl = (url?: string | null): url is string =>
          !!url &&
          (url.startsWith("data:") ||
            url.startsWith("http") ||
            url.startsWith("/")) &&
          url.length > 20;
        if (isValidUrl(firstImage)) return firstImage;
        if (service?.category?.slug)
          return `/images/ai-sp/${service.category.slug}.svg`;
        return "/default-provider.svg";
      };

      const preview = {
        id: service.id,
        name: service.name,
        imageUrl: resolveHeroImage(),
        price:
          Array.isArray(packages) && packages.length > 0
            ? Math.min(
                ...packages
                  .map((p: any) =>
                    typeof p?.price === "number" ? p.price : Number(p?.price),
                  )
                  .filter((n: number) => !isNaN(n)),
              )
            : undefined,
      } as { id: string; name: string; imageUrl?: string; price?: number };

      try {
        const providerBookings =
          await bookingCanisterService.getProviderBookings(
            service.providerId as any,
          );
        const serviceBookingsCount = (providerBookings || []).filter(
          (b) => b.serviceId === service.id,
        ).length;
        (preview as any).bookingsCount = serviceBookingsCount;
      } catch {
        // ignore errors and leave bookingsCount undefined
      }

      if (existingConversation) {
        navigate(`/client/chat/${service.providerId}`, {
          state: {
            conversationId: existingConversation.conversation.id,
            otherUserName: existingConversation.otherUserName,
            otherUserImage: service.providerAvatar,
            servicePreview: preview,
          },
        });
        return;
      }

      // Create new conversation if none exists
      const newConversation = await createConversation(
        currentUserId,
        service.providerId,
      );

      if (newConversation) {
        navigate(`/client/chat/${service.providerId}`, {
          state: {
            conversationId: newConversation.id,
            otherUserName: service.providerName,
            otherUserImage: service.providerAvatar,
            servicePreview: preview,
          },
        });
      }
    } catch (error) {
      setChatErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not start conversation. Please try again.",
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

  if (serviceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-28 md:pb-20">
        {/* Hero Image Skeleton */}
        <div className="relative h-60 w-full animate-pulse bg-gray-300"></div>

        <main className="relative z-10 -mt-24 p-4">
          <div className="mx-auto mt-6 w-full max-w-5xl">
            {/* Main Card Skeleton */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
                {/* Provider Info Skeleton */}
                <div className="flex flex-col justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex flex-col items-center">
                      {/* Avatar Skeleton */}
                      <div className="h-24 w-24 animate-pulse rounded-full border-4 border-white bg-gray-300"></div>
                      {/* Provider Name Skeleton */}
                      <div className="mt-2 h-7 w-32 animate-pulse rounded bg-gray-300"></div>
                    </div>
                    {/* Reputation Badge Skeleton */}
                    <div className="mt-1 h-6 w-24 animate-pulse rounded bg-gray-300"></div>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-100 lg:hidden"></div>

                {/* Service Details Skeleton */}
                <div className="mt-4 flex flex-col justify-center lg:mt-0 lg:border-l lg:border-blue-200 lg:pl-8">
                  {/* Service Name Skeleton */}
                  <div className="mb-2 h-8 w-3/4 animate-pulse rounded bg-gray-300 lg:h-10"></div>
                  {/* Category Skeleton */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-6 w-6 animate-pulse rounded bg-gray-300"></div>
                    <div className="h-6 w-24 animate-pulse rounded bg-gray-300"></div>
                  </div>
                  {/* Location Skeleton */}
                  <div className="mb-2 flex items-center">
                    <div className="mr-2 h-6 w-6 animate-pulse rounded bg-gray-300"></div>
                    <div className="h-5 w-40 animate-pulse rounded bg-gray-300"></div>
                  </div>
                  {/* Rating Skeleton */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-6 w-6 animate-pulse rounded bg-gray-300"></div>
                    <div className="h-6 w-12 animate-pulse rounded bg-gray-300"></div>
                    <div className="h-5 w-20 animate-pulse rounded bg-gray-300"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Packages Section Skeleton */}
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-6 w-6 animate-pulse rounded bg-gray-300"></div>
              <div className="h-6 w-32 animate-pulse rounded bg-gray-300"></div>
            </div>
            <div className="flex flex-col gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="group relative flex flex-col items-stretch overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:flex-row"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="h-6 w-3/4 animate-pulse rounded bg-gray-300"></div>
                      <div className="h-4 w-full animate-pulse rounded bg-gray-300"></div>
                      <div className="h-4 w-2/3 animate-pulse rounded bg-gray-300"></div>
                    </div>
                  </div>
                  <div className="ml-0 mt-4 flex min-w-[120px] flex-col items-end justify-between md:ml-6 md:mt-0">
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-300"></div>
                  </div>
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-bl-2xl bg-yellow-300"></span>
                </div>
              ))}
            </div>
          </div>

          {/* Availability Section Skeleton */}
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-300"></div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 w-20 animate-pulse rounded-lg bg-gray-300"
                ></div>
              ))}
            </div>
          </div>

          {/* Gallery Section Skeleton */}
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-300"></div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-lg bg-gray-300"
                ></div>
              ))}
            </div>
          </div>

          {/* Credentials Section Skeleton */}
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-300"></div>
            <div className="flex flex-wrap gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-32 w-48 animate-pulse rounded-lg bg-gray-300"
                ></div>
              ))}
            </div>
          </div>

          {/* Reviews Section Skeleton */}
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-6 w-32 animate-pulse rounded bg-gray-300"></div>
              <div className="h-6 w-24 animate-pulse rounded bg-gray-300"></div>
            </div>
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border-b border-gray-100 pb-4 last:border-0"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-gray-300"></div>
                    <div className="flex-1">
                      <div className="mb-1 h-5 w-32 animate-pulse rounded bg-gray-300"></div>
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-300"></div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-300"></div>
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-300"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Bottom Navigation Skeleton */}
        <div className="shadow-t-lg bottom-15 fixed left-0 z-40 flex w-full flex-row items-center gap-x-3 border-t border-gray-100 bg-white p-3 md:bottom-0 md:left-20 md:w-[calc(100%-5rem)]">
          <div className="mx-auto flex w-full items-center justify-between gap-3">
            <div
              className="h-12 w-24 animate-pulse rounded-lg bg-gray-300"
              style={{ flexBasis: "32%" }}
            ></div>
            <div
              className="h-12 flex-1 animate-pulse rounded-xl bg-gray-300"
              style={{ flexBasis: "68%" }}
            ></div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (serviceError || !service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">
          {serviceError ? "Error Loading Service" : "Service Not Found"}
        </h1>
        <button
          onClick={() => navigate("/client/home")}
          className="rounded-2xl bg-blue-600 px-5 py-3.5 font-black text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const { providerName, name, category, location } = service;

  const hasCertificates =
    !isLoadingCertificates &&
    serviceCertificates &&
    serviceCertificates.length > 0;
  const isVerified = hasCertificates
    ? serviceCertificates.some((cert) => cert.validationStatus === "Validated")
    : false;
  const hasPendingCertificates = hasCertificates
    ? serviceCertificates.some(
        (cert) => cert.validationStatus === "Pending" || !cert.validationStatus,
      )
    : false;
  const visibleReviews = reviews.filter((r) => r.status === "Visible");
  const averageRating = getAverageRating(visibleReviews);
  const reviewCount = visibleReviews.length;

  let mappedAvailability:
    | (Availability & { timeSlotsByDay?: Record<string, string[]> })
    | undefined = undefined;

  if (service.availability) {
    const { schedule, isAvailableNow, weeklySchedule } = service.availability;
    let availableDays: string[] = [];
    let timeSlotsByDay: Record<string, string[]> = {};

    // Helper function to format time to 12-hour format
    const formatTo12Hour = (time: string): string => {
      const [hourStr, minuteStr] = time.split(":");
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      if (isNaN(hour) || isNaN(minute)) return time;
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12;
      if (hour === 0) hour = 12;
      return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
    };

    // Use weeklySchedule if available (preferred - has correct day-to-slot associations)
    if (
      weeklySchedule &&
      Array.isArray(weeklySchedule) &&
      weeklySchedule.length > 0
    ) {
      weeklySchedule.forEach((dayEntry) => {
        if (dayEntry.availability?.isAvailable) {
          availableDays.push(dayEntry.day);
          timeSlotsByDay[dayEntry.day] = (
            dayEntry.availability.slots || []
          ).map(
            (slot) =>
              `${formatTo12Hour(slot.startTime)} - ${formatTo12Hour(slot.endTime)}`,
          );
        }
      });
    } else if (Array.isArray(schedule) && schedule.length > 0) {
      // Fallback to legacy format (flat schedule/timeSlots arrays)
      availableDays = schedule
        .map((s: any) => {
          if (typeof s === "string") return s;
          if (typeof s === "object" && s.day) return s.day;
          return undefined;
        })
        .filter((d): d is string => typeof d === "string");

      // Initialize empty slots for each day
      availableDays.forEach((day) => {
        timeSlotsByDay[day] = [];
      });

      // Legacy: distribute slots evenly (this is the problematic format)
      const { timeSlots } = service.availability;
      if (Array.isArray(timeSlots) && timeSlots.length > 0) {
        timeSlots.forEach(
          (slot: string | { day?: string; start?: string; end?: string }) => {
            if (typeof slot === "string") {
              let formattedSlot = slot;
              if (!slot.includes("AM") && !slot.includes("PM")) {
                const match = slot.match(
                  /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/,
                );
                if (match) {
                  const [, startHour, startMin, endHour, endMin] = match;
                  const startTime = `${startHour.padStart(2, "0")}:${startMin}`;
                  const endTime = `${endHour.padStart(2, "0")}:${endMin}`;
                  formattedSlot = `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
                }
              }
              // In legacy format, we can't know which day the slot belongs to
              // So we'll just add to all days (this is the bug the weeklySchedule fixes)
              availableDays.forEach((day) => {
                if (!timeSlotsByDay[day].includes(formattedSlot)) {
                  timeSlotsByDay[day].push(formattedSlot);
                }
              });
            } else if (
              slot &&
              typeof slot === "object" &&
              "start" in slot &&
              "end" in slot &&
              slot.start &&
              slot.end
            ) {
              const formattedSlot = `${formatTime12Hour(slot.start)} - ${formatTime12Hour(slot.end)}`;
              const day = slot.day || availableDays[0];
              if (availableDays.includes(day)) {
                if (!timeSlotsByDay[day]) timeSlotsByDay[day] = [];
                if (!timeSlotsByDay[day].includes(formattedSlot)) {
                  timeSlotsByDay[day].push(formattedSlot);
                }
              }
            }
          },
        );
      }
    }

    mappedAvailability = {
      isAvailableNow,
      availableDays,
      timeSlotsByDay,
    };
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 md:pb-20">
      <div className="relative h-64 w-full md:h-80">
        {/* Accept any valid URL (data:, http(s), or local path) for hero images */}
        <img
          src={(() => {
            const firstImage = heroImages?.[0]?.dataUrl;
            const isValidUrl = (url?: string | null): url is string =>
              !!url &&
              (url.startsWith("data:") ||
                url.startsWith("http") ||
                url.startsWith("/")) &&
              url.length > 20;

            if (isValidUrl(firstImage)) {
              return firstImage;
            }
            if (service?.category?.slug) {
              return `/images/ai-sp/${service.category.slug}.svg`;
            }
            return "/default-provider.svg";
          })()}
          alt={name}
          className="h-full w-full object-cover object-center"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/default-provider.svg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent"></div>
      </div>

      <main className="relative z-10 -mt-24 p-4 md:-mt-32">
        {chatErrorMessage && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm">
            <span className="block sm:inline">{chatErrorMessage}</span>
            <button
              onClick={() => setChatErrorMessage(null)}
              className="float-right ml-4 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}
        <div className="mx-auto mt-2 w-full max-w-5xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-8">
              {/* Left: Service Details */}
              <div className="flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                    {category?.slug ? (
                      <img
                        src={`/images/categories/${category.slug}.svg`}
                        alt={category.name || "Category"}
                        className="h-4 w-4 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/images/categories/others.svg";
                        }}
                      />
                    ) : null}
                    {category?.name ?? "General"}
                  </span>
                  <div className="flex items-center text-sm font-medium text-gray-500">
                    <MapPinIcon className="mr-1 h-4 w-4 text-gray-400" />
                    <span>{location?.address || "Baguio City"}</span>
                  </div>
                </div>

                <h1 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
                  {name}
                </h1>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <StarIcon className="h-6 w-6 text-yellow-400" />
                    <span className="text-xl font-bold text-gray-900">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">
                    ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
                  </span>
                </div>
              </div>

              {/* Right: Provider Details */}
              <div className="flex min-w-[280px] flex-col rounded-xl border border-gray-100 bg-gray-50 p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                    <img
                      src={(() => {
                        const isValidUrl = (
                          url?: string | null,
                        ): url is string =>
                          !!url &&
                          (url.startsWith("data:") ||
                            url.startsWith("http") ||
                            url.startsWith("/")) &&
                          url.length > 20;

                        if (isValidUrl(userImageUrl)) {
                          return userImageUrl;
                        }
                        return "/default-provider.svg";
                      })()}
                      alt={providerName}
                      className="h-full w-full rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/default-provider.svg";
                      }}
                    />
                    {service.isActive && (
                      <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500 shadow-sm"></span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900">
                      {providerName}
                    </h2>
                    <ReputationScore reputation={providerRep} />
                  </div>
                </div>
                {isVerified === true && (
                  <div className="mt-4 flex items-center justify-center rounded-lg bg-blue-50/50 py-2 text-xs font-semibold text-blue-600">
                    <CheckBadgeIcon className="mr-1.5 h-4 w-4" />
                    Verified Provider
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
              <Squares2X2Icon className="h-6 w-6 text-yellow-500" />
              Packages Offered
            </h3>
            {loadingPackages ? (
              <div className="p-4 text-center text-sm font-medium text-gray-500">
                Loading packages...
              </div>
            ) : packages.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex flex-col justify-between rounded-xl border border-gray-100 bg-gray-50 p-5 transition-colors hover:border-blue-200 hover:bg-white"
                  >
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {pkg.title}
                      </h4>
                      <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                        {pkg.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-2xl font-extrabold text-blue-600">
                        ₱
                        {Number(pkg.price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4">
                <EmptyState
                  icon={<Squares2X2Icon className="h-10 w-10 text-gray-300" />}
                  title="No packages available"
                  message="No packages are currently available for this service."
                />
              </div>
            )}
          </div>

          <AvailabilitySection
            availability={mappedAvailability}
            isActive={service?.isActive}
          />
          <ServiceGallerySection
            serviceId={service.id}
            imageUrls={service.media || []}
          />
          <CredentialsSection
            isVerified={isVerified}
            hasCertificates={hasCertificates}
            hasPendingCertificates={hasPendingCertificates}
          />
          <ReviewsSection
            serviceId={service.id}
            reviews={reviews}
            loading={reviewsLoading}
            error={reviewsError}
            averageRating={getAverageRating(reviews)}
            ratingDistribution={getRatingDistribution(reviews)}
          />
        </div>
      </main>

      <div className="shadow-t-lg bottom-15 fixed left-0 z-40 flex w-full items-center border-t border-gray-100 bg-white/95 p-4 backdrop-blur-sm md:bottom-0 md:left-20 md:w-[calc(100%-5rem)]">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
          <button
            onClick={handleChatProviderClick}
            disabled={
              isOwnService ||
              !hasSufficientReputation ||
              isCheckingReputation ||
              isCreatingChat
            }
            className="group relative flex w-1/3 items-center justify-center rounded-2xl bg-gray-100 px-5 py-3.5 font-bold text-gray-700 transition-all hover:bg-gray-200 hover:text-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {chatLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                <span className="hidden sm:inline">Creating...</span>
              </div>
            ) : (
              <span>Chat</span>
            )}
            {isOwnService && (
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                You cannot chat with your own service.
              </span>
            )}
          </button>

          <button
            onClick={handleBookNow}
            disabled={
              packages.length === 0 ||
              isOwnService ||
              !service.isActive ||
              !hasSufficientReputation ||
              isCheckingReputation
            }
            className="group relative flex w-2/3 items-center justify-center rounded-xl bg-yellow-400 px-4 py-3.5 font-bold text-gray-900 shadow-sm transition-all duration-200 hover:bg-yellow-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isCheckingReputation
              ? "Checking..."
              : service.isActive
                ? hasSufficientReputation
                  ? "Book Now"
                  : "Reputation Too Low"
                : "Service Unavailable"}
            {isOwnService && (
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                You cannot book your own service.
              </span>
            )}
            {reputationError && (
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 rounded bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 opacity-0 transition-opacity group-hover:opacity-100">
                {reputationError}
              </span>
            )}
          </button>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default ClientServiceDetailsPage;
