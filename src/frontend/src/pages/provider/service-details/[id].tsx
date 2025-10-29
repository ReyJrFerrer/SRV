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
import BottomNavigation from "../../../components/provider/BottomNavigation";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

// WeeklyScheduleEntry now provided by AvailabilityEditor types
type WeeklyScheduleEntry =
  import("../../../components/provider/service-details").WeeklyScheduleEntry;

const ProviderServiceDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // State for image/certificate preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);

  // Helper to check if file is a PDF
  const isPdfFile = (url: string) => url?.toLowerCase().endsWith(".pdf");

  const {
    getService,
    deleteService,
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

  // Load service images using the useServiceImages hook
  const { images: serviceImages } = useServiceImages(
    service?.id,
    service?.imageUrls || [],
  );

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
          }
          setError(null);
        } else {
          throw new Error("Service not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load service");
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
      await deleteService(service.id);
      toast.success("Service deleted!", { position: "top-center" });
      navigate("/provider/services");
    } catch (error) {
      toast.error("Failed to delete service. Please try again.", {
        position: "top-center",
      });
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
      console.error("Error saving title/category:", err);
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
    if (tempDisplayImages.length + files.length > 5) {
      setUploadError(
        `Cannot upload ${files.length} image(s). Maximum 5 images allowed. You currently have ${tempDisplayImages.length} image(s).`,
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
      toast.success("Service images updated!");
      window.location.reload();
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
      toast.success("Certifications updated!");
      window.location.reload();
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

  // Show loading screen during initialization or data loading
  if (loading && !service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-700">Loading service details...</p>
        {retryCount > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            Retry attempt: {retryCount}
          </p>
        )}
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

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative flex w-full items-center px-4 py-3">
          <button
            onClick={() => navigate(`/provider/home`)}
            className="rounded-full p-2 transition-colors hover:bg-blue-100"
            aria-label="Go to home"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold tracking-tight text-black">
            Service Details
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-8">
        <HeroSection
          onBack={() => navigate("/provider/home")}
          service={service}
          serviceImages={serviceImages}
          hasActiveBookings={hasActiveBookings}
          activeBookingsCount={activeBookingsCount}
          editTitleCategory={editTitleCategory}
          editedTitle={editedTitle}
          editedCategory={editedCategory}
          categories={categories}
          categoriesLoading={categoriesLoading}
          savingTitleCategory={savingTitleCategory}
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
              onAddPackage={handleAddPackage}
              onCancelPackageEdit={handleCancelPackageEdit}
              onSavePackage={handleSavePackage}
              onEditPackage={handleEditPackage}
              onDeletePackage={handleDeletePackage}
              setPackageFormTitle={setPackageFormTitle}
              setPackageFormDescription={setPackageFormDescription}
              setPackageFormPrice={setPackageFormPrice}
            />
          </div>

          {/* Right: Certifications & Service Images */}
          <div className="flex flex-col gap-8">
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
          </div>
        </div>

        <ActionButtons
          status={service.status}
          isUpdatingStatus={isUpdatingStatus}
          isDeleting={isDeleting}
          hasActiveBookings={hasActiveBookings}
          activeBookingsCount={activeBookingsCount}
          onToggleStatus={handleStatusToggle}
          onDeleteClick={() => setShowDeleteConfirm(true)}
        />
        {/* Add space below the buttons */}
        <div className="h-8" />
      </main>
      <BottomNavigation />
    </div>
  );
};

export default ProviderServiceDetailPage;
