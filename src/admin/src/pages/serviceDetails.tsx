import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  useServiceImages,
  useServiceCertificates,
} from "../../../frontend/src/hooks/useMediaLoader";
import { ServiceDetailsHeader } from "../components";
import {
  Service,
  ServicePackage,
  serviceCanisterService,
} from "../../../frontend/src/services/serviceCanisterService";
import { adminServiceCanister } from "../services/adminServiceCanister";
import {
  HeroSection,
  ActiveBookingsWarning,
  LocationAvailabilitySection,
  PackagesSection,
  CertificationsSection,
  ImagesSection,
  ActionButtons,
  PreviewModal,
  DeleteConfirmDialog,
} from "../components/serviceDetails";

// Simple lockable wrapper: just blur + disable interactions when locked
const LockableSection: React.FC<{
  locked: boolean;
  lockReason?: string;
  children: React.ReactNode;
}> = ({ locked, children }) => {
  return (
    <div className={locked ? "pointer-events-none opacity-50 blur-[1px]" : ""}>
      {children}
    </div>
  );
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

  const [service, setService] = useState<Service | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [packagesLoading, setPackagesLoading] = useState(true);

  // State for image/certificate preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);

  // Helper to check if file is a PDF
  const isPdfFile = (url: string) => url?.toLowerCase().endsWith(".pdf");

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
    isLoading: isLoadingServiceImages,
  } = useServiceImages(service?.id, service?.imageUrls || []);

  // Load service certificates using the provider's useServiceCertificates hook
  const {
    certificates: serviceCertificates,
    isLoading: isLoadingCertificates,
  } = useServiceCertificates(service?.id, service?.certificateMedia || []);

  // Load service data and packages
  useEffect(() => {
    const loadServiceData = async () => {
      if (!serviceId || !userId) {
        setError("Missing service or user ID");
        setLoading(false);
        setPackagesLoading(false);
        return;
      }

      setLoading(true);
      setPackagesLoading(true);
      setError(null);

      try {
        const serviceData = await serviceCanisterService.getService(serviceId);
        if (serviceData) {
          // Ensure weeklySchedule has 'slots' array for existing data
          const processedServiceData = {
            ...serviceData,
            weeklySchedule: serviceData.weeklySchedule?.map((day: any) => ({
              ...day,
              availability: {
                ...day.availability,
                slots: day.availability.slots || [],
              },
            })),
          };
          setService(processedServiceData as Service);

          try {
            const servicePackages = await serviceCanisterService.getServicePackages(serviceId);
            setPackages(servicePackages || []);
          } catch (packageError) {
            console.error("Error loading packages:", packageError);
            setPackages([]);
          } finally {
            setPackagesLoading(false);
          }
          setError(null);
        } else {
          throw new Error("Service not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load service");
        setPackagesLoading(false);
      } finally {
        setLoading(false);
      }
    };

    loadServiceData();
  }, [serviceId, userId, retryCount]);

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

  const handleRetry = () => {
    if (serviceId) {
      setRetryCount((prev) => prev + 1);
    }
  };

  // Admin is read-only: no active bookings, no editing
  const hasActiveBookings = false;
  const activeBookingsCount = 0;
  const averageRating = service?.rating || 0;
  const reviewCount = service?.reviewCount || 0;

  // Dummy edit states (read-only mode)
  const editTitleCategory = false;
  const editLocationAvailability = false;
  const editImages = false;
  const editCertifications = false;
  const isAddingOrEditingPackage = false;

  // Show loading screen during initialization or data loading
  if (loading && !service) {
    return (
      <div className="min-h-screen bg-gray-50 md:pb-0">
        <header className="sticky top-0 z-20 flex w-full items-center justify-center border-b border-gray-200 bg-white py-4 shadow-sm">
          <div className="h-7 w-32 animate-pulse rounded bg-gray-200 lg:h-8"></div>
        </header>

        <main className="mx-auto max-w-full space-y-10 px-4 py-16 sm:px-8">
          {/* Hero Section Skeleton */}
          <div className="space-y-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Image carousel skeleton */}
            <div className="relative h-64 w-full overflow-hidden rounded-t-xl bg-gray-200">
              <div className="absolute inset-0 animate-pulse bg-gray-300"></div>
            </div>

            {/* Title and category skeleton */}
            <div className="space-y-3 pb-6">
              <div className="ml-8 h-8 w-3/4 animate-pulse rounded bg-gray-200"></div>
              <div className="ml-8 h-6 w-1/3 animate-pulse rounded bg-gray-200"></div>
            </div>
          </div>

          {/* Info Grid Skeleton */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Left Column */}
            <div className="flex flex-col gap-8">
              {/* Location & Availability Section Skeleton */}
              <div className="flex animate-pulse flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-lg shadow-sm">
                {/* Header Section (Title + Edit Button placeholder) */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  {/* Title Bone (Icon + Text) */}
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-200"></div>
                    <div className="h-6 w-48 rounded-md bg-gray-200 lg:h-7 lg:w-64"></div>
                  </div>
                  {/* Edit Button Bone */}
                  <div className="h-9 w-9 rounded-full bg-gray-200"></div>
                </div>

                {/* Content Body Skeleton (Mimics the viewing state) */}
                <div className="space-y-5">
                  {/* Address Section Skeleton */}
                  <div>
                    {/* Label Bone */}
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-4 w-4 rounded bg-gray-200"></div>
                      <div className="h-5 w-20 rounded bg-gray-200"></div>
                    </div>
                    {/* Address Data Box Bone */}
                    <div className="h-10 w-full rounded-lg border border-gray-200 bg-gray-200"></div>
                  </div>

                  {/* Availability Section Skeleton */}
                  <div>
                    {/* Label Bone */}
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-4 w-4 rounded bg-gray-200"></div>
                      <div className="h-5 w-24 rounded bg-gray-200"></div>
                    </div>

                    {/* Availability Cards Container Bone */}
                    <div className="flex flex-wrap justify-center gap-4 rounded-lg border border-blue-100 bg-gray-200 px-3 py-4">
                      {/* Generate 3 fake "Day Cards" to simulate schedule */}
                      {[...Array(3)].map((_, index) => (
                        <div
                          key={index}
                          className="flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                        >
                          {/* Day Name Badge Bone */}
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5 pt-0.5">
                            <div className="h-7 w-7 rounded-full bg-gray-200"></div>
                            <div className="h-5 w-24 rounded bg-gray-200"></div>
                          </div>

                          {/* Time Slots List Bones */}
                          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-2.5 lg:gap-2 pt-1">
                            {/* Slot 1 Bone */}
                            <React.Fragment>
                              {/* Mobile/Tablet */}
                              <div className="flex lg:hidden items-center gap-2.5">
                                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-200"></div>
                                <div className="h-4 w-32 rounded bg-gray-100"></div>
                              </div>
                              {/* Laptop/Desktop */}
                              <div className="hidden lg:block h-[30px] w-[130px] rounded-md bg-gray-100 border border-gray-200"></div>
                            </React.Fragment>

                            {/* Slot 2 Bone */}
                            <div className={index === 1 ? "hidden" : "contents"}>
                              {/* Mobile/Tablet */}
                              <div className="flex lg:hidden items-center gap-2.5">
                                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-200"></div>
                                <div className="h-4 w-28 rounded bg-gray-100"></div>
                              </div>
                              {/* Laptop/Desktop */}
                              <div className="hidden lg:block h-[30px] w-[110px] rounded-md bg-gray-100 border border-gray-200"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Packages Section Skeleton */}
              <div className="flex animate-pulse flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                {/* Header Section */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    {/* Icon Bone */}
                    <div className="h-6 w-6 rounded bg-gray-200"></div>
                    {/* Title Bone */}
                    <div className="h-6 w-48 rounded bg-gray-200 lg:h-7 lg:w-56"></div>
                  </div>
                  {/* Add Button Bone */}
                  <div className="h-9 w-32 rounded-md bg-gray-200"></div>
                </div>

                {/* Content Section */}
                <div className="space-y-4">
                  {/* Package Cards Grid */}
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* Generate 2 fake cards to fill the view */}
                    {[...Array(2)].map((_, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                      >
                        {/* Card Top: Title & Description */}
                        <div className="mb-4">
                          <div className="mb-3">
                            {/* Package Title Bone */}
                            <div className="mb-2 h-7 w-3/4 rounded bg-gray-200"></div>
                            {/* Description Bones (2 lines) */}
                            <div className="mb-1 h-4 w-full rounded bg-gray-200"></div>
                            <div className="h-4 w-2/3 rounded bg-gray-200"></div>
                          </div>

                          {/* Price Block Bones */}
                          <div className="mt-3 space-y-2">
                            {/* Main Price */}
                            <div className="h-7 w-24 rounded bg-gray-200"></div>
                            {/* Total Badge */}
                            <div className="h-6 w-28 rounded-full bg-gray-200"></div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="my-4 border-t border-gray-200"></div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-4 xl:flex-row">
                          {/* Edit Button Bone */}
                          <div className="h-10 w-full rounded-xl bg-gray-200"></div>
                          {/* Delete Button Bone */}
                          <div className="h-10 w-full rounded-xl bg-gray-200"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-8">
              {/* Certifications Section Skeleton */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-6 w-36 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-square animate-pulse rounded-lg bg-gray-200"
                    ></div>
                  ))}
                </div>
              </div>

              {/* Images Section Skeleton */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-6 w-32 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="aspect-square animate-pulse rounded-lg bg-gray-200"
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200"></div>
            <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200"></div>
          </div>
        </main>
      </div>
    );
  }

  // Show error screen only if we have an error and no service data
  if (error && !service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-xl font-semibold text-red-600">
            Unable to Load Service
          </h1>
          <p className="mb-6 text-gray-600">{error}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={handleBackClick}
              className="rounded-lg border border-yellow-500 bg-white px-6 py-2 font-semibold text-yellow-600 transition-colors hover:bg-yellow-50"
            >
              Back to Services
            </button>
            <button
              onClick={handleRetry}
              className="rounded-lg bg-yellow-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-yellow-600"
            >
              Try Again
            </button>
          </div>
          {retryCount > 0 && (
            <p className="mt-4 text-xs text-gray-500">
              Attempted {retryCount} {retryCount === 1 ? "retry" : "retries"}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Final fallback if no service data
  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-xl font-semibold text-red-600">
            Service Not Found
          </h1>
          <p className="mb-6 text-gray-600">
            The requested service could not be found or loaded.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={handleRetry}
              className="rounded-lg bg-yellow-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-yellow-600"
            >
              Try Loading Again
            </button>
            <button
              onClick={handleBackClick}
              className="rounded-lg border border-yellow-500 bg-white px-6 py-2 font-semibold text-yellow-600 transition-colors hover:bg-yellow-50"
            >
              Back to Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 md:pb-0">
      <PreviewModal
        previewUrl={previewUrl}
        previewType={previewType}
        onClose={() => setPreviewUrl(null)}
      />

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        serviceTitle={service?.title}
        isDeleting={isDeleting}
        isAlreadyArchived={service?.status === "Archived"}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteService}
      />

           <ServiceDetailsHeader onBackClick={handleBackClick} />

      {/* Main Content */}
      <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-full space-y-10 px-4 py-8 sm:px-8">
        <HeroSection
          onBack={handleBackClick}
          service={service}
          serviceImages={serviceImages}
          isLoadingServiceImages={isLoadingServiceImages}
          hasActiveBookings={hasActiveBookings}
          activeBookingsCount={activeBookingsCount}
          editTitleCategory={editTitleCategory}
          editedTitle=""
          editedCategory=""
          categories={[]}
          categoriesLoading={false}
          savingTitleCategory={false}
          averageRating={averageRating}
          reviewCount={reviewCount}
          setEditedTitle={() => {}}
          setEditedCategory={() => {}}
          onEdit={() => {}}
          onSave={() => {}}
          onCancel={() => {}}
        />

        {/* Active Bookings Warning (always hidden in admin) */}
        {hasActiveBookings && (
          <ActiveBookingsWarning activeBookingsCount={activeBookingsCount} />
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Location & Packages */}
          <div className="flex flex-col gap-8">
            <LockableSection locked={false}>
              <LocationAvailabilitySection
                editLocationAvailability={editLocationAvailability}
                hasActiveBookings={hasActiveBookings}
                activeBookingsCount={activeBookingsCount}
                editedCity={service.location?.city || ""}
                editedState={service.location?.state || ""}
                setEditedCity={() => {}}
                setEditedState={() => {}}
                editedWeeklySchedule={[]}
                setEditedWeeklySchedule={() => {}}
                savingLocationAvailability={false}
                onEdit={() => {}}
                onCancel={() => {}}
                onSave={() => {}}
                service={service}
              />
            </LockableSection>

            <LockableSection locked={false}>
              <PackagesSection
                packages={packages}
                isAddingOrEditingPackage={isAddingOrEditingPackage}
                activeBookingsCount={activeBookingsCount}
                hasActiveBookings={hasActiveBookings}
                packageFormTitle=""
                packageFormDescription=""
                packageFormPrice=""
                packageFormLoading={false}
                currentPackageId={null}
                isLoading={packagesLoading}
                onAddPackage={() => {}}
                onCancelPackageEdit={() => {}}
                onSavePackage={() => {}}
                onEditPackage={() => {}}
                onDeletePackage={() => {}}
                setPackageFormTitle={() => {}}
                setPackageFormDescription={() => {}}
                setPackageFormPrice={() => {}}
              />
            </LockableSection>
          </div>

          {/* Right: Certifications & Service Images */}
          <div className="flex flex-col gap-8 md:sticky md:top-16 md:self-start">
            <LockableSection locked={false}>
              <CertificationsSection
                hasActiveBookings={hasActiveBookings}
                activeBookingsCount={activeBookingsCount}
                editCertifications={editCertifications}
                tempDisplayCertificates={[]}
                serviceCertificates={serviceCertificates || []}
                certificateUploadError={null}
                uploadingCertificates={false}
                savingCertifications={false}
                onToggleEdit={() => {}}
                onCancel={() => {}}
                onSave={() => {}}
                onUpload={() => {}}
                onRemove={() => {}}
                onPreview={(url, type) => {
                  setPreviewUrl(url);
                  setPreviewType(type);
                }}
              />
            </LockableSection>

            <LockableSection locked={false}>
              <ImagesSection
                hasActiveBookings={hasActiveBookings}
                activeBookingsCount={activeBookingsCount}
                editImages={editImages}
                tempDisplayImages={[]}
                serviceImages={serviceImages || []}
                uploadError={null}
                uploadingImages={false}
                savingImages={false}
                onToggleEdit={() => {}}
                onCancel={() => {}}
                onSave={() => {}}
                onUpload={() => {}}
                onRemove={() => {}}
                onPreview={(url, type) => {
                  setPreviewUrl(url);
                  setPreviewType(type);
                }}
                isPdfFile={isPdfFile}
              />
            </LockableSection>
          </div>
        </div>

        <LockableSection locked={false}>
          <ActionButtons
            isDeleting={isDeleting}
            onDeleteClick={() => setShowDeleteConfirm(true)}
          />
        </LockableSection>
      </main>
    </div>
  );
};

export default ServiceDetailsPage;
