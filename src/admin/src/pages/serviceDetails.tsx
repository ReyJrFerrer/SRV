import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  useServiceImages,
  useServiceCertificates,
} from "../../../frontend/src/hooks/useMediaLoader";
import { PhotoIcon, AcademicCapIcon } from "@heroicons/react/24/solid";
import {
  adminServiceCanister,
  ServiceData,
} from "../services/adminServiceCanister";
import { serviceCanisterService } from "../../../frontend/src/services/serviceCanisterService";
import {
  ServiceDetailsHeader,
  ServiceHeroCard,
  LocationAvailability,
  ServicePackages,
  MediaGallery,
  ServiceDetailsModals,
} from "../components";

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
  const location = useLocation();
  const navigate = useNavigate();
  const [service, setService] = useState<ServiceData | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // State for image/certificate preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | null>(null);

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

  // Load service images using the useServiceImages hook
  const {
    images: serviceImages,
    isLoading: isLoadingImages,
    error: imageError,
  } = useServiceImages(service?.id, service?.imageUrls || []);

  // Debug logging for images
  useEffect(() => {
    // Service images loaded
  }, [serviceImages, imageError, isLoadingImages]);

  // Load service certificates using the provider's useServiceCertificates hook
  const {
    certificates: serviceCertificates,
    isLoading: isLoadingCertificates,
  } = useServiceCertificates(service?.id, service?.certificateUrls || []);

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

        // Use provider's serviceCanisterService.getService directly
        const serviceData = await serviceCanisterService.getService(serviceId);

        if (serviceData) {
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
            packages: [],
          };
          setService(mappedService);

          // Load service packages using provider's getServicePackages
          try {
            const servicePackages =
              await serviceCanisterService.getServicePackages(serviceId);
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
      await adminServiceCanister.deleteService(serviceId);
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
      <ServiceDetailsHeader onBackClick={handleBackClick} />

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] space-y-10 px-4 py-8 sm:px-8">
        {/* Hero Card */}
        <ServiceHeroCard
          service={service}
          heroImageUrl={
            serviceImages && serviceImages.length > 0
              ? serviceImages[0]?.dataUrl || null
              : null
          }
          isLoadingImages={isLoadingImages}
        />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left Column */}
          <div className="flex flex-col gap-8">
            <LocationAvailability
              location={service.location}
              weeklySchedule={service.weeklySchedule}
              formatTime={formatTime}
            />

            <ServicePackages packages={packages} />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-8">
            <MediaGallery
              title="Certifications"
              icon={<AcademicCapIcon className="h-6 w-6 text-blue-400" />}
              items={serviceCertificates || []}
              isLoading={isLoadingCertificates}
              emptyIcon={<AcademicCapIcon className="mx-auto mb-2 h-8 w-8" />}
              emptyMessage="No certificates available"
              onItemClick={(url, type) => {
                setPreviewUrl(url);
                setPreviewType(type);
              }}
            />

            <MediaGallery
              title="Service Images"
              icon={<PhotoIcon className="h-6 w-6 text-blue-400" />}
              items={serviceImages || []}
              isLoading={isLoadingImages}
              emptyMessage="No images available"
              onItemClick={(url, type) => {
                setPreviewUrl(url);
                setPreviewType(type);
              }}
            />
          </div>
        </div>

        {/* Action Buttons and Modals */}
        <ServiceDetailsModals
          showDeleteConfirm={showDeleteConfirm}
          isDeleting={isDeleting}
          serviceTitle={service.title}
          previewUrl={previewUrl}
          previewType={previewType}
          onDeleteConfirm={handleDeleteService}
          onDeleteCancel={() => setShowDeleteConfirm(false)}
          onPreviewClose={() => setPreviewUrl(null)}
          onDeleteClick={() => setShowDeleteConfirm(true)}
        />
        <div className="h-8" />
      </main>
    </div>
  );
};

export default ServiceDetailsPage;
