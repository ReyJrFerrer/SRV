import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { nanoid } from "nanoid";
import { Filter } from "bad-words";
import { Toaster, toast } from "sonner";
import BottomNavigation from "../../../components/provider/BottomNavigation";
import {
  saveFilesToIDB,
  getFilesFromIDB,
  getFilesEntries,
  deleteDraftFromIDB,
} from "../../../utils/draftStorage";

// Step Components
import ServiceDetails from "../../../components/provider/add service/ServiceDetails";
import ServiceAvailability from "../../../components/provider/add service/ServiceAvailability";
import ServiceLocation from "../../../components/provider/add service/ServiceLocation";
import ServiceImageUpload from "../../../components/provider/add service/ServiceImageUpload";

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

  // Local draft autosave key
  const ADD_SERVICE_DRAFT_KEY = "add_service_draft_v1";

  // --- Draft UX state ---
  const [loadedDraft, setLoadedDraft] = useState<any | null>(null);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // --- Detect draft on mount but DO NOT auto-restore ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADD_SERVICE_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft) {
        setLoadedDraft(draft);
        setDraftAvailable(true);
        setShowRestorePrompt(true);
      }
    } catch (e) {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave of draft (do NOT try to save File objects)
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        const toSave = {
          formData: {
            // only save serializable fields from formData to avoid large blobs
            ...formData,
            // strip fields that may contain non-serializable objects just in case
          },
          imagePreviews: imagePreviews || [],
          certificationPreviews: certificationPreviews || [],
          commissionQuotes: commissionQuotes || {},
        };
        localStorage.setItem(ADD_SERVICE_DRAFT_KEY, JSON.stringify(toSave));
      } catch (e) {
        // ignore quota errors
      }
    }, 700);
    return () => clearTimeout(handler);
  }, [formData, imagePreviews, certificationPreviews, commissionQuotes]);

  // Helper: save draft including file blobs to IndexedDB
  const saveDraftIncludingFiles = async () => {
    setIsSavingDraft(true);
    try {
      const toSave = {
        formData: { ...formData },
        // previews are already serializable
        imagePreviews: imagePreviews || [],
        certificationPreviews: certificationPreviews || [],
        commissionQuotes: commissionQuotes || {},
      };
      localStorage.setItem(ADD_SERVICE_DRAFT_KEY, JSON.stringify(toSave));

      // Save files to IDB so previews can persist across sessions
      if (serviceImageFiles && serviceImageFiles.length > 0) {
        await saveFilesToIDB(ADD_SERVICE_DRAFT_KEY, serviceImageFiles, "img");
      }
      if (certificationFiles && certificationFiles.length > 0) {
        await saveFilesToIDB(ADD_SERVICE_DRAFT_KEY, certificationFiles, "cert");
      }
      toast.success("Draft saved");
    } catch (e) {
      console.error("Failed to save draft:", e);
      toast.error("Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const clearDraftCompletely = async () => {
    try {
      localStorage.removeItem(ADD_SERVICE_DRAFT_KEY);
      await deleteDraftFromIDB(ADD_SERVICE_DRAFT_KEY);
    } catch (e) {}
    setLoadedDraft(null);
    setDraftAvailable(false);
    setShowRestorePrompt(false);
  };

  const handleRestoreDraft = async () => {
    if (!loadedDraft) return;
    try {
      if (loadedDraft.formData)
        setFormData((prev) => ({ ...prev, ...loadedDraft.formData }));
      // Try to load files from IDB (will fall back to previews stored in localStorage)
      try {
        const imgUrls = await getFilesFromIDB(ADD_SERVICE_DRAFT_KEY, "img");
        const certUrls = await getFilesFromIDB(ADD_SERVICE_DRAFT_KEY, "cert");
        if (imgUrls && imgUrls.length > 0) setImagePreviews(imgUrls);
        else if (loadedDraft.imagePreviews)
          setImagePreviews(loadedDraft.imagePreviews);
        if (certUrls && certUrls.length > 0) setCertificationPreviews(certUrls);
        else if (loadedDraft.certificationPreviews)
          setCertificationPreviews(loadedDraft.certificationPreviews);

        // Reconstruct File objects from IDB entries so submission works
        try {
          const imgEntries = await getFilesEntries(
            ADD_SERVICE_DRAFT_KEY,
            "img",
          );
          if (imgEntries && imgEntries.length > 0) {
            // set previews from blobs (preserve order)
            setImagePreviews(
              imgEntries.map((e) => URL.createObjectURL(e.blob)),
            );
            const restoredImgFiles = imgEntries.map((e, i) => {
              const name = e.name || `draft-img-${i}`;
              const type =
                e.type ||
                (e.blob && (e.blob as Blob).type) ||
                "application/octet-stream";
              const lastModified = e.lastModified || Date.now();
              return new File([e.blob], name, { type, lastModified });
            });
            if (restoredImgFiles.length > 0)
              setServiceImageFiles(restoredImgFiles);
          }

          const certEntries = await getFilesEntries(
            ADD_SERVICE_DRAFT_KEY,
            "cert",
          );
          if (certEntries && certEntries.length > 0) {
            setCertificationPreviews(
              certEntries.map((e) => URL.createObjectURL(e.blob)),
            );
            const restoredCertFiles = certEntries.map((e, i) => {
              const name = e.name || `draft-cert-${i}`;
              const type =
                e.type ||
                (e.blob && (e.blob as Blob).type) ||
                "application/octet-stream";
              const lastModified = e.lastModified || Date.now();
              return new File([e.blob], name, { type, lastModified });
            });
            if (restoredCertFiles.length > 0)
              setCertificationFiles(restoredCertFiles);
          }
        } catch (err) {
          // ignore file reconstruction errors
        }
      } catch (e) {
        // fallback to stored previews
        if (loadedDraft.imagePreviews)
          setImagePreviews(loadedDraft.imagePreviews);
        if (loadedDraft.certificationPreviews)
          setCertificationPreviews(loadedDraft.certificationPreviews);
      }
      if (loadedDraft.commissionQuotes)
        setCommissionQuotes(loadedDraft.commissionQuotes);
    } catch (e) {
      // ignore
    }
    setShowRestorePrompt(false);
    setDraftAvailable(false);
    setLoadedDraft(null);
  };

  const handleDiscardDraft = async () => {
    await clearDraftCompletely();
    setShowRestorePrompt(false);
  };

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
      setShowExitPrompt(true);
      return;
    }
    // otherwise just go back a step
    handleBack();
  };

  const handleSaveDraftAndExit = async () => {
    setShowExitPrompt(false);
    await saveDraftIncludingFiles();
    navigate(-1);
  };

  const handleDontSaveAndExit = async () => {
    setShowExitPrompt(false);
    await clearDraftCompletely();
    navigate(-1);
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
            filesToProcess = imgEntries.map((e, i) => {
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
              imgEntries.map((e) => URL.createObjectURL(e.blob)),
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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create service";
      setValidationErrors({ general: errorMessage });
      toast.error("Failed to create service.", { id: "create-service" });
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

  // --- Placeholder for category request ---
  const onRequestCategory = useCallback((_categoryName: string) => {}, []);

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
            handleChange={handleChange}
            handlePackageChange={handlePackageChange}
            addPackage={addPackage}
            removePackage={removePackage}
            validationErrors={validationErrors}
            onRequestCategory={onRequestCategory}
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
        // Review & Submit Step
        return (
          <div className="flex flex-col items-center space-y-8">
            <div className="w-full max-w-3xl rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-10 shadow-2xl">
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 shadow">
                  <svg
                    className="h-8 w-8 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="mb-2 text-3xl font-extrabold text-blue-900">
                  Review &amp; Submit
                </h2>
                <p className="text-lg text-gray-600">
                  Please review your service details before submitting.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <path d="M8 9h8M8 13h6" strokeLinecap="round" />
                    </svg>
                    <h3 className="font-semibold text-gray-800">
                      Service Title
                    </h3>
                  </div>
                  <p className="break-words text-lg font-semibold text-blue-800">
                    {formData.serviceOfferingTitle}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M7 7a2 2 0 114 0 2 2 0 01-4 0z" />
                      <path d="M3 11V7a2 2 0 012-2h4l10 10a2 2 0 010 2.83l-4.17 4.17a2 2 0 01-2.83 0L3 11z" />
                    </svg>
                    <h3 className="font-semibold text-gray-800">Category</h3>
                  </div>
                  <p className="break-words text-lg font-semibold text-blue-800">
                    {categories.find((cat) => cat.id === formData.categoryId)
                      ?.name || "Unknown"}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-5 shadow-sm md:col-span-2">
                  <div className="mb-4 flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="7" width="18" height="13" rx="2" />
                      <path d="M16 3v4M8 3v4M3 7h18" />
                    </svg>
                    <h3 className="font-semibold text-gray-800">Packages</h3>
                  </div>
                  <div className="space-y-2">
                    {formData.servicePackages
                      .filter(
                        (pkg) =>
                          pkg.name.trim() &&
                          pkg.description.trim() &&
                          pkg.price,
                      )
                      .map((pkg) => {
                        const commissionQuote = commissionQuotes[pkg.id];
                        return (
                          <div
                            key={pkg.id}
                            className="flex flex-col break-words rounded border bg-gray-50 p-3 md:flex-row md:items-start md:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-blue-900">
                                {pkg.name}
                              </p>
                              <p className="break-words text-sm text-gray-600">
                                {pkg.description}
                              </p>
                            </div>
                            <div className="mt-2 text-right md:mt-0">
                              <p className="text-lg font-semibold text-green-600">
                                ₱{Number(pkg.price).toLocaleString()}
                              </p>
                              {loadingCommissions && (
                                <p className="text-xs text-gray-500">
                                  Loading commission...
                                </p>
                              )}
                              {commissionQuote && (
                                <div className="mt-1 text-base text-gray-600">
                                  <p>
                                    Commission: ₱
                                    {commissionQuote.commissionFee.toLocaleString()}
                                  </p>
                                  <p className="font-medium text-blue-600">
                                    Total: ₱
                                    {(
                                      Number(pkg.price) +
                                      commissionQuote.commissionFee
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M16 3v2M8 3v2M3 9h18" />
                    </svg>
                    <h3 className="font-semibold text-gray-800">
                      Availability
                    </h3>
                  </div>
                  <div className="font-medium text-blue-900">
                    {formData.availabilitySchedule.join(", ")}
                  </div>
                  {formData.availabilitySchedule.length > 0 && (
                    <span className="mt-1 block text-sm text-gray-500">
                      {formData.useSameTimeForAllDays
                        ? `Same hours for all days (${formData.commonTimeSlots.length} time slot${
                            formData.commonTimeSlots.length > 1 ? "s" : ""
                          })`
                        : "Custom hours per day"}
                    </span>
                  )}
                </div>
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 21c-4.418 0-8-4.03-8-9a8 8 0 1116 0c0 4.97-3.582 9-8 9z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <h3 className="font-semibold text-gray-800">Location</h3>
                  </div>
                  <div className="break-words font-medium text-blue-900">
                    {[
                      formData.locationMunicipalityCity,
                      formData.locationProvince,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              </div>
              {/* Service Images Preview */}
              {(serviceImageFiles.length > 0 || imagePreviews.length > 0) && (
                <div className="mt-10">
                  <div className="mb-2 flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="8.5" cy="12.5" r="1.5" />
                      <path d="M21 19l-5.5-7-4.5 6-3-4-4 5" />
                    </svg>
                    <h3 className="font-semibold text-gray-800">
                      Service Images
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {serviceImageFiles.length > 0
                      ? serviceImageFiles.map((file, idx) => (
                          <div
                            key={file.name + idx}
                            className="flex aspect-square items-center justify-center overflow-hidden rounded border border-gray-200 bg-white"
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Service Image ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))
                      : imagePreviews.map((previewUrl, idx) => (
                          <div
                            key={previewUrl}
                            className="flex aspect-square items-center justify-center overflow-hidden rounded border border-gray-200 bg-white"
                          >
                            <img
                              src={previewUrl}
                              alt={`Service Image ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                  </div>
                </div>
              )}
              {/* Certifications Preview */}
              {(certificationFiles?.length > 0 ||
                certificationPreviews?.length > 0) && (
                <div className="mt-10">
                  <div className="mb-2 flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-yellow-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M8.21 13.89l-2.39 2.39a2 2 0 002.83 2.83l2.39-2.39m2.36-2.36l2.39 2.39a2 2 0 002.83-2.83l-2.39-2.39" />
                    </svg>
                    <h3 className="font-semibold text-yellow-700">
                      Certifications
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {certificationFiles && certificationFiles.length > 0
                      ? certificationFiles.map((file, idx) => {
                          const isPdf =
                            file.type === "application/pdf" ||
                            file.name.endsWith(".pdf");
                          const src = URL.createObjectURL(file);
                          return (
                            <div
                              key={file.name + idx}
                              className="flex aspect-square items-center justify-center overflow-hidden rounded border border-yellow-200 bg-white"
                            >
                              {isPdf ? (
                                <iframe
                                  src={src}
                                  title={`Certification PDF ${idx + 1}`}
                                  className="h-full w-full rounded bg-gray-100"
                                  style={{
                                    minHeight: 0,
                                    minWidth: 0,
                                    border: "none",
                                  }}
                                />
                              ) : (
                                <img
                                  src={src}
                                  alt={`Certification ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                          );
                        })
                      : certificationPreviews?.map((previewUrl, idx) => (
                          <div
                            key={previewUrl}
                            className="flex aspect-square items-center justify-center overflow-hidden rounded border border-yellow-200 bg-white"
                          >
                            {previewUrl.endsWith(".pdf") ? (
                              <iframe
                                src={previewUrl}
                                title={`Certification PDF ${idx + 1}`}
                                className="h-full w-full rounded bg-gray-100"
                                style={{
                                  minHeight: 0,
                                  minWidth: 0,
                                  border: "none",
                                }}
                              />
                            ) : (
                              <img
                                src={previewUrl}
                                alt={`Certification ${idx + 1}`}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                  </div>
                </div>
              )}
              {/* Error Display */}
              {validationErrors.general && (
                <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-600">
                    {validationErrors.general}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <div>Review and Submit</div>;
    }
  };

  // --- Main Page Layout ---
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 pb-12">
      <Toaster position="top-center" />

      {/* Restore Draft Modal */}
      {showRestorePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-bold">Restore draft?</h2>
            <p className="mb-4 text-sm text-gray-600">
              We found a saved draft for your service. Would you like to restore
              your progress now?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRestorePrompt(false)}
                className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardDraft}
                className="rounded-md border px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Discard
              </button>
              <button
                onClick={handleRestoreDraft}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Restore draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit (Save Draft) Modal */}
      {showExitPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-bold">Save draft?</h2>
            <p className="mb-4 text-sm text-gray-600">
              You haven't finished creating this service. Would you like to save
              your current progress as a draft?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExitPrompt(false)}
                className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDontSaveAndExit}
                className="rounded-md border px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Don't Save
              </button>
              <button
                onClick={handleSaveDraftAndExit}
                disabled={isSavingDraft}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingDraft ? "Saving..." : "Save Draft & Exit"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex max-w-4xl items-center px-4 py-3 lg:ml-20">
          <button
            onClick={handleHeaderBack}
            className="mr-2 rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-black sm:text-xl md:text-2xl">
            Add New Service (Step {currentStep}/5)
          </h1>
        </div>
      </header>
      {/* Draft available banner (uses draftAvailable state so it's not unused) */}
      {draftAvailable && !showRestorePrompt && (
        <div className="fixed left-0 right-0 top-16 z-40 flex justify-center">
          <div className="mx-4 flex w-full max-w-4xl items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium text-yellow-800">
                A saved draft for this service is available.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDiscardDraft}
                className="rounded-md border px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                Discard
              </button>
              <button
                onClick={handleRestoreDraft}
                className="rounded-md bg-yellow-600 px-3 py-1 text-sm font-medium text-white hover:bg-yellow-700"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
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
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              Back
            </button>
          )}
          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              disabled={isSubmitting || isProcessingImages}
              className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessingImages ? "Processing Images..." : "Next"}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isProcessingImages}
              className="ml-auto flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
      <BottomNavigation />
    </div>
  );
};

export default AddServicePage;
