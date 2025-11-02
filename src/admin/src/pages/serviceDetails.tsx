import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Dialog } from "@headlessui/react";
import {
  useServiceImages,
  useServiceCertificates,
} from "../../../frontend/src/hooks/useMediaLoader";
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  PhotoIcon,
  AcademicCapIcon,
  MapPinIcon,
  CalendarDaysIcon,
  TagIcon,
  TrashIcon,
  XMarkIcon,
  HomeIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import { CameraIcon } from "@heroicons/react/24/outline";
import {
  adminServiceCanister,
  ServiceData,
} from "../services/adminServiceCanister";
import { serviceCanisterService } from "../../../frontend/src/services/serviceCanisterService";

// Helper to format time (e.g., "09:00" -> "9:00 AM")
const formatTime = (time: string) => {
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.padStart(2, "0")} ${ampm}`;
};

const ServiceDetailsPage: React.FC = () => {
  const params = useParams<{
    serviceId?: string;
    userId?: string;
    id?: string; // Support both :id and :serviceId
  }>();
  const serviceId = params.serviceId || params.id;
  const userId = params.userId;
  const navigate = useNavigate();
  const location = useLocation();
  const [service, setService] = useState<ServiceData | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // State for image/certificate preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);

  // Handle back button behavior based on where user came from
  const handleBackClick = () => {
    const from = location.state?.from;
    const urlParams = new URLSearchParams(location.search);
    const fromParam = urlParams.get("from");

    if (from === "validation-inbox" || fromParam === "validation-inbox") {
      navigate("/validation-inbox", { replace: true });
    } else {
      navigate(`/user/${userId}/services`);
    }
  };

  // Helper to check if file is a PDF
  const isPdfFile = (url: string) => url?.toLowerCase().endsWith(".pdf");

  // Load service images using the useServiceImages hook
  const {
    images: serviceImages,
    isLoading: isLoadingImages,
    error: imageError,
  } = useServiceImages(service?.id, service?.imageUrls || []);

  // Debug logging for images
  useEffect(() => {
    if (serviceImages) {
      console.log("Service images loaded:", serviceImages);
      console.log("Image loading error:", imageError);
      console.log("Is loading images:", isLoadingImages);
    }
  }, [serviceImages, imageError, isLoadingImages]);

  // Load service certificates using the provider's useServiceCertificates hook
  const {
    certificates: serviceCertificates,
    isLoading: isLoadingCertificates,
    error: certificateError,
  } = useServiceCertificates(service?.id, service?.certificateUrls || []);

  // Debug logging for certificates
  useEffect(() => {
    if (serviceCertificates) {
      console.log("Service certificates loaded:", serviceCertificates);
      console.log("Certificate loading error:", certificateError);
      console.log("Is loading certificates:", isLoadingCertificates);
    }
  }, [serviceCertificates, certificateError, isLoadingCertificates]);

  useEffect(() => {
    const loadServiceData = async () => {
      if (!serviceId || !userId) {
        setError("Missing service or user ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(
          "Loading service data for serviceId:",
          serviceId,
          "userId:",
          userId,
        );

        // Use provider's serviceCanisterService.getService directly - same as provider
        const serviceData = await serviceCanisterService.getService(serviceId);

        if (serviceData) {
          console.log("Service data retrieved:", serviceData);
          console.log("Service imageUrls:", serviceData.imageUrls);
          console.log("Service certificateUrls:", serviceData.certificateUrls);
          console.log("Service location:", serviceData.location);
          console.log(
            "Service location.address:",
            serviceData.location?.address,
          );
          console.log("Service location.city:", serviceData.location?.city);
          console.log("Service location.state:", serviceData.location?.state);
          console.log(
            "Service location.country:",
            serviceData.location?.country,
          );
          console.log(
            "Service imageUrls length:",
            serviceData.imageUrls?.length,
          );
          console.log(
            "Service certificateUrls length:",
            serviceData.certificateUrls?.length,
          );

          // Map provider's Service to admin's ServiceData format
          const mappedService: ServiceData = {
            id: serviceData.id,
            title: serviceData.title,
            description: serviceData.description,
            category: serviceData.category?.name || "General",
            status: serviceData.status || "Available",
            type: "offered",
            price: serviceData.price || 0,
            currency: "PHP",
            duration: undefined,
            location: serviceData.location || {
              address: "Not specified",
              city: "Not specified",
              state: "",
              country: "",
              postalCode: "",
              latitude: 0,
              longitude: 0,
            },
            scheduledDate: undefined,
            completedDate: undefined,
            createdDate: new Date(),
            clientId: undefined,
            clientName: undefined,
            providerId: serviceData.providerId?.toString(),
            providerName: serviceData.providerName || "Unknown Provider",
            rating: serviceData.rating,
            reviewCount: serviceData.reviewCount,
            imageUrls: serviceData.imageUrls || [],
            certificateUrls: serviceData.certificateUrls || [],
            weeklySchedule:
              serviceData.weeklySchedule?.map((schedule) => ({
                dayOfWeek:
                  schedule.day === "Monday"
                    ? 0
                    : schedule.day === "Tuesday"
                      ? 1
                      : schedule.day === "Wednesday"
                        ? 2
                        : schedule.day === "Thursday"
                          ? 3
                          : schedule.day === "Friday"
                            ? 4
                            : schedule.day === "Saturday"
                              ? 5
                              : 6,
                availability: {
                  isAvailable: schedule.availability.isAvailable,
                  slots: schedule.availability.slots || [],
                },
              })) || [],
            packages: [], // Will be loaded separately
          };
          setService(mappedService);

          // Load service packages using provider's getServicePackages
          try {
            const servicePackages =
              await serviceCanisterService.getServicePackages(serviceId);
            console.log("Service packages loaded:", servicePackages);
            setPackages(servicePackages || []);
          } catch (packageError) {
            console.error("Error loading packages:", packageError);
            setPackages([]);
          }
        } else {
          console.error("Service not found");
          setError("Service not found");
          setLoading(false);
          return;
        }

      } catch (err) {
        console.error("Error loading service data:", err);
        setError("Failed to load service data");
      } finally {
        setLoading(false);
      }
    };

    loadServiceData();
  }, [serviceId, userId]);

  const handleDeleteService = async () => {
    if (!service || !serviceId) return;

    try {
      setIsDeleting(true);

      // Call the admin service to delete the service
      await adminServiceCanister.deleteService(serviceId);

      // Navigate back based on where user came from
      handleBackClick();
    } catch (err) {
      console.error("Error deleting service:", err);
      setError("Failed to delete service");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        <p className="mt-4 text-gray-700">Loading service details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-xl font-semibold text-red-600">
            Unable to Load Service
          </h1>
          <p className="mb-6 text-gray-600">{error}</p>
          <button
            onClick={handleBackClick}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-xl font-semibold text-red-600">
            Service Not Found
          </h1>
          <p className="mb-6 text-gray-600">
            The service you're looking for doesn't exist.
          </p>
          <button
            onClick={handleBackClick}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative flex w-full items-center px-4 py-3">
          <button
            onClick={handleBackClick}
            className="rounded-full p-2 transition-colors hover:bg-blue-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold tracking-tight text-black">
            Service Details
          </h1>
        </div>
      </header>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-red-700">
              Delete Service?
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              Are you sure you want to delete{" "}
              <b>{service?.title || "this service"}</b>? This action cannot be
              undone.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={handleDeleteService}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] space-y-10 px-4 py-8 sm:px-8">
        {/* Hero Card */}
        <section className="relative mt-8 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-100 via-white to-gray-50 shadow-xl">
          {/* Hero Image */}
          <div className="relative flex h-56 w-full items-center justify-center bg-gradient-to-r from-blue-200 via-blue-100 to-white">
            {serviceImages &&
            serviceImages.length > 0 &&
            serviceImages[0]?.dataUrl ? (
              <img
                src={serviceImages[0].dataUrl}
                alt="Service Hero"
                className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-blue-200 via-blue-100 to-white">
                <CameraIcon className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent"></div>
          </div>
          {/* Card Content */}
          <div className="relative z-10 flex flex-col gap-6 px-8 py-8 md:flex-row md:items-center md:gap-10 md:py-10">
            {/* Service Info */}
            <div className="min-w-0 flex-1">
              {/* Mobile: Green dot next to name */}
              <div className="mb-2 block md:hidden">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <h2
                      className="flex-1 break-words text-xl font-bold text-blue-900 drop-shadow-sm"
                      title={service.title}
                      style={{ wordBreak: "break-word" }}
                    >
                      {service.title}
                    </h2>
                    {/* Green dot for availability */}
                    {service.status === "Available" && (
                      <span
                        className="inline-block h-3 w-3 rounded-full bg-green-500"
                        title="Available"
                      ></span>
                    )}
                  </div>
                </div>
              </div>
              {/* Desktop: Name, availability note */}
              <div className="mb-2 hidden items-center gap-2 md:flex">
                <h2
                  className="truncate text-3xl font-extrabold text-blue-900 drop-shadow-sm"
                  title={service.title}
                >
                  {service.title}
                </h2>
                {/* Availability note */}
                <span
                  className={`ml-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    service.status === "Available"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                  title={
                    service.status === "Available"
                      ? "Service is available"
                      : "Service is unavailable"
                  }
                >
                  {service.status === "Available" ? "Available" : "Unavailable"}
                </span>
              </div>
              {/* Category */}
              <div className="mt-2 flex items-center gap-2 text-lg font-medium text-blue-700">
                <TagIcon className="h-5 w-5 text-blue-400" />
                {service.category}
              </div>
            </div>
            {/* Rating on Right Side */}
            <div className="flex min-w-[180px] flex-col items-center justify-center gap-2">
              <div
                onClick={() => navigate(`/service/${service.id}/reviews`)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md mt-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <StarIcon className="h-5 w-5 fill-current text-yellow-400" />
                      <span className="font-semibold text-gray-800">
                        {(service.rating || 0).toFixed(1)}
                      </span>
                      <span className="text-gray-600">
                        ({service.reviewCount || 0} reviews)
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      View All Ratings and Reviews
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left Column */}
          <div className="flex flex-col gap-8">
            {/* Location & Availability */}
            <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
                  <MapPinIcon className="h-6 w-6 text-blue-400" />
                  Location & Availability
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-l mb-1 flex items-center gap-2 font-medium text-blue-700">
                    <HomeIcon className="h-4 w-4 text-blue-400" />
                    Address
                  </label>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-normal text-blue-900">
                    {service.location?.city || "Not specified"}
                    {service.location?.state && `, ${service.location.state}`}
                  </div>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs font-medium text-blue-700">
                    <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
                    Availability
                  </label>
                  <div className="flex flex-wrap justify-center gap-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-4 text-sm font-medium text-blue-900">
                    {service.weeklySchedule?.filter((day) => {
                      const availability = day.availability || {
                        isAvailable: false,
                        slots: [],
                      };
                      return availability.isAvailable;
                    }).length ? (
                      service.weeklySchedule
                        .filter((day) => {
                          const availability = day.availability || {
                            isAvailable: false,
                            slots: [],
                          };
                          return availability.isAvailable;
                        })
                        .map((day, index) => {
                          const availability = day.availability || {
                            isAvailable: false,
                            slots: [],
                          };
                          const dayNames = [
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ];
                          const dayName =
                            dayNames[day.dayOfWeek] || `Day ${day.dayOfWeek}`;

                          return (
                            <div
                              key={index}
                              className="flex min-w-[140px] flex-col items-start rounded-xl border border-blue-100 bg-white/80 p-3 shadow"
                            >
                              <span className="mb-2 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-blue-800 shadow-sm">
                                <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
                                {dayName}
                              </span>
                              {availability.slots &&
                              availability.slots.length > 0 ? (
                                <ul className="ml-1 space-y-1">
                                  {availability.slots.map(
                                    (slot: any, idx: number) => (
                                      <li
                                        key={idx}
                                        className="flex items-center gap-2 text-xs text-blue-900"
                                      >
                                        <span className="inline-block rounded bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                                          {formatTime(slot.startTime)} -{" "}
                                          {formatTime(slot.endTime)}
                                        </span>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              ) : (
                                <span className="text-xs text-blue-400">
                                  No slots
                                </span>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      <span className="text-blue-400">Not specified</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Service Packages */}
            <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
                  <BriefcaseIcon className="h-6 w-6 text-blue-400" />
                  Service Packages ({packages.length})
                </h3>
              </div>
              {packages.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="group rounded-2xl border border-gray-300 bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-xl"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-2 line-clamp-2 text-xl font-bold text-gray-900">
                            {pkg.title}
                          </h3>
                          <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">
                            {pkg.description}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0 text-right">
                          <div className="mb-1 text-xl font-bold text-blue-600">
                            ₱{pkg.price.toFixed(2)}
                          </div>
                          <div className="mb-1 text-xs text-gray-500">
                            + ₱{(pkg.commissionFee || 0).toFixed(2)} commission
                          </div>
                          <div className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-sm font-semibold text-green-700">
                            ₱{((pkg.price || 0) + (pkg.commissionFee || 0)).toFixed(2)} total
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-blue-300">
                  <BriefcaseIcon className="mx-auto mb-4 h-12 w-12" />
                  <p>No packages available</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-8">
            {/* Certifications */}
            <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
                  <AcademicCapIcon className="h-6 w-6 text-blue-400" />
                  Certifications
                </h3>
              </div>
              {serviceCertificates && serviceCertificates.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {serviceCertificates.map(
                    (certificate: any, index: number) => {
                      const url = certificate.dataUrl || certificate.url;
                      if (!url) return null;

                      return (
                        <button
                          key={index}
                          className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-blue-100 bg-blue-50 shadow-sm focus:outline-none"
                          onClick={() => {
                            setPreviewUrl(url);
                            setPreviewType(isPdfFile(url) ? "pdf" : "image");
                          }}
                          type="button"
                          tabIndex={0}
                          aria-label="Inspect certificate"
                        >
                          {certificate.error ? (
                            <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
                              <AcademicCapIcon className="mx-auto h-8 w-8 text-blue-200" />
                              <p className="mt-1">Failed to load</p>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Certificate ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onLoad={(e) => {
                                console.log(
                                  "Certificate loaded successfully:",
                                  url,
                                );
                                console.log(
                                  "Certificate natural dimensions:",
                                  e.currentTarget.naturalWidth,
                                  "x",
                                  e.currentTarget.naturalHeight,
                                );
                              }}
                              onError={(e) => {
                                console.log(
                                  "Certificate failed to load:",
                                  url,
                                  certificate.error,
                                );
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-blue-300">
                  <AcademicCapIcon className="mx-auto mb-2 h-8 w-8" />
                  <p>No certificates available</p>
                </div>
              )}
            </section>

            {/* Service Images */}
            <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
                  <PhotoIcon className="h-6 w-6 text-blue-400" />
                  Service Images
                </h3>
              </div>
              {isLoadingImages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center text-blue-300">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-300 border-t-blue-600"></div>
                    <p>Loading images...</p>
                  </div>
                </div>
              ) : serviceImages && serviceImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {serviceImages.map((image: any, index: number) => {
                    const url = image.dataUrl || image.url;
                    if (!url) return null;

                    return (
                      <button
                        key={index}
                        className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-blue-100 bg-blue-50 shadow-sm focus:outline-none"
                        onClick={() => {
                          setPreviewUrl(url);
                          setPreviewType(isPdfFile(url) ? "pdf" : "image");
                        }}
                        type="button"
                        tabIndex={0}
                        aria-label="Inspect image"
                      >
                        {image.error ? (
                          <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
                            <PhotoIcon className="mx-auto h-8 w-8 text-blue-200" />
                            <p className="mt-1">Failed to load</p>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Service image ${index + 1}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onLoad={(e) => {
                              console.log(
                                "Service image loaded successfully:",
                                url,
                              );
                              console.log(
                                "Image natural dimensions:",
                                e.currentTarget.naturalWidth,
                                "x",
                                e.currentTarget.naturalHeight,
                              );
                            }}
                            onError={(e) => {
                              console.log(
                                "Service image failed to load:",
                                url,
                                image.error,
                              );
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center text-blue-300">
                    <CameraIcon className="mx-auto mb-4 h-12 w-12" />
                    <p>No images available</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-600 bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-red-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-60"
          >
            <TrashIcon className="h-6 w-6" />
            {isDeleting ? "Deleting..." : "Delete Service"}
          </button>
        </div>
        {/* Add space below the buttons */}
        <div className="h-8" />
      </main>

      {/* Image/PDF Preview Modal */}
      <Dialog
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        <div
          className="fixed inset-0 bg-black/60"
          aria-hidden="true"
          onClick={() => setPreviewUrl(null)}
        />
        <div className="relative z-10 flex flex-col items-center justify-center">
          <button
            className="absolute right-2 top-2 z-20 rounded-full bg-white/80 p-2 text-gray-700 hover:bg-white"
            onClick={() => setPreviewUrl(null)}
            aria-label="Close preview"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="flex max-h-[90vh] max-w-[90vw] flex-col items-center rounded-lg bg-white p-4 shadow-2xl">
            {previewUrl && previewType === "image" && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[70vh] max-w-[80vw] rounded-lg object-contain"
              />
            )}
            {previewUrl && previewType === "pdf" && (
              <iframe
                src={previewUrl}
                title="PDF Preview"
                className="h-[70vh] w-[80vw] rounded-lg border"
              />
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ServiceDetailsPage;
