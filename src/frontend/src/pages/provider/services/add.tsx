import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { nanoid } from "nanoid";
import { Filter } from "bad-words";
import { Toaster, toast } from "sonner";
import BottomNavigation from "../../../components/provider/NavigationBar";
import ServiceDrafts from "../../../components/provider/add service/ServiceDrafts";
import {
  getFilesEntries,
  deleteDraftFromIDB,
} from "../../../utils/draftStorage";

// Step Components
import ServiceDetails from "../../../components/provider/add service/ServiceDetails";
import ServiceAvailability from "../../../components/provider/add service/ServiceAvailability";
import ServiceLocation from "../../../components/provider/add service/ServiceLocation";
import ServiceImageUpload from "../../../components/provider/add service/ServiceImageUpload";
import ReviewSubmit from "../../../components/provider/add service/ReviewSubmit";
// Draft UI/logic moved into ServiceDrafts component

// Service Management Hook & Types
import {
  useServiceManagement,
  DayOfWeek,
  ServiceCreateRequest,
} from "../../../hooks/serviceManagement";

import {
  ServiceCategory,
  CommissionQuote,
} from "../../../services/serviceCanisterService";
import { processServiceCertificateFiles } from "../../../services/mediaService";

// Type for time slots
interface TimeSlotUIData {
  id: string;
  startHour: string;
  startMinute: string;
  startPeriod: "AM" | "PM";
  endHour: string;
  endMinute: string;
  endPeriod: "AM" | "PM";
}

// Validation errors interface
interface ValidationErrors {
  serviceOfferingTitle?: string;
  categoryId?: string;
  servicePackages?: string;
  availabilitySchedule?: string;
  timeSlots?: string;
  locationMunicipalityCity?: string;
  general?: string;
  profanity?: string;
}

// Backend validation constants
const VALIDATION_LIMITS = {
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 40,
  MIN_DESCRIPTION_LENGTH: 3,
  MAX_DESCRIPTION_LENGTH: 100,
  MIN_PRICE: 1,
  MAX_PRICE: 1_000_000,
};

const filter = new Filter();

const initialServiceState = {
  serviceOfferingTitle: "",
  categoryId: "",
  servicePackages: [
    {
      id: nanoid(),
      name: "",
      description: "",
      price: "",
      currency: "PHP",
      isPopular: false,
    },
  ],
  availabilitySchedule: [] as DayOfWeek[],
  useSameTimeForAllDays: true,
  commonTimeSlots: [
    {
      id: nanoid(),
      startHour: "09",
      startMinute: "00",
      startPeriod: "AM" as "AM" | "PM",
      endHour: "05",
      endMinute: "00",
      endPeriod: "PM" as "AM" | "PM",
    },
  ],
  perDayTimeSlots: {} as Record<DayOfWeek, TimeSlotUIData[]>,
  locationHouseNumber: "",
  locationStreet: "",
  locationBarangay: "",
  locationMunicipalityCity: "",
  locationProvince: "",
  locationCountry: "Philippines",
  locationPostalCode: "",
  locationLatitude: "",
  locationLongitude: "",
  locationAddress: "",
  serviceRadius: "5",
  serviceRadiusUnit: "km" as "km" | "mi",
};

const AddServicePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    categories,
    loading: loadingCategories,
    userServices,
    getCategories,
    createService,
    createPackage,
    processImageFilesForService,
    validateImageFiles,
    getCommissionQuote,
  } = useServiceManagement();

  // State for stepper and form data
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialServiceState);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [serviceCreated, setServiceCreated] = useState(false);

  // Service image upload state
  const [serviceImageFiles, setServiceImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Certification upload state
  const [certificationFiles, setCertificationFiles] = useState<File[]>([]);
  const [certificationPreviews, setCertificationPreviews] = useState<string[]>(
    [],
  );

  // Used to trigger scroll/highlight on error
  const [scrollToErrorTrigger, setScrollToErrorTrigger] = useState(0);

  // Commission state
  const [commissionQuotes, setCommissionQuotes] = useState<{
    [packageId: string]: CommissionQuote;
  }>({});
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  // Local draft autosave key (used by submission to clear saved draft)
  const ADD_SERVICE_DRAFT_KEY = "add_service_draft_v1";

  // ServiceDrafts ref handles all draft/localStorage logic (save/restore/banner/modal)
  const serviceDraftsRef = useRef<any>(null);

  // Header back handler: ask user if they'd like to save as draft before leaving
  const handleHeaderBack = () => {
    if (serviceCreated) {
      navigate("/provider/home");
      return;
    }
    if (currentStep === 1) {
      // If at first step and no changes, just go back
      const hasChanges =
        JSON.stringify(formData) !== JSON.stringify(initialServiceState) ||
        serviceImageFiles.length > 0 ||
        certificationFiles.length > 0;
      if (!hasChanges) {
        navigate(-1);
        return;
      }
      // delegate to ServiceDrafts to show the same modal
      serviceDraftsRef.current?.showExitPromptNow?.();
      return;
    }
    // otherwise just go back a step
    handleBack();
  };

  const handleNavigateAttempt = (to: string): boolean => {
    if (
      serviceDraftsRef.current &&
      typeof serviceDraftsRef.current.handleNavigateAttempt === "function"
    ) {
      return serviceDraftsRef.current.handleNavigateAttempt(to);
    }
    return true;
  };

  // --- Image Handlers ---
  const handleImageFilesChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setIsProcessingImages(true);
    try {
      setServiceImageFiles((prev) => [...prev, ...files]);
      const newPreviews = await Promise.all(
        files.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () =>
              reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
          });
        }),
      );
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    } catch {
      setServiceImageFiles((prev) => prev.slice(0, -files.length));
    } finally {
      setIsProcessingImages(false);
    }
    e.target.value = "";
  };

  const handleCertificationFilesChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setCertificationFiles((prev) => [...prev, ...files]);
    try {
      const newPreviews = await Promise.all(
        files.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () =>
              reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
          });
        }),
      );
      setCertificationPreviews((prev) => [...prev, ...newPreviews]);
    } catch {}
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setServiceImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (validationErrors.general?.includes("Processing")) {
      setValidationErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  const handleRemoveCertification = (index: number) => {
    setCertificationFiles((prev) => prev.filter((_, i) => i !== index));
    setCertificationPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Commission handlers
  const fetchCommissionQuotes = useCallback(async () => {
    if (!getCommissionQuote || !formData.categoryId) return;

    setLoadingCommissions(true);
    const quotes: { [packageId: string]: CommissionQuote } = {};

    console.log(formData.categoryId);
    const categoryForCommission =
      categories.find((cat) => cat.id === formData.categoryId)?.name ||
      "Default Category";

    try {
      for (const pkg of formData.servicePackages) {
        if (pkg.name.trim() && pkg.description.trim() && pkg.price) {
          const quote = await getCommissionQuote(
            categoryForCommission,
            Number(pkg.price),
          );
          quotes[pkg.id] = quote;
        }
      }
      setCommissionQuotes(quotes);
    } catch (error) {
      console.error("Failed to fetch commission quotes:", error);
    } finally {
      setLoadingCommissions(false);
    }
  }, [formData.servicePackages, formData.categoryId, getCommissionQuote]);

  // --- Initial Data Fetch ---
  useEffect(() => {
    getCategories();
    document.title = "Add Service - SRV Provider";
  }, [getCategories]);

  useEffect(() => {
    if (categories.length > 0 && !formData.categoryId) {
      const defaultCategory = categories.find(
        (cat: ServiceCategory) => !cat.parentId,
      );
      if (defaultCategory) {
        setFormData((prev) => ({ ...prev, categoryId: defaultCategory.id }));
      }
    }
  }, [categories, formData.categoryId]);

  // Fetch commission quotes when reaching the review step
  useEffect(() => {
    if (currentStep === 4) {
      fetchCommissionQuotes();
    }
  }, [currentStep, fetchCommissionQuotes]);

  // --- Validation for Each Step ---
  const validateCurrentStep = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {};
    switch (currentStep) {
      case 1: // Service Details
        if (!formData.serviceOfferingTitle.trim()) {
          errors.serviceOfferingTitle = "Service title is required";
        } else if (
          formData.serviceOfferingTitle.length <
          VALIDATION_LIMITS.MIN_TITLE_LENGTH
        ) {
          errors.serviceOfferingTitle = `Service title must be at least ${VALIDATION_LIMITS.MIN_TITLE_LENGTH} characters`;
        } else if (
          formData.serviceOfferingTitle.length >
          VALIDATION_LIMITS.MAX_TITLE_LENGTH
        ) {
          errors.serviceOfferingTitle = `Service title must be no more than ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} characters`;
        } else if (filter.isProfane(formData.serviceOfferingTitle)) {
          errors.serviceOfferingTitle =
            "Service title contains inappropriate language.";
        } else {
          // Check for duplicate service titles (case-insensitive, trimmed)
          const trimmedTitle = formData.serviceOfferingTitle
            .trim()
            .toLowerCase();
          const isDuplicate = userServices.some(
            (service) => service.title.trim().toLowerCase() === trimmedTitle,
          );
          if (isDuplicate) {
            errors.serviceOfferingTitle =
              "You already have a service with this title. Please choose a different name.";
          }
        }
        if (!formData.categoryId) {
          errors.categoryId = "Please select a category";
        }
        // Category must be selected
        // (custom "Other" categories were removed)
        if (formData.servicePackages.length === 0) {
          errors.servicePackages = "At least one service package is required";
        } else {
          const hasValidPackage = formData.servicePackages.some(
            (pkg) =>
              pkg.name.trim() &&
              pkg.description.trim() &&
              pkg.price &&
              Number(pkg.price) >= VALIDATION_LIMITS.MIN_PRICE &&
              Number(pkg.price) <= VALIDATION_LIMITS.MAX_PRICE,
          );
          if (!hasValidPackage) {
            errors.servicePackages =
              "At least one complete package with valid price is required";
          }
          formData.servicePackages.forEach((pkg, index) => {
            if (pkg.name.trim() || pkg.description.trim() || pkg.price) {
              if (!pkg.name.trim()) {
                errors.servicePackages = `Package ${index + 1}: Name is required`;
              } else if (pkg.name.length < VALIDATION_LIMITS.MIN_TITLE_LENGTH) {
                errors.servicePackages = `Package ${index + 1}: Name must be at least ${VALIDATION_LIMITS.MIN_TITLE_LENGTH} character`;
              } else if (pkg.name.length > VALIDATION_LIMITS.MAX_TITLE_LENGTH) {
                errors.servicePackages = `Package ${index + 1}: Name must be no more than ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} characters`;
              } else if (filter.isProfane(pkg.name)) {
                errors.servicePackages = `Package ${index + 1}: Name contains inappropriate language.`;
              }
              if (!pkg.description.trim()) {
                errors.servicePackages = `Package ${index + 1}: Description is required`;
              } else if (
                pkg.description.length <
                VALIDATION_LIMITS.MIN_DESCRIPTION_LENGTH
              ) {
                errors.servicePackages = `Package ${index + 1}: Description must be at least ${VALIDATION_LIMITS.MIN_DESCRIPTION_LENGTH} character`;
              } else if (
                pkg.description.length >
                VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH
              ) {
                errors.servicePackages = `Package ${index + 1}: Description must be no more than ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} characters`;
              } else if (filter.isProfane(pkg.description)) {
                errors.servicePackages = `Package ${index + 1}: Description contains inappropriate language.`;
              }
              if (
                !pkg.price ||
                Number(pkg.price) < VALIDATION_LIMITS.MIN_PRICE
              ) {
                errors.servicePackages = `Package ${index + 1}: Price must be at least ₱${VALIDATION_LIMITS.MIN_PRICE}`;
              } else if (Number(pkg.price) > VALIDATION_LIMITS.MAX_PRICE) {
                errors.servicePackages = `Package ${index + 1}: Price must be no more than ₱${VALIDATION_LIMITS.MAX_PRICE.toLocaleString()}`;
              }
            }
          });

          // Check for duplicate package names
          const packageNames = formData.servicePackages
            .filter((pkg) => pkg.name.trim())
            .map((pkg) => pkg.name.trim().toLowerCase());

          const duplicateNames = packageNames.filter(
            (name, index) => packageNames.indexOf(name) !== index,
          );

          if (duplicateNames.length > 0) {
            const duplicateName = duplicateNames[0];
            const duplicateIndices = formData.servicePackages
              .map((pkg, index) =>
                pkg.name.trim().toLowerCase() === duplicateName
                  ? index + 1
                  : null,
              )
              .filter((index) => index !== null);

            errors.servicePackages = `Package names must be unique. "${formData.servicePackages.find((pkg) => pkg.name.trim().toLowerCase() === duplicateName)?.name.trim()}" is used in packages ${duplicateIndices.join(", ")}.`;
          }
        }
        break;
      case 2: // Availability
        if (formData.availabilitySchedule.length === 0) {
          errors.availabilitySchedule =
            "Please select at least one day of availability";
        }

        // Helper function to validate time slots
        const validateTimeSlots = (timeSlots: TimeSlotUIData[]) => {
          for (const slot of timeSlots) {
            // Check if all fields are filled
            if (
              !slot.startHour ||
              !slot.startMinute ||
              !slot.endHour ||
              !slot.endMinute
            ) {
              return "Please complete all time slot fields";
            }

            // Check if start and end times are the same
            const convertTo24Hour = (
              hour: string,
              minute: string,
              period: "AM" | "PM",
            ) => {
              let hour24 = parseInt(hour, 10);
              if (period === "PM" && hour24 !== 12) {
                hour24 += 12;
              } else if (period === "AM" && hour24 === 12) {
                hour24 = 0;
              }
              return hour24 * 60 + parseInt(minute, 10); // Convert to minutes for comparison
            };

            const startMinutes = convertTo24Hour(
              slot.startHour,
              slot.startMinute,
              slot.startPeriod,
            );
            const endMinutes = convertTo24Hour(
              slot.endHour,
              slot.endMinute,
              slot.endPeriod,
            );

            // Critical validation: Start and end times cannot be identical
            if (startMinutes === endMinutes) {
              return "⚠️ Start and end times cannot be the same";
            }

            if (startMinutes >= endMinutes) {
              return "⚠️ Start time must be before end time";
            }
          }
          return null;
        };

        if (formData.useSameTimeForAllDays) {
          if (formData.commonTimeSlots.length === 0) {
            errors.timeSlots = "Please add at least one time slot";
          } else {
            const validationError = validateTimeSlots(formData.commonTimeSlots);
            if (validationError) {
              errors.timeSlots = validationError;
            }
          }
        } else {
          const hasTimeSlots = formData.availabilitySchedule.some(
            (day) =>
              formData.perDayTimeSlots[day] &&
              formData.perDayTimeSlots[day].length > 0,
          );
          if (!hasTimeSlots) {
            errors.timeSlots = "Please add time slots for your available days";
          } else {
            // Validate all per-day time slots
            for (const day of formData.availabilitySchedule) {
              const daySlots = formData.perDayTimeSlots[day] || [];
              if (daySlots.length > 0) {
                const validationError = validateTimeSlots(daySlots);
                if (validationError) {
                  errors.timeSlots = `${day}: ${validationError}`;
                  break;
                }
              }
            }
          }
        }
        break;
      case 3: // Location
        // Accept either GPS coordinates OR a complete manual address
        const hasGPSCoordinates =
          formData.locationLatitude && formData.locationLongitude;
        const hasManualProvince = !!(formData.locationProvince || "")
          .toString()
          .trim();
        const hasManualCity = !!(formData.locationMunicipalityCity || "")
          .toString()
          .trim();
        // Only province and city are required for manual input in this flow

        if (!hasGPSCoordinates) {
          // When GPS is unavailable, require only Province and Municipality/City
          if (!hasManualProvince) {
            errors.locationMunicipalityCity = "Province is required";
          } else if (!hasManualCity) {
            errors.locationMunicipalityCity = "Municipality/City is required";
          }
        }
        break;
      case 4: // Image Upload
        if (isProcessingImages) {
          errors.general =
            "Please wait for images to finish processing before continuing.";
          break;
        }
        if (serviceImageFiles.length > 0) {
          try {
            const imageErrors = validateImageFiles(serviceImageFiles);
            if (imageErrors.length > 0) {
              errors.general = imageErrors.join("; ");
            }
          } catch {
            errors.general =
              "Error validating images. Please try removing and re-adding them.";
          }
        }
        break;
      default:
        break;
    }
    return errors;
  }, [
    currentStep,
    formData,
    serviceImageFiles,
    validateImageFiles,
    isProcessingImages,
    userServices,
  ]);

  // --- Navigation Handlers ---
  const handleNext = () => {
    if (isProcessingImages) {
      setValidationErrors({
        general:
          "Please wait for images to finish processing before continuing.",
      });
      return;
    }
    const errors = validateCurrentStep();

    // Additional check specifically for time slot errors to ensure user cannot proceed
    if (errors.timeSlots) {
      setValidationErrors(errors);
      setScrollToErrorTrigger((prev) => prev + 1);
      return;
    }

    if (Object.keys(errors).length === 0) {
      setCurrentStep((prev) => prev + 1);
      setValidationErrors({});
    } else {
      setValidationErrors(errors);
      setScrollToErrorTrigger((prev) => prev + 1);
    }
  };

  const handleBack = () => setCurrentStep((prev) => prev - 1);

  // --- Time Slot Conversion for Backend ---
  const convertTimeSlot = (slot: TimeSlotUIData) => {
    const convertTo24Hour = (
      hour: string,
      minute: string,
      period: "AM" | "PM",
    ) => {
      let hour24 = parseInt(hour, 10);
      if (period === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (period === "AM" && hour24 === 12) {
        hour24 = 0;
      }
      return `${hour24.toString().padStart(2, "0")}:${minute}`;
    };
    return {
      startTime: convertTo24Hour(
        slot.startHour,
        slot.startMinute,
        slot.startPeriod,
      ),
      endTime: convertTo24Hour(slot.endHour, slot.endMinute, slot.endPeriod),
    };
  };

  // --- Service Submission Handler ---
  const handleSubmit = async () => {
    const errors = validateCurrentStep();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setIsSubmitting(true);
    setValidationErrors({});
    toast.loading("Creating your service...", { id: "create-service" });
    try {
      let location;
      if (formData.locationAddress && formData.locationAddress.trim()) {
        let city = formData.locationMunicipalityCity?.trim() || "N/A";
        let state = formData.locationProvince?.trim() || "N/A";
        let postalCode = formData.locationPostalCode?.trim() || "0000";
        let address = formData.locationAddress?.trim() || "N/A";
        location = {
          latitude:
            formData.locationLatitude && formData.locationLatitude.trim() !== ""
              ? parseFloat(formData.locationLatitude)
              : 14.676,
          longitude:
            formData.locationLongitude &&
            formData.locationLongitude.trim() !== ""
              ? parseFloat(formData.locationLongitude)
              : 120.9822,
          address,
          city,
          state,
          country: formData.locationCountry || "Philippines",
          postalCode,
        };
      } else {
        let city = formData.locationMunicipalityCity?.trim() || "N/A";
        let state = formData.locationProvince?.trim() || "N/A";
        let postalCode = formData.locationPostalCode?.trim() || "0000";
        let address =
          [
            formData.locationHouseNumber?.trim() || "",
            formData.locationStreet?.trim() || "",
            formData.locationBarangay?.trim() || "",
          ]
            .filter(Boolean)
            .join(", ") || "N/A";
        location = {
          latitude:
            formData.locationLatitude && formData.locationLatitude.trim() !== ""
              ? parseFloat(formData.locationLatitude)
              : 14.676,
          longitude:
            formData.locationLongitude &&
            formData.locationLongitude.trim() !== ""
              ? parseFloat(formData.locationLongitude)
              : 120.9822,
          address,
          city,
          state,
          country: formData.locationCountry || "Philippines",
          postalCode,
        };
      }
      const weeklySchedule = formData.availabilitySchedule.map((day) => ({
        day,
        availability: {
          isAvailable: true,
          slots: formData.useSameTimeForAllDays
            ? formData.commonTimeSlots.map(convertTimeSlot)
            : (formData.perDayTimeSlots[day] || []).map(convertTimeSlot),
        },
      }));
      let processedServiceImages:
        | Array<{
            fileName: string;
            contentType: string;
            fileData: Uint8Array;
          }>
        | undefined;

      // Ensure we process images even if the in-memory state is empty
      // (covers the case where user restored from IDB but state wasn't populated yet)
      let filesToProcess: File[] = serviceImageFiles;
      if (
        (!filesToProcess || filesToProcess.length === 0) &&
        typeof getFilesEntries === "function"
      ) {
        try {
          const imgEntries = await getFilesEntries(
            ADD_SERVICE_DRAFT_KEY,
            "img",
          );
          if (imgEntries && imgEntries.length > 0) {
            filesToProcess = imgEntries.map((e: any, i: number) => {
              const name = e.name || `draft-img-${i}`;
              const type =
                e.type ||
                (e.blob && (e.blob as Blob).type) ||
                "application/octet-stream";
              const lastModified = e.lastModified || Date.now();
              return new File([e.blob], name, { type, lastModified });
            });
            // also set local state so UI reflects restored files
            setServiceImageFiles(filesToProcess);
            setImagePreviews(
              imgEntries.map((e: any) => URL.createObjectURL(e.blob)),
            );
          }
        } catch (err) {
          // ignore
        }
      }

      if (filesToProcess && filesToProcess.length > 0) {
        try {
          processedServiceImages =
            await processImageFilesForService(filesToProcess);
        } catch {
          processedServiceImages = undefined;
        }
      }
      let processedServiceCertificates:
        | Array<{
            fileName: string;
            contentType: string;
            fileData: Uint8Array;
          }>
        | undefined;
      if (certificationFiles.length > 0) {
        try {
          processedServiceCertificates =
            await processServiceCertificateFiles(certificationFiles);
        } catch {
          processedServiceCertificates = undefined;
        }
      }
      const serviceRequest: ServiceCreateRequest = {
        title: formData.serviceOfferingTitle.trim(),
        description: `${formData.serviceOfferingTitle.trim()}`,
        categoryId: formData.categoryId,
        price: Math.min(
          ...formData.servicePackages.map((pkg) => Number(pkg.price)),
        ),
        location,
        weeklySchedule,
        instantBookingEnabled: true,
        bookingNoticeHours: 2,
        maxBookingsPerDay: 10,
        serviceImages: processedServiceImages,
        serviceCertificates: processedServiceCertificates,
      };
      const newService = await createService(serviceRequest);
      const packagePromises = formData.servicePackages
        .filter((pkg) => pkg.name.trim() && pkg.description.trim() && pkg.price)
        .map((pkg) =>
          createPackage({
            serviceId: newService.id,
            title: pkg.name.trim(),
            description: pkg.description.trim(),
            price: Number(pkg.price),
          }),
        );
      await Promise.all(packagePromises);
      toast.success("Service created successfully!", { id: "create-service" });
      setServiceCreated(true);
      // Clear saved draft now that service is created
      try {
        localStorage.removeItem(ADD_SERVICE_DRAFT_KEY);
        await deleteDraftFromIDB(ADD_SERVICE_DRAFT_KEY);
      } catch {}
      navigate(`/provider/service-details/${newService.id}`, { replace: true });
    } catch (error) {
      let userFriendlyMessage = "Failed to create service. Please try again.";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Handle file size errors
        if (errorMsg.includes("file size") && errorMsg.includes("exceeds maximum")) {
          if (errorMsg.includes("servicecertificate")) {
            userFriendlyMessage = "One or more certification files are too large. Please ensure each certification file is under 450 KB.";
          } else if (errorMsg.includes("serviceimage")) {
            userFriendlyMessage = "One or more service images are too large. Please compress your images and try again.";
          } else {
            userFriendlyMessage = "One or more files are too large. Please reduce the file size and try again.";
          }
        }
        // Handle unsupported file type errors
        else if (errorMsg.includes("unsupported content type")) {
          userFriendlyMessage = "One or more files have an unsupported format. Please use PNG, JPEG, or GIF images only.";
        }
        // Handle network/timeout errors
        else if (errorMsg.includes("network") || errorMsg.includes("timeout")) {
          userFriendlyMessage = "Network error. Please check your connection and try again.";
        }
        // Handle authentication errors
        else if (errorMsg.includes("unauthenticated") || errorMsg.includes("permission")) {
          userFriendlyMessage = "You don't have permission to perform this action. Please sign in again.";
        }
        // Default to original error message if it's user-friendly enough
        else if (error.message.length < 100 && !errorMsg.includes("internal")) {
          userFriendlyMessage = error.message;
        }
      }
      
      setValidationErrors({ general: userFriendlyMessage });
      toast.error(userFriendlyMessage, { id: "create-service" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Input Handlers ---
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePackageChange = (
    index: number,
    field: string,
    value: string | boolean,
  ) => {
    setFormData((prev) => {
      const servicePackages = [...prev.servicePackages];
      servicePackages[index] = { ...servicePackages[index], [field]: value };
      return { ...prev, servicePackages };
    });
  };

  const addPackage = () => {
    setFormData((prev) => ({
      ...prev,
      servicePackages: [
        ...prev.servicePackages,
        {
          id: nanoid(),
          name: "",
          description: "",
          price: "",
          currency: "PHP",
          isPopular: false,
        },
      ],
    }));
  };

  const removePackage = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      servicePackages: prev.servicePackages.filter((p) => p.id !== id),
    }));
  };

  // removed optional custom category handling

  // --- Step Renderer ---
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Service Details Step
        return (
          <ServiceDetails
            formData={formData}
            categories={categories}
            loadingCategories={loadingCategories}
            // provide the commission computation function so ServiceDetails can
            // calculate commission/total live as the user types
            computeCommission={getCommissionQuote}
            onCommissionComputed={(pkgId, quote) =>
              setCommissionQuotes((prev) => ({ ...prev, [pkgId]: quote }))
            }
            handleChange={handleChange}
            handlePackageChange={handlePackageChange}
            addPackage={addPackage}
            removePackage={removePackage}
            validationErrors={validationErrors}
            scrollToErrorTrigger={scrollToErrorTrigger}
          />
        );
      case 2:
        // Availability Step
        return (
          <ServiceAvailability
            formData={formData}
            setFormData={setFormData}
            validationErrors={validationErrors}
          />
        );
      case 3:
        // Location Step
        return (
          <ServiceLocation
            formData={formData}
            setFormData={setFormData}
            validationErrors={validationErrors}
          />
        );
      case 4:
        // Image Upload Step
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Upload Service Images & Certifications
              </h2>
              <p className="mb-6 text-gray-600">
                Add images of your past work and upload certifications. This
                step is optional but highly recommended.
              </p>
            </div>
            {validationErrors.general && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center">
                  <svg
                    className="mr-2 h-5 w-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-700">
                    {validationErrors.general}
                  </p>
                </div>
              </div>
            )}
            <ServiceImageUpload
              serviceImageFiles={serviceImageFiles}
              imagePreviews={imagePreviews}
              handleImageFilesChange={handleImageFilesChange}
              handleRemoveImage={handleRemoveImage}
              certificationFiles={certificationFiles}
              certificationPreviews={certificationPreviews}
              handleCertificationFilesChange={handleCertificationFilesChange}
              handleRemoveCertification={handleRemoveCertification}
            />
          </div>
        );
      case 5:
        // Review & Submit Step - extracted to ReviewSubmit component
        return (
          <ReviewSubmit
            formData={formData}
            categories={categories}
            commissionQuotes={commissionQuotes}
            loadingCommissions={loadingCommissions}
            serviceImageFiles={serviceImageFiles}
            imagePreviews={imagePreviews}
            certificationFiles={certificationFiles}
            certificationPreviews={certificationPreviews}
            validationErrors={validationErrors}
          />
        );
      default:
        return <div>Review and Submit</div>;
    }
  };

  // --- Main Page Layout ---
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 pb-12">
      <Toaster position="top-center" />

      <ServiceDrafts
        ref={serviceDraftsRef}
        formData={formData}
        setFormData={setFormData}
        serviceImageFiles={serviceImageFiles}
        setServiceImageFiles={setServiceImageFiles}
        imagePreviews={imagePreviews}
        setImagePreviews={setImagePreviews}
        certificationFiles={certificationFiles}
        setCertificationFiles={setCertificationFiles}
        certificationPreviews={certificationPreviews}
        setCertificationPreviews={setCertificationPreviews}
        commissionQuotes={commissionQuotes}
        setCommissionQuotes={setCommissionQuotes}
        initialServiceState={initialServiceState}
        navigate={navigate}
      />
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex max-w-4xl items-center px-3.5 py-2.5 md:ml-20 lg:ml-20">
          <button
            onClick={handleHeaderBack}
            className="mr-2 rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-md font-extrabold tracking-tight text-black sm:text-xl lg:text-2xl">
            Add New Service (Step {currentStep}/5)
          </h1>
        </div>
      </header>
      {/* Draft UI & logic moved into ServiceDrafts (renders modals and banner) */}
      {/* Main Content */}
      <main className="container mx-auto flex-grow px-4 pb-24 pt-4 sm:p-6">
        <div className="mt-20 sm:rounded-xl sm:bg-white sm:p-8 sm:shadow-lg">
          {renderStep()}
        </div>
        {/* Navigation Buttons */}
        <div className="mb-8 mt-6 flex justify-between">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="rounded-md bg-gray-200 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              Back
            </button>
          )}
          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              disabled={isSubmitting || isProcessingImages}
              className="ml-auto rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessingImages ? "Processing Images..." : "Next"}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isProcessingImages}
              className="ml-auto flex items-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                  Creating Service...
                </>
              ) : isProcessingImages ? (
                "Processing Images..."
              ) : (
                "Create Service"
              )}
            </button>
          )}
        </div>
      </main>
      <BottomNavigation onNavigateAttempt={handleNavigateAttempt} />
    </div>
  );
};

export default AddServicePage;
