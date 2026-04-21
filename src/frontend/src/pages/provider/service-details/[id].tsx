import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  useServiceManagement,
  EnhancedService,
} from "../../../hooks/serviceManagement";
import {
  useServiceImages,
  useServiceImageUpload,
  useServiceCertificates,
  useServiceCertificateUpload,
} from "../../../hooks/useMediaLoader";
import {
  ServicePackage,
  Location,
  ServiceCategory,
  serviceCanisterService,
} from "../../../services/serviceCanisterService";
import { mediaService } from "../../../services/mediaService";
import { useServiceReviews } from "../../../hooks/reviewManagement";
import useProviderBookingManagement from "../../../hooks/useProviderBookingManagement";
import { Toaster, toast } from "sonner";
import { validateTimeSlots } from "../../../components/provider/service-details";
import ActiveBookingsWarning from "../../../components/provider/service-details/ActiveBookingsWarning";
import PreviewModal from "../../../components/provider/service-details/PreviewModal";
import DeleteConfirmDialog from "../../../components/provider/service-details/DeleteConfirmDialog";
import DeletePackageConfirmDialog from "../../../components/provider/service-details/DeletePackageConfirmDialog";
import PackagesSection from "../../../components/provider/service-details/PackagesSection";
import CertificationsSection from "../../../components/provider/service-details/CertificationsSection";
import ImagesSection from "../../../components/provider/service-details/ImagesSection";
import HeroSection from "../../../components/provider/service-details/HeroSection";
import LocationAvailabilitySection from "../../../components/provider/service-details/LocationAvailabilitySection";
import ActionButtons from "../../../components/provider/service-details/ActionButtons";
import BottomNavigation from "../../../components/provider/NavigationBar";
import useNoBackNavigation from "../../../hooks/useNoBackNavigation";

// WeeklyScheduleEntry now provided by AvailabilityEditor types
type WeeklyScheduleEntry =
  import("../../../components/provider/service-details").WeeklyScheduleEntry;

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

const ProviderServiceDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // When viewing a service's details, avoid going back into the add/edit wizard with browser back.
  useNoBackNavigation("/provider/services");

  // State for image/certificate preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);

  // Helper to check if file is a PDF
  const isPdfFile = (url: string) => url?.toLowerCase().endsWith(".pdf");

  const {
    getService,
    archiveService,
    permanentDeleteService,
    updateServiceStatus,
    updateService,
    getServicePackages,
    createPackage,
    updatePackage,
    deletePackage,
    error: hookError,
  } = useServiceManagement();

  const { bookings: providerBookings } = useProviderBookingManagement();

  const [service, setService] = useState<EnhancedService | null>(null);

  const { reviews, getAverageRating } = useServiceReviews(
    service?.id as string,
  );

  // Load service images using the useServiceImages hook
  const { images: serviceImages, isLoading: isLoadingServiceImages } =
    useServiceImages(service?.id, service?.imageUrls || []);

  // Image upload hook
  const { uploadImages, removeImage } = useServiceImageUpload(service?.id);

  // Load service certificates using the useServiceCertificates hook
  const { certificates: serviceCertificates } = useServiceCertificates(
    service?.id,
    service?.certificateUrls || [],
  );

  // Certificate upload hook
  const { uploadCertificates, removeCertificate } = useServiceCertificateUpload(
    service?.id,
  );
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for delete confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletePackageConfirm, setShowDeletePackageConfirm] =
    useState(false);
  const [packageToDelete, setPackageToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeletingPackage, setIsDeletingPackage] = useState(false);

  // --- State for Edit Modes ---
  const [editTitleCategory, setEditTitleCategory] = useState(false);
  const [editLocationAvailability, setEditLocationAvailability] =
    useState(false);
  const [editImages, setEditImages] = useState(false); // New state for images
  const [editCertifications, setEditCertifications] = useState(false); // New state for certifications

  // Image upload states
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Certificate upload states
  const [uploadingCertificates, setUploadingCertificates] = useState(false);
  const [certificateUploadError, setCertificateUploadError] = useState<
    string | null
  >(null);

  // Section loading states
  const [savingTitleCategory, setSavingTitleCategory] = useState(false);
  const [savingLocationAvailability, setSavingLocationAvailability] =
    useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [savingCertifications, setSavingCertifications] = useState(false);

  // Temporary display state for immediate UI feedback
  const [tempDisplayImages, setTempDisplayImages] = useState<
    Array<{
      url: string;
      dataUrl: string | null;
      error: string | null;
      isNew?: boolean;
    }>
  >([]);

  // Temporary display state for certificates
  const [tempDisplayCertificates, setTempDisplayCertificates] = useState<
    Array<{
      url: string;
      dataUrl: string | null;
      error: string | null;
      isNew?: boolean;
      fileName?: string;
    }>
  >([]);

  // Batch operations state for persistence
  const [pendingUploads, setPendingUploads] = useState<File[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState<number[]>([]);

  // Certificate batch operations state
  const [pendingCertificateUploads, setPendingCertificateUploads] = useState<
    File[]
  >([]);
  const [pendingCertificateRemovals, setPendingCertificateRemovals] = useState<
    number[]
  >([]);

  // --- State for Package Form (Inline) ---
  const [isAddingOrEditingPackage, setIsAddingOrEditingPackage] =
    useState(false);
  const [currentPackageId, setCurrentPackageId] = useState<string | null>(null);
  const [packageFormTitle, setPackageFormTitle] = useState("");
  const [packageFormDescription, setPackageFormDescription] = useState("");
  const [packageFormPrice, setPackageFormPrice] = useState("");
  const [packageFormLoading, setPackageFormLoading] = useState(false);

  // --- State for Edited Values (Temporary) ---
  const [editedTitle, setEditedTitle] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [editedAddress, setEditedAddress] = useState("");
  const [editedCity, setEditedCity] = useState("");
  const [editedState, setEditedState] = useState("");
  const [editedPostalCode, setEditedPostalCode] = useState("");
  const [editedCountry, setEditedCountry] = useState("");
  const [editedWeeklySchedule, setEditedWeeklySchedule] = useState<
    WeeklyScheduleEntry[]
  >([]); // Adjusted type
  // Categories state
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Set document title and initialize edit states
  useEffect(() => {
    if (service) {
      document.title = `${service.title} | SRV Provider`;
      setEditedTitle(service.title);
      setEditedCategory(service.category.id);
      setEditedAddress(service.location.address || "");
      setEditedCity(service.location.city);
      setEditedState(service.location.state || "");
      setEditedPostalCode(service.location.postalCode || "");
      setEditedCountry(service.location.country || "");
      // Ensure weeklySchedule is initialized correctly, adding 'slots' if missing
      const initialSchedule =
        service.weeklySchedule?.map((day) => ({
          ...day,
          availability: {
            ...day.availability,
            slots: day.availability.slots || [], // Ensure slots array exists
          },
        })) || [];
      setEditedWeeklySchedule(initialSchedule);
    } else {
      document.title = "Service Details | SRV Provider";
    }
  }, [service]);

  // Fetch categories
  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const fetchedCategories =
          await serviceCanisterService.getAllCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        // Set empty array as fallback
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  const [retryCount, setRetryCount] = useState(0);

  const hasActiveBookings = useMemo(() => {
    if (!service || !providerBookings.length) return false;
    const activeStatuses = ["Requested", "Accepted", "InProgress"];
    return providerBookings.some(
      (booking) =>
        booking.serviceId === service.id &&
        activeStatuses.includes(booking.status),
    );
  }, [service, providerBookings]);

  const activeBookingsCount = useMemo(() => {
    if (!service || !providerBookings.length) return 0;
    const activeStatuses = ["Requested", "Accepted", "InProgress"];
    return providerBookings.filter(
      (booking) =>
        booking.serviceId === service.id &&
        activeStatuses.includes(booking.status),
    ).length;
  }, [service, providerBookings]);

  // Load service data and packages
  useEffect(() => {
    const loadServiceData = async () => {
      if (!id || typeof id !== "string") {
        setLoading(false);
        return;
      }

      setLoading(true);
      setPackagesLoading(true);
      setError(null);

      try {
        const serviceData = await getService(id);
        if (serviceData) {
          // Ensure weeklySchedule has 'slots' array for existing data
          const processedServiceData = {
            ...serviceData,
            weeklySchedule: serviceData.weeklySchedule?.map((day) => ({
              ...day,
              availability: {
                ...day.availability,
                slots: day.availability.slots || [],
              },
            })),
          };
          setService(processedServiceData);

          try {
            const servicePackages = await getServicePackages(id);
            setPackages(servicePackages || []);
          } catch (packageError) {
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
  }, [id, getService, getServicePackages, retryCount]);

  const handleDeleteService = async () => {
    if (!service) return;
    try {
      setIsDeleting(true);
      if (service.status === "Archived") {
        await permanentDeleteService(service.id);
        toast.success("Service deleted permanently!", {
          position: "top-center",
        });
      } else {
        await archiveService(service.id);
        toast.success("Service archived!", { position: "top-center" });
      }
      navigate("/provider/services");
    } catch (error) {
      toast.error(
        service.status === "Archived"
          ? "Failed to delete service. Please try again."
          : "Failed to archive service. Please try again.",
        {
          position: "top-center",
        },
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!service) return;

    const newStatus =
      service.status === "Available" ? "Unavailable" : "Available";
    setIsUpdatingStatus(true);
    try {
      await updateServiceStatus(service.id, newStatus);
      setService((prev) => (prev ? { ...prev, status: newStatus } : prev));
      toast.success(
        newStatus === "Available"
          ? "Service activated!"
          : "Service deactivated!",
      );
    } catch (error) {
      toast.error("Failed to update service status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRetry = () => {
    if (id && typeof id === "string") {
      setRetryCount((prev) => prev + 1);
    }
  };

  // --- Edit Section Handlers ---
  const handleEditTitleCategory = useCallback(() => {
    setEditTitleCategory((prev) => !prev);
    if (service && !editTitleCategory) {
      setEditedTitle(service.title);
      setEditedCategory(service.category.id);
    }
  }, [service, editTitleCategory]);

  const handleSaveTitleCategory = async () => {
    if (!service) return;

    if (!editedTitle.trim()) {
      toast.error("Service title cannot be empty.");
      return;
    }
    if (editedTitle.trim().length > 40) {
      toast.error("Service title must not exceed 40 characters.");
      return;
    }
    if (!editedCategory.trim()) {
      toast.error("Service category cannot be empty.");
      return;
    }

    setSavingTitleCategory(true);
    try {
      const selectedCategory = categories.find(
        (cat) => cat.id === editedCategory,
      );

      await updateService(
        service.id,
        editedCategory,
        editedTitle,
        service.description,
        service.price,
      );
      setService((prev) =>
        prev
          ? {
              ...prev,
              title: editedTitle,
              category: {
                ...prev.category,
                id: editedCategory,
                name: selectedCategory?.name || "Unknown Category",
              },
            }
          : prev,
      );
      setEditTitleCategory(false);
      toast.success("Service title and category updated!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      toast.error(`Failed to update: ${errorMessage}`);
    } finally {
      setSavingTitleCategory(false);
    }
  };

  const handleCancelTitleCategory = useCallback(() => {
    setEditTitleCategory(false);
    if (service) {
      setEditedTitle(service.title);
      setEditedCategory(service.category.id);
    }
  }, [service]);

  const handleEditLocationAvailability = useCallback(() => {
    setEditLocationAvailability((prev) => !prev);
    if (service && !editLocationAvailability) {
      setEditedAddress(service.location.address || "");
      setEditedCity(service.location.city || "");
      setEditedState(service.location.state || "");
      setEditedPostalCode(service.location.postalCode || "");
      setEditedCountry(service.location.country || "");
      setEditedWeeklySchedule(service.weeklySchedule || []);
    }
  }, [service, editLocationAvailability]);

  const handleSaveLocationAvailability = async () => {
    if (!service) return;

    if (!editedCity.trim()) {
      toast.error("City cannot be empty.");
      return;
    }

    // Comprehensive validation for time slots using the same validation as ServiceAvailability
    for (const day of editedWeeklySchedule) {
      if (day.availability.isAvailable && day.availability.slots.length > 0) {
        const errors = validateTimeSlots(day.availability.slots);
        if (errors.length > 0) {
          toast.error(
            `${day.day} has invalid time slots: ${errors.join(", ")}`,
            {
              duration: 6000, // Show longer to read the full message
            },
          );
          return;
        }
      }
    }

    setSavingLocationAvailability(true);
    try {
      // Create updated location object
      const updatedLocation: Location = {
        latitude: service.location.latitude, // Keep existing coordinates
        longitude: service.location.longitude,
        address: editedAddress,
        city: editedCity,
        state: editedState,
        postalCode: editedPostalCode,
        country: editedCountry,
      };

      // Update service with location and availability data
      const updatedService = await updateService(
        service.id,
        service.category.id,
        service.title,
        service.description,
        service.price,
        updatedLocation,
        editedWeeklySchedule,
        service.instantBookingEnabled,
        service.bookingNoticeHours,
        service.maxBookingsPerDay,
      );

      // Update local state with the returned service data
      setService(updatedService);
      setEditLocationAvailability(false);
      toast.success("Location and availability updated!");
    } catch (err) {
      toast.error(
        "Failed to update location or availability. Please try again.",
      );
    } finally {
      setSavingLocationAvailability(false);
    }
  };

  const handleCancelLocationAvailability = useCallback(() => {
    setEditLocationAvailability(false);
    if (service) {
      setEditedAddress(service.location.address || "");
      setEditedCity(service.location.city);
      setEditedState(service.location.state || "");
      setEditedPostalCode(service.location.postalCode || "");
      setEditedCountry(service.location.country || "");
      setEditedWeeklySchedule(service.weeklySchedule || []);
    }
  }, [service]);

  // --- Image Upload Handlers ---
  const handleEditImages = useCallback(() => {
    setEditImages((prev) => !prev);
    if (!editImages && serviceImages) {
      setTempDisplayImages([...serviceImages]);
    }
  }, [editImages, serviceImages]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!event.target.files || !service) return;

    const files = Array.from(event.target.files);

    // Check if adding these files would exceed the 5 image limit
    if (tempDisplayImages.length + files.length > 10) {
      setUploadError(
        `Cannot upload ${files.length} image(s). Maximum 10 images allowed. You currently have ${tempDisplayImages.length} image(s).`,
      );
      event.target.value = "";
      return;
    }

    // Validate files using mediaService
    try {
      for (const file of files) {
        const validationError = mediaService.validateImageFile(file);
        if (validationError) {
          setUploadError(`File ${file.name}: ${validationError}`);
          event.target.value = "";
          return;
        }
      }

      // Create immediate UI feedback - show images right away
      const newDisplayImages = files.map((file) => ({
        url: URL.createObjectURL(file), // Temporary URL for display
        dataUrl: URL.createObjectURL(file),
        error: null,
        isNew: true,
      }));

      // Add to temporary display immediately
      setTempDisplayImages((prev) => [...prev, ...newDisplayImages]);

      // Add to pending uploads for later persistence
      setPendingUploads((prev) => [...prev, ...files]);
      setUploadError(null);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to validate images. Please try again.",
      );
    }

    // Reset the input
    event.target.value = "";
  };

  const handleRemoveImage = async (imageIndex: number) => {
    if (!service) return;

    // Remove from temporary display immediately
    const newTempImages = [...tempDisplayImages];
    const removedImage = newTempImages[imageIndex];

    // If it's a new image (has isNew property), clean up the URL and remove from pending uploads
    if (removedImage?.isNew) {
      URL.revokeObjectURL(removedImage.url);
      // Find and remove from pending uploads
      const pendingIndex = tempDisplayImages
        .slice(0, imageIndex)
        .filter((img) => img.isNew).length;
      const newPendingUploads = [...pendingUploads];
      newPendingUploads.splice(pendingIndex, 1);
      setPendingUploads(newPendingUploads);
    } else {
      // It's an existing image, add to pending removals
      const originalIndex =
        serviceImages?.findIndex((img) => img.url === removedImage.url) ?? -1;
      if (originalIndex >= 0 && !pendingRemovals.includes(originalIndex)) {
        setPendingRemovals((prev) => [...prev, originalIndex]);
      }
    }

    // Remove from temporary display
    newTempImages.splice(imageIndex, 1);
    setTempDisplayImages(newTempImages);
    setUploadError(null);
  };

  const handleSaveImages = async () => {
    if (!service) return;

    setUploadingImages(true);
    setSavingImages(true);
    setUploadError(null);

    try {
      // Process removals first
      if (pendingRemovals.length > 0) {
        for (const imageIndex of pendingRemovals.sort((a, b) => b - a)) {
          // Remove from end to start
          if (serviceImages && serviceImages[imageIndex]?.url) {
            await removeImage(serviceImages[imageIndex].url);
          }
        }
      }

      // Process uploads
      if (pendingUploads.length > 0) {
        await uploadImages(pendingUploads);
      }

      // Cleanup temporary URLs for new images
      tempDisplayImages.forEach((img) => {
        if (img.isNew) {
          URL.revokeObjectURL(img.url);
        }
      });

      // Reset all temporary state
      setPendingUploads([]);
      setPendingRemovals([]);
      setTempDisplayImages([]);

      // Exit edit mode
      setEditImages(false);

      toast.success("Service images updated!");

      // Trigger a refresh of service data to get updated image URLs
      setRetryCount((prev) => prev + 1);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to save image changes. Please try again.",
      );
      toast.error("Failed to update images.");
    } finally {
      setUploadingImages(false);
      setSavingImages(false);
    }
  };

  // --- Certification Upload Handlers ---
  const handleEditCertifications = useCallback(() => {
    setEditCertifications((prev) => !prev);
    if (!editCertifications && serviceCertificates) {
      setTempDisplayCertificates([...serviceCertificates]);
    }
    setCertificateUploadError(null);
  }, [serviceCertificates, editCertifications]);

  // --- Certification Cancel Handler ---
  const handleCancelCertifications = useCallback(() => {
    setEditCertifications(false);
    if (serviceCertificates) {
      setTempDisplayCertificates([...serviceCertificates]);
    } else {
      setTempDisplayCertificates([]);
    }
    setPendingCertificateUploads([]);
    setPendingCertificateRemovals([]);
    setCertificateUploadError(null);
  }, [serviceCertificates]);

  // --- Image Cancel Handler ---
  const handleCancelImages = useCallback(() => {
    setEditImages(false);
    if (serviceImages) {
      setTempDisplayImages([...serviceImages]);
    } else {
      setTempDisplayImages([]);
    }
    setPendingUploads([]);
    setPendingRemovals([]);
    setUploadError(null);
  }, [serviceImages]);

  const handleCertificationUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!event.target.files || !service) return;

    const files = Array.from(event.target.files);
    setCertificateUploadError(null);

    // Validate files
    for (const file of files) {
      // Check file type (PDFs and images)
      const isValidType = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "application/pdf",
      ].includes(file.type);

      if (!isValidType) {
        setCertificateUploadError(
          `File ${file.name} is not a supported format. Only images and PDFs are allowed.`,
        );
        event.target.value = "";
        return;
      }

      // Check file size (450KB limit)
      if (file.size > 450 * 1024) {
        setCertificateUploadError(
          `File ${file.name} exceeds the 450KB size limit.`,
        );
        event.target.value = "";
        return;
      }
    }

    // Check total certificate limit (10 max)
    const currentCount = tempDisplayCertificates.length;
    if (currentCount + files.length > 10) {
      setCertificateUploadError(
        `Cannot add ${files.length} certificate(s). Maximum 10 certificates allowed per service.`,
      );
      event.target.value = "";
      return;
    }

    // Create temporary display entries for immediate UI feedback
    const newTempCertificates = await Promise.all(
      files.map(async (file) => {
        const tempUrl = URL.createObjectURL(file);
        let dataUrl: string | null = null;

        try {
          // For images, create data URL for preview
          if (file.type.startsWith("image/")) {
            dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          }
        } catch (error) {}

        return {
          url: tempUrl,
          dataUrl,
          error: null,
          isNew: true,
          fileName: file.name,
        };
      }),
    );

    // Add new certificates to temporary display
    setTempDisplayCertificates((prev) => [...prev, ...newTempCertificates]);

    // Add files to pending uploads
    setPendingCertificateUploads((prev) => [...prev, ...files]);

    // Reset the input
    event.target.value = "";
  };

  const handleRemoveCertificate = async (certificateIndex: number) => {
    if (!service) return;

    const newTempCertificates = [...tempDisplayCertificates];
    const removedCertificate = newTempCertificates[certificateIndex];

    if (!removedCertificate) return;

    // If it's a new certificate (has isNew property), clean up the URL and remove from pending uploads
    if (removedCertificate?.isNew) {
      URL.revokeObjectURL(removedCertificate.url);
      // Find and remove from pending uploads
      const pendingIndex = tempDisplayCertificates
        .slice(0, certificateIndex)
        .filter((cert) => cert.isNew).length;
      const newPendingUploads = [...pendingCertificateUploads];
      newPendingUploads.splice(pendingIndex, 1);
      setPendingCertificateUploads(newPendingUploads);
    } else {
      // It's an existing certificate, add to pending removals
      const originalIndex =
        serviceCertificates?.findIndex(
          (cert) => cert.url === removedCertificate.url,
        ) ?? -1;
      if (
        originalIndex >= 0 &&
        !pendingCertificateRemovals.includes(originalIndex)
      ) {
        setPendingCertificateRemovals((prev) => [...prev, originalIndex]);
      }
    }

    // Remove from temporary display
    newTempCertificates.splice(certificateIndex, 1);
    setTempDisplayCertificates(newTempCertificates);
    setCertificateUploadError(null);
  };

  const handleSaveCertifications = async () => {
    if (!service) return;

    setUploadingCertificates(true);
    setSavingCertifications(true);
    setCertificateUploadError(null);

    try {
      // Process removals first
      if (pendingCertificateRemovals.length > 0) {
        for (const certificateIndex of pendingCertificateRemovals.sort(
          (a, b) => b - a,
        )) {
          // Remove from end to start
          if (
            serviceCertificates &&
            serviceCertificates[certificateIndex]?.url
          ) {
            await removeCertificate(serviceCertificates[certificateIndex].url);
          }
        }
      }

      // Process uploads
      if (pendingCertificateUploads.length > 0) {
        await uploadCertificates(pendingCertificateUploads);
      }

      // Cleanup temporary URLs for new certificates
      tempDisplayCertificates.forEach((cert) => {
        if (cert.isNew) {
          URL.revokeObjectURL(cert.url);
        }
      });

      // Reset all temporary state
      setPendingCertificateUploads([]);
      setPendingCertificateRemovals([]);
      setTempDisplayCertificates([]);

      // Exit edit mode
      setEditCertifications(false);

      toast.success("Certifications updated!");

      // Trigger a refresh of service data to get updated certificate URLs
      setRetryCount((prev) => prev + 1);
    } catch (error) {
      setCertificateUploadError(
        error instanceof Error
          ? error.message
          : "Failed to save certificate changes. Please try again.",
      );
      toast.error("Failed to update certifications.");
    } finally {
      setUploadingCertificates(false);
      setSavingCertifications(false);
    }
  };

  // --- Package Management Handlers ---
  const handleAddPackage = () => {
    setIsAddingOrEditingPackage(true);
    setCurrentPackageId(null); // Clear ID for new package
    setPackageFormTitle("");
    setPackageFormDescription("");
    setPackageFormPrice("");
  };

  const handleEditPackage = (pkg: ServicePackage) => {
    setIsAddingOrEditingPackage(true);
    setCurrentPackageId(pkg.id); // Set ID for existing package
    setPackageFormTitle(pkg.title);
    setPackageFormDescription(pkg.description);
    setPackageFormPrice(pkg.price.toString());
  };

  const handleSavePackage = async () => {
    if (!service) return;

    if (
      !packageFormTitle.trim() ||
      !packageFormDescription.trim() ||
      !packageFormPrice.trim()
    ) {
      toast.error("Please fill in all package fields.");
      return;
    }
    const parsedPrice = parseFloat(packageFormPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Price must be a positive number.");
      return;
    }

    // Check for duplicate package names
    const trimmedName = packageFormTitle.trim().toLowerCase();
    const duplicatePackage = packages.find(
      (pkg) =>
        pkg.title.trim().toLowerCase() === trimmedName &&
        pkg.id !== currentPackageId, // Exclude current package when editing
    );

    if (duplicatePackage) {
      toast.error(
        `Package name "${packageFormTitle.trim()}" already exists. Please choose a different name.`,
      );
      return;
    }

    setPackageFormLoading(true); // Indicate saving
    try {
      if (currentPackageId) {
        // Update existing package
        const updatedPackage = await updatePackage({
          id: currentPackageId,
          serviceId: service.id,
          title: packageFormTitle,
          description: packageFormDescription,
          price: parsedPrice,
        });
        setPackages((prev) =>
          prev.map((p) => (p.id === currentPackageId ? updatedPackage : p)),
        );
        toast.success("Package updated!");
      } else {
        // Add new package
        const newPackage = await createPackage({
          serviceId: service.id,
          title: packageFormTitle,
          description: packageFormDescription,
          price: parsedPrice,
        });
        setPackages((prev) => [...prev, newPackage]);
        toast.success("Package created!");
      }
      handleCancelPackageEdit(); // Close the form
    } catch (err) {
      toast.error("Failed to save package. Please try again.");
    } finally {
      setPackageFormLoading(false);
    }
  };

  const handleCancelPackageEdit = () => {
    setIsAddingOrEditingPackage(false);
    setCurrentPackageId(null);
    setPackageFormTitle("");
    setPackageFormDescription("");
    setPackageFormPrice("");
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!service) return;

    // Find the package to get its title
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;

    // Set the package to delete and show confirmation dialog
    setPackageToDelete({ id: packageId, title: pkg.title });
    setShowDeletePackageConfirm(true);
  };

  const confirmDeletePackage = async () => {
    if (!service || !packageToDelete) return;

    try {
      setIsDeletingPackage(true);
      await deletePackage(packageToDelete.id);
      setPackages((prev) =>
        prev.filter((pkg) => pkg.id !== packageToDelete.id),
      );
      toast.success("Package deleted!");
      setShowDeletePackageConfirm(false);
      setPackageToDelete(null);
    } catch (err) {
      toast.error("Failed to delete package. Please try again.");
    } finally {
      setIsDeletingPackage(false);
    }
  };
  const visibleReviews = reviews.filter((r) => r.status === "Visible");
  const averageRating = getAverageRating(visibleReviews);
  const reviewCount = visibleReviews.length;

  // Show loading screen during initialization or data loading
  if (loading && !service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 pb-24 md:pb-0">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex w-full items-center justify-center px-4 py-3">
            <div className="h-7 w-32 animate-pulse rounded bg-gray-200 lg:h-8"></div>
          </div>
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
                          // Matching the exact classes of the real card container for alignment
                          className="flex w-full flex-col items-start rounded-xl border border-blue-100 bg-white/80 p-3 shadow sm:w-auto sm:min-w-[140px]"
                        >
                          {/* Day Name Badge Bone (e.g., "Monday") */}
                          <div className="mb-3 flex h-6 w-28 items-center gap-2 rounded-full bg-gray-200 px-3"></div>

                          {/* Time Slots List Bones */}
                          <div className="ml-1 flex flex-col gap-2">
                            {/* Slot 1 Bone (e.g., 9:00 AM - 5:00 PM) */}
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-32 rounded bg-gray-200"></div>
                            </div>
                            {/* Slot 2 Bone (Optional second slot) */}
                            <div
                              className={`flex items-center gap-2 ${index === 1 ? "hidden" : ""}`}
                            >
                              <div className="h-6 w-24 rounded bg-gray-200"></div>
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
        <BottomNavigation />
      </div>
    );
  }

  // Show error screen only if we have an error and no service data
  if ((error || hookError) && !service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-xl font-semibold text-red-600">
            Unable to Load Service
          </h1>
          <p className="mb-6 text-gray-600">
            {error || hookError || "The service could not be loaded."}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={handleRetry}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link
              to="/provider/services"
              className="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
            >
              Back to Services
            </Link>
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
              className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Try Loading Again
            </button>
            <Link
              to="/provider/services"
              className="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
            >
              Back to Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 pb-24 md:pb-0">
      <Toaster position="top-center" richColors />
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

      <DeletePackageConfirmDialog
        open={showDeletePackageConfirm}
        packageTitle={packageToDelete?.title}
        isDeleting={isDeletingPackage}
        onCancel={() => {
          setShowDeletePackageConfirm(false);
          setPackageToDelete(null);
        }}
        onConfirm={confirmDeletePackage}
      />

      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex w-full items-center justify-center px-4 py-3">
          <h1 className="text-xl font-extrabold tracking-tight text-black lg:text-2xl">
            Service Details
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-full space-y-10 px-4 pb-10 sm:px-8">
        {/** Compute edit-lock state */}
        {/** Only the section currently being edited remains interactive */}
        {/** Others get blurred and non-interactive to prevent concurrent edits */}
        {/** Keep HeroSection interactive always so the user can save/cancel */}
        {/** This is a plain layout-level lock — underlying components remain unchanged */}
        {/** Any of the flags below indicates an edit in progress */}
        {/** NOTE: We intentionally avoid changing child components' logic */}
        {/** to keep this change minimal and focused on UX. */}
        {/** Derived: any editing ongoing */}
        {/** eslint-disable-next-line @typescript-eslint/no-unused-vars */}
        {(() => null)()}
        {/* no-op expression to satisfy JSX-only block; actual logic below in props */}
        <HeroSection
          onBack={() => navigate("/provider/home")}
          service={service}
          serviceImages={serviceImages}
          isLoadingServiceImages={isLoadingServiceImages}
          hasActiveBookings={hasActiveBookings}
          activeBookingsCount={activeBookingsCount}
          editTitleCategory={editTitleCategory}
          editedTitle={editedTitle}
          editedCategory={editedCategory}
          categories={categories}
          categoriesLoading={categoriesLoading}
          savingTitleCategory={savingTitleCategory}
          averageRating={averageRating}
          reviewCount={reviewCount}
          setEditedTitle={setEditedTitle}
          setEditedCategory={setEditedCategory}
          onEdit={handleEditTitleCategory}
          onSave={handleSaveTitleCategory}
          onCancel={handleCancelTitleCategory}
        />
        {/* Active Bookings Warning */}
        {hasActiveBookings && (
          <ActiveBookingsWarning activeBookingsCount={activeBookingsCount} />
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left: Location & Packages */}
          <div className="flex flex-col gap-8">
            <LockableSection
              locked={
                (editTitleCategory ||
                  editImages ||
                  editCertifications ||
                  isAddingOrEditingPackage) &&
                !editLocationAvailability
              }
            >
              <LocationAvailabilitySection
                editLocationAvailability={editLocationAvailability}
                hasActiveBookings={hasActiveBookings}
                activeBookingsCount={activeBookingsCount}
                editedCity={editedCity}
                editedState={editedState}
                setEditedCity={setEditedCity}
                setEditedState={setEditedState}
                editedWeeklySchedule={editedWeeklySchedule as any}
                setEditedWeeklySchedule={setEditedWeeklySchedule as any}
                savingLocationAvailability={savingLocationAvailability}
                onEdit={handleEditLocationAvailability}
                onCancel={handleCancelLocationAvailability}
                onSave={handleSaveLocationAvailability}
                service={service}
              />
            </LockableSection>

            <LockableSection
              locked={
                (editTitleCategory ||
                  editImages ||
                  editCertifications ||
                  editLocationAvailability) &&
                !isAddingOrEditingPackage
              }
            >
              <PackagesSection
                packages={packages}
                isAddingOrEditingPackage={isAddingOrEditingPackage}
                activeBookingsCount={activeBookingsCount}
                hasActiveBookings={hasActiveBookings}
                packageFormTitle={packageFormTitle}
                packageFormDescription={packageFormDescription}
                packageFormPrice={packageFormPrice}
                packageFormLoading={packageFormLoading}
                currentPackageId={currentPackageId}
                isLoading={packagesLoading}
                onAddPackage={handleAddPackage}
                onCancelPackageEdit={handleCancelPackageEdit}
                onSavePackage={handleSavePackage}
                onEditPackage={handleEditPackage}
                onDeletePackage={handleDeletePackage}
                setPackageFormTitle={setPackageFormTitle}
                setPackageFormDescription={setPackageFormDescription}
                setPackageFormPrice={setPackageFormPrice}
              />
            </LockableSection>
          </div>

          {/* Right: Certifications & Service Images */}
          <div className="flex flex-col gap-8">
            <LockableSection
              locked={
                (editTitleCategory ||
                  editImages ||
                  editLocationAvailability ||
                  isAddingOrEditingPackage) &&
                !editCertifications
              }
            >
              <CertificationsSection
                hasActiveBookings={hasActiveBookings}
                activeBookingsCount={activeBookingsCount}
                editCertifications={editCertifications}
                tempDisplayCertificates={tempDisplayCertificates}
                serviceCertificates={serviceCertificates}
                certificateUploadError={certificateUploadError}
                uploadingCertificates={uploadingCertificates}
                savingCertifications={savingCertifications}
                onToggleEdit={handleEditCertifications}
                onCancel={handleCancelCertifications}
                onSave={handleSaveCertifications}
                onUpload={handleCertificationUpload}
                onRemove={handleRemoveCertificate}
                onPreview={(url, type) => {
                  setPreviewUrl(url);
                  setPreviewType(type);
                }}
                isPdfFile={isPdfFile}
              />
            </LockableSection>

            <LockableSection
              locked={
                (editTitleCategory ||
                  editCertifications ||
                  editLocationAvailability ||
                  isAddingOrEditingPackage) &&
                !editImages
              }
            >
              <ImagesSection
                hasActiveBookings={hasActiveBookings}
                activeBookingsCount={activeBookingsCount}
                editImages={editImages}
                tempDisplayImages={tempDisplayImages}
                serviceImages={serviceImages}
                uploadError={uploadError}
                uploadingImages={uploadingImages}
                savingImages={savingImages}
                onToggleEdit={handleEditImages}
                onCancel={handleCancelImages}
                onSave={handleSaveImages}
                onUpload={handleImageUpload}
                onRemove={handleRemoveImage}
                onPreview={(url, type) => {
                  setPreviewUrl(url);
                  setPreviewType(type);
                }}
                isPdfFile={isPdfFile}
              />
            </LockableSection>
          </div>
        </div>

        <LockableSection
          locked={
            editTitleCategory ||
            editLocationAvailability ||
            editImages ||
            editCertifications ||
            isAddingOrEditingPackage
          }
        >
          <ActionButtons
            status={service.status}
            isUpdatingStatus={isUpdatingStatus}
            isDeleting={isDeleting}
            hasActiveBookings={hasActiveBookings}
            activeBookingsCount={activeBookingsCount}
            onToggleStatus={handleStatusToggle}
            onDeleteClick={() => setShowDeleteConfirm(true)}
          />
        </LockableSection>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default ProviderServiceDetailPage;
