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

    setChatErrorMessage(null);

    try {
      const currentUserId = identity.getPrincipal().toString();

      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === service.providerId) ||
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === service.providerId),
      );

      // Prepare a lightweight service preview to show in chat
      const resolveHeroImage = (): string | undefined => {
        const firstImage = heroImages?.[0]?.dataUrl;
        const isValidUrl = (url?: string | null): url is string =>
          !!url && (url.startsWith("data:") || url.startsWith("http") || url.startsWith("/")) && url.length > 20;
        if (isValidUrl(firstImage)) return firstImage;
        if (service?.category?.slug) return `/images/ai-sp/${service.category.slug}.svg`;
        return "/default-provider.svg";
      };
      const preview = {
        id: service.id,
        name: service.name,
        imageUrl: resolveHeroImage(),
        price: Array.isArray(packages) && packages.length > 0
          ? Math.min(
              ...packages
                .map((p: any) => (typeof p?.price === "number" ? p.price : Number(p?.price)))
                .filter((n: number) => !isNaN(n)),
            )
          : undefined,
      } as { id: string; name: string; imageUrl?: string; price?: number };
      // Fetch provider bookings count for this specific service (best-effort)
      try {
        const providerBookings = await bookingCanisterService.getProviderBookings(
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
      } else {
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
      }
    } catch (error) {
      setChatErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not start conversation. Please try again.",
      );
    }
  };

  if (serviceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
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
          className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
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
  type TimeSlotObject = {
    day?: string;
    start?: string;
    end?: string;
  };

  if (service.availability) {
    const { schedule, timeSlots, isAvailableNow } = service.availability;
    let availableDays: string[] = [];
    if (Array.isArray(schedule) && schedule.length > 0) {
      availableDays = schedule
        .map((s: any) => {
          if (typeof s === "string") return s;
          if (typeof s === "object" && s.day) return s.day;
          return undefined;
        })
        .filter((d): d is string => typeof d === "string");
    }
    let timeSlotsByDay: Record<string, string[]> = {};
    availableDays.forEach((day) => {
      timeSlotsByDay[day] = [];
    });
    if (Array.isArray(timeSlots) && timeSlots.length > 0) {
      timeSlots.forEach((slot: string | TimeSlotObject) => {
        if (typeof slot === "string") {
          let formattedSlot = slot;
          if (!slot.includes("AM") && !slot.includes("PM")) {
            const match = slot.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
            if (match) {
              const [, startHour, startMin, endHour, endMin] = match;
              const startTime = `${startHour.padStart(2, "0")}:${startMin}`;
              const endTime = `${endHour.padStart(2, "0")}:${endMin}`;
              formattedSlot = `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
            }
          }
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
      });
    }

    mappedAvailability = {
      isAvailableNow,
      availableDays,
      timeSlotsByDay,
    };
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 md:pb-20">
      <div className="relative h-60 w-full">
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
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/default-provider.svg";
          }}
        />
      </div>

      <main className="relative z-10 -mt-24 p-4">
        {chatErrorMessage && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            <span className="block sm:inline">{chatErrorMessage}</span>
            <button
              onClick={() => setChatErrorMessage(null)}
              className="float-right ml-4 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}
        <div className="mx-auto mt-6 w-full max-w-5xl">
          <div className="rounded-3xl border border-blue-100 bg-white/70 p-6 shadow-2xl backdrop-blur-md">
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
              <div className="flex flex-col justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div
                      className="overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-200 via-white to-blue-100 shadow-xl"
                      style={{
                        width: "96px",
                        height: "96px",
                        minWidth: "96px",
                        minHeight: "96px",
                        maxWidth: "104px",
                        maxHeight: "104px",
                      }}
                    >
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
                        style={{ borderRadius: "50%" }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/default-provider.svg";
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center">
                      <h2 className="m-0 p-0 text-2xl font-extrabold leading-tight text-gray-900 drop-shadow-sm">
                        {providerName}
                      </h2>
                      {service.isActive && (
                        <span className="ml-2 inline-block h-4 w-4 rounded-full border-2 border-white bg-green-500 shadow"></span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex w-full flex-col items-center gap-0">
                    <ReputationScore reputation={providerRep} />
                    {isVerified === true && (
                      <span className="mt-1 flex items-center rounded-lg bg-blue-50 px-3 py-1 text-sm text-blue-600">
                        <CheckBadgeIcon className="mr-2 h-5 w-5" />
                        <span>This service provider is verified.</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-200 lg:hidden"></div>

              <div className="mt-4 flex flex-col justify-center lg:mt-0 lg:border-l lg:border-blue-200 lg:pl-8">
                <h1 className="mb-2 text-center text-xl font-extrabold text-gray-900 drop-shadow-sm lg:text-left lg:text-3xl">
                  {name}
                </h1>
                <p className="mb-2 flex items-center gap-2 text-lg font-semibold text-yellow-700">
                  {category?.slug ? (
                    <img
                      src={`/images/categories/${category.slug}.svg`}
                      alt={category.name || "Category"}
                      className="h-6 w-6 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "/images/categories/others.svg";
                      }}
                    />
                  ) : null}
                  {category?.name ?? "General"}
                </p>
                <div className="mb-2 flex items-center text-base text-gray-600">
                  <MapPinIcon className="mr-2 h-6 w-6 text-blue-700" />
                  <span>{location?.address || "Baguio City"}</span>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-base text-gray-600">
                  <span className="flex items-center">
                    <StarIcon className="mr-1 h-6 w-6 text-yellow-300" />
                    <span className="text-lg font-bold">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="ml-1">({reviewCount} reviews)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-white p-4 shadow-2xl backdrop-blur-md">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Squares2X2Icon className="h-6 w-6 text-blue-400" /> Packages
            Offered
          </h3>
          {loadingPackages ? (
            <div className="p-4 text-center text-gray-500">
              Loading packages...
            </div>
          ) : packages.length > 0 ? (
            <div className="flex flex-col gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="md:flow-center group relative flex flex-col items-stretch overflow-hidden rounded-2xl border border-yellow-300 bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-5 shadow-md md:flex-row"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <h4 className="truncate text-lg font-bold text-gray-900">
                        {pkg.title}
                      </h4>
                      <p className="mt-1 break-words text-sm text-gray-600 md:line-clamp-2">
                        {pkg.description}
                      </p>
                    </div>
                  </div>
                  <div className="ml-0 mt-4 flex min-w-[120px] flex-col items-end justify-between md:ml-6 md:mt-0">
                    <span className="rounded-lg border border-blue-200 bg-blue-100 px-4 py-2 text-xl font-extrabold text-blue-700 shadow-sm">
                      ₱
                      {Number(pkg.price + pkg.commissionFee).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </span>
                  </div>
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-bl-2xl bg-yellow-300"></span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No packages available for this service.
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
      </main>

      <div className="shadow-t-lg bottom-15 fixed left-0 z-40 flex w-full flex-row items-center gap-x-3 border-t border-gray-200 bg-white p-3 md:bottom-0 md:left-20 md:w-[calc(100%-5rem)]">
        <div className="mx-auto flex w-full items-center justify-between gap-3">
          <button
            onClick={handleChatProviderClick}
            disabled={
              isOwnService || !hasSufficientReputation || isCheckingReputation
            }
            className="group relative flex flex-shrink items-center justify-center rounded-lg bg-gray-100 px-4 py-3 font-bold text-gray-700 shadow-sm transition-colors hover:bg-blue-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200"
            style={{ minWidth: 0, flexBasis: "32%" }}
          >
            {chatLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-400"></div>
                <span className="text-base font-semibold">Creating Chat</span>
              </>
            ) : (
              <span className="text-sm font-semibold md:text-lg lg:text-xl">
                Chat
              </span>
            )}
            {isOwnService && (
              <span className="pointer-events-none absolute left-1/2 top-0 z-50 w-max -translate-x-1/2 -translate-y-full rounded bg-gray-800 px-3 py-2 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                You cannot chat with your own service.
              </span>
            )}
          </button>
          <div
            className="group relative flex flex-grow justify-end"
            style={{ flexBasis: "68%" }}
          >
            <button
              onClick={handleBookNow}
              disabled={
                packages.length === 0 ||
                isOwnService ||
                !service.isActive ||
                !hasSufficientReputation ||
                isCheckingReputation
              }
              className="group relative w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-6 py-3 text-sm font-extrabold text-white shadow-lg ring-2 ring-blue-200 transition-all duration-200 hover:from-yellow-400 hover:to-yellow-300 hover:text-blue-900 hover:ring-yellow-200 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-400 md:text-lg lg:text-xl"
            >
              {isCheckingReputation
                ? "Checking..."
                : service.isActive
                  ? hasSufficientReputation
                    ? "Book Now"
                    : "Reputation Too Low"
                  : "Service Unavailable"}
              {isOwnService && (
                <span className="pointer-events-none absolute left-1/2 top-0 z-50 w-max -translate-x-1/2 -translate-y-full rounded bg-gray-800 px-3 py-2 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  You cannot book your own service.
                </span>
              )}
              {reputationError && (
                <span className="pointer-events-none absolute left-1/2 top-0 z-50 w-max -translate-x-1/2 -translate-y-full rounded bg-red-100 px-3 py-2 text-xs font-semibold text-red-800 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {reputationError}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default ClientServiceDetailsPage;
