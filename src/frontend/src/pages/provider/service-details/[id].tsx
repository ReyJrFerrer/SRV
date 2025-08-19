import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  CalendarDaysIcon,
  TagIcon,
  BriefcaseIcon,
  LockClosedIcon,
  LockOpenIcon,
  CheckIcon, // For save button
  XMarkIcon, // For cancel button
  PhotoIcon, // For service images
  AcademicCapIcon, // For certifications
  PlusCircleIcon, // For adding time slots
  MinusCircleIcon, // For removing time slots
  PlusIcon, // For adding packages
  DocumentIcon,
} from "@heroicons/react/24/solid";
import {
  useServiceManagement,
  EnhancedService,
  DayOfWeek,
  DayAvailability,
  TimeSlot,
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
import ViewReviewsButton from "../../../components/common/ViewReviewsButton";
import useProviderBookingManagement from "../../../hooks/useProviderBookingManagement";
import { Toaster, toast } from "sonner";
import { Dialog } from "@headlessui/react"; // Add this import for modal dialog

// Helper to check if a file is a PDF based on its URL or filename

// Simple Tooltip component for validation messages
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  disabled = false,
}) => {
  if (disabled) {
    // Only render tooltip if not disabled
    return (
      <div className="group relative">
        {children}
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform rounded-lg bg-gray-800 px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 transform border-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

interface WeeklyScheduleEntry {
  day: DayOfWeek;
  availability: DayAvailability;
}

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

// **Helper function to add hours to a time string**
const addHoursToTime = (time: string, hoursToAdd: number): string => {
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10) || 0;

  hour = hour + hoursToAdd;

  // Handle hour overflow
  if (hour >= 24) {
    hour = hour % 24;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

// Availability Editor component
interface AvailabilityEditorProps {
  weeklySchedule: WeeklyScheduleEntry[];
  setWeeklySchedule: React.Dispatch<
    React.SetStateAction<WeeklyScheduleEntry[]>
  >;
}

const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({
  weeklySchedule,
  setWeeklySchedule,
}) => {
  const [templateTimeSlot, setTemplateTimeSlot] = useState<TimeSlot>({
    startTime: "09:00",
    endTime: "17:00",
  });

  // List of all days for reference
  const allDays: DayOfWeek[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const weekdays: DayOfWeek[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];
  const weekends: DayOfWeek[] = ["Sunday", "Saturday"];

  // Find days not in the current schedule
  const missingDays = allDays.filter(
    (day) => !weeklySchedule.some((entry) => entry.day === day),
  );

  // Add a missing day as unavailable
  const handleAddDay = (day: DayOfWeek) => {
    setWeeklySchedule([
      ...weeklySchedule,
      {
        day,
        availability: { isAvailable: false, slots: [] },
      },
    ]);
  };

  // Helper to set schedule to only the selected days, all available with template slot
  const setScheduleToDays = (days: DayOfWeek[]) => {
    setWeeklySchedule(
      days.map((day) => ({
        day,
        availability: {
          isAvailable: true,
          slots: [
            {
              startTime: templateTimeSlot.startTime,
              endTime: templateTimeSlot.endTime,
            },
          ],
        },
      })),
    );
  };

  const deselectAllDays = () => {
    setWeeklySchedule((prev) =>
      prev.map((day) => ({
        ...day,
        availability: {
          ...day.availability,
          isAvailable: false,
          slots: [],
        },
      })),
    );
  };

  // Sort days for display
  const sortedSchedule = [...weeklySchedule].sort(
    (a, b) =>
      allDays.indexOf(a.day as DayOfWeek) - allDays.indexOf(b.day as DayOfWeek),
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="mb-4 text-sm text-gray-600">
        Toggle availability for each day and specify time slots.
      </p>

      {/* New Time Template Section */}
      <div className="mb-4 rounded-md bg-blue-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-blue-800">
          Apply a Time Slot to Multiple Days
        </h4>
        <div className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="time"
            value={templateTimeSlot.startTime}
            onChange={(e) =>
              setTemplateTimeSlot({
                ...templateTimeSlot,
                startTime: e.target.value,
              })
            }
            className="w-full rounded-md border border-gray-300 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
          />
          <span>-</span>
          <input
            type="time"
            value={templateTimeSlot.endTime}
            onChange={(e) =>
              setTemplateTimeSlot({
                ...templateTimeSlot,
                endTime: e.target.value,
              })
            }
            className="w-full rounded-md border border-gray-300 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2">
          <button
            onClick={() => setScheduleToDays(allDays)}
            className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            Apply to All
          </button>
          <button
            onClick={() => setScheduleToDays(weekdays)}
            className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            Apply to Weekdays
          </button>
          <button
            onClick={() => setScheduleToDays(weekends)}
            className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            Apply to Weekends
          </button>
          <button
            onClick={deselectAllDays}
            className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Deselect All
          </button>
        </div>
        {missingDays.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-blue-700">
              Add a day:
            </span>
            {missingDays.map((day) => (
              <button
                key={day}
                onClick={() => handleAddDay(day)}
                className="rounded-full bg-blue-200 px-3 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300"
                type="button"
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {sortedSchedule.map((dayEntry: WeeklyScheduleEntry) => (
        <div
          key={dayEntry.day}
          id={`availability-day-${dayEntry.day}`}
          className="mb-4 rounded-md border border-gray-100 p-3"
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={dayEntry.availability.isAvailable}
                onChange={() => {
                  const newSchedule = [...weeklySchedule];
                  newSchedule[
                    weeklySchedule.findIndex((d) => d.day === dayEntry.day)
                  ] = {
                    ...dayEntry,
                    availability: {
                      ...dayEntry.availability,
                      isAvailable: !dayEntry.availability.isAvailable,
                    },
                  };
                  setWeeklySchedule(newSchedule);
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              {dayEntry.day}
            </label>
            {dayEntry.availability.isAvailable && (
              <button
                onClick={() => {
                  const idx = weeklySchedule.findIndex(
                    (d) => d.day === dayEntry.day,
                  );
                  const newSchedule = [...weeklySchedule];
                  const slots = newSchedule[idx].availability.slots;
                  let newSlot: TimeSlot;
                  if (slots.length > 0) {
                    const lastSlotEndTime = slots[slots.length - 1].endTime;
                    const newStartTime = lastSlotEndTime;
                    const newEndTime = addHoursToTime(newStartTime, 2);
                    newSlot = { startTime: newStartTime, endTime: newEndTime };
                  } else {
                    newSlot = { startTime: "09:00", endTime: "17:00" };
                  }
                  newSchedule[idx].availability.slots.push(newSlot);
                  setWeeklySchedule(newSchedule);
                }}
                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100"
                aria-label={`Add time slot for ${dayEntry.day}`}
              >
                <PlusCircleIcon className="mr-1 h-4 w-4" /> Add Slot
              </button>
            )}
          </div>

          {dayEntry.availability.isAvailable && (
            <div className="mt-3 space-y-3">
              {dayEntry.availability.slots.length > 0 ? (
                dayEntry.availability.slots.map((slot, slotIndex) => (
                  <div
                    key={slotIndex}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => {
                        const newSchedule = [...weeklySchedule];
                        newSchedule[
                          weeklySchedule.findIndex(
                            (d) => d.day === dayEntry.day,
                          )
                        ].availability.slots[slotIndex].startTime =
                          e.target.value;
                        setWeeklySchedule(newSchedule);
                      }}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <span>-</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => {
                        const newSchedule = [...weeklySchedule];
                        newSchedule[
                          weeklySchedule.findIndex(
                            (d) => d.day === dayEntry.day,
                          )
                        ].availability.slots[slotIndex].endTime =
                          e.target.value;
                        setWeeklySchedule(newSchedule);
                      }}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        const newSchedule = [...weeklySchedule];
                        newSchedule[
                          weeklySchedule.findIndex(
                            (d) => d.day === dayEntry.day,
                          )
                        ].availability.slots.splice(slotIndex, 1);
                        setWeeklySchedule(newSchedule);
                      }}
                      className="rounded-full p-1 text-red-600 hover:bg-red-100"
                      aria-label="Remove time slot"
                    >
                      <MinusCircleIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No time slots added.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

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
      alert("Service title cannot be empty.");
      return;
    }
    if (!editedCategory.trim()) {
      alert("Service category cannot be empty.");
      return;
    }

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
      toast.error("Failed to update title or category. Please try again.");
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
      alert("City cannot be empty.");
      return;
    }

    // Basic validation for time slots: start < end, no overlaps within a day (can be more robust)
    for (const day of editedWeeklySchedule) {
      if (day.availability.isAvailable) {
        for (let i = 0; i < day.availability.slots.length; i++) {
          const slotA = day.availability.slots[i];
          if (slotA.startTime >= slotA.endTime) {
            alert(
              `For ${day.day}, start time (${formatTime(slotA.startTime)}) must be before end time (${formatTime(slotA.endTime)}).`,
            );
            return;
          }
          for (let j = i + 1; j < day.availability.slots.length; j++) {
            const slotB = day.availability.slots[j];
            // Check for overlap
            if (
              slotA.startTime < slotB.endTime &&
              slotB.startTime < slotA.endTime
            ) {
              alert(
                `For ${day.day}, time slots overlap: ${formatTime(
                  slotA.startTime,
                )}-${formatTime(slotA.endTime)} and ${formatTime(
                  slotB.startTime,
                )}-${formatTime(slotB.endTime)}.`,
              );
              return;
            }
          }
        }
      }
    }

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
      alert("Please fill in all package fields.");
      return;
    }
    const parsedPrice = parseFloat(packageFormPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("Price must be a positive number.");
      return;
    }

    setPackageFormLoading(true); // Indicate saving
    try {
      if (currentPackageId) {
        // Update existing package
        await updatePackage({
          id: currentPackageId,
          serviceId: service.id,
          title: packageFormTitle,
          description: packageFormDescription,
          price: parsedPrice,
        });
        setPackages((prev) =>
          prev.map((p) =>
            p.id === currentPackageId
              ? {
                  ...p,
                  title: packageFormTitle,
                  description: packageFormDescription,
                  price: parsedPrice,
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
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

    try {
      setLoading(true); // Indicate deleting
      await deletePackage(packageId);
      setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));
      toast.success("Package deleted!");
    } catch (err) {
      toast.error("Failed to delete package. Please try again.");
    } finally {
      setLoading(false);
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

  // Helper object to order days of the week
  const dayOrder: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 pb-24 md:pb-0">
      <Toaster position="top-center" richColors />

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
            className="absolute top-2 right-2 z-20 rounded-full bg-white/80 p-2 text-gray-700 hover:bg-white"
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
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 shadow-md backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-8">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-colors hover:bg-blue-100"
            aria-label="Go to home"
          >
            <ArrowLeftIcon className="h-6 w-6 text-blue-600" />
          </button>
          <h1 className="text-2xl font-bold text-black">Service Details</h1>
          <div className="w-8"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-8">
        {/* Active Bookings Warning */}
        {hasActiveBookings && (
          <div className="mt-8 flex items-center gap-4 rounded-xl border-l-8 border-amber-400 bg-amber-50 p-5 shadow">
            <svg
              className="h-8 w-8 text-amber-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-base font-semibold text-amber-900">
                Service has active bookings
              </h3>
              <p className="text-sm text-amber-800">
                This service has <b>{activeBookingsCount}</b> active booking
                {activeBookingsCount !== 1 ? "s" : ""} and cannot be edited or
                deleted until all bookings are completed or cancelled.
              </p>
            </div>
          </div>
        )}

        {/* Hero Card */}
        <section className="relative mt-8 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-100 via-white to-gray-50 shadow-xl">
          {/* Hero Image */}
          <div className="relative flex h-56 w-full items-center justify-center bg-gradient-to-r from-blue-200 via-blue-100 to-white">
            {serviceImages &&
            serviceImages.length > 0 &&
            serviceImages[0].dataUrl ? (
              <img
                src={serviceImages[0].dataUrl}
                alt="Service Hero"
                className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
              />
            ) : service.category?.slug ? (
              <img
                src={`/images/ai-sp/${service.category?.slug || "default-provider"}.svg`}
                alt={service.category.name}
                className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
              />
            ) : (
              <img
                src={`/images/ai-sp/${service.category?.slug || "default-provider"}.svg`}
                alt={service.category?.name || "Category"}
                className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/images/ai-sp/default.jpg";
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent"></div>
          </div>
          {/* Card Content */}
          <div className="relative z-10 flex flex-col gap-6 px-8 py-8 md:flex-row md:items-center md:gap-10 md:py-10">
            {/* Service Info */}
            <div className="min-w-0 flex-1">
              {/* Mobile: Green dot next to name, pencil after */}
              <div className="mb-2 block md:hidden">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <h2
                      className="flex-1 text-xl font-bold break-words text-blue-900 drop-shadow-sm"
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
                    <Tooltip
                      content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                      disabled={hasActiveBookings}
                    >
                      <button
                        onClick={
                          hasActiveBookings
                            ? undefined
                            : handleEditTitleCategory
                        }
                        className={`rounded-full p-2 transition-colors hover:bg-blue-100 ${
                          hasActiveBookings
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }`}
                        aria-label="Edit title and category"
                        disabled={hasActiveBookings}
                      >
                        <PencilIcon className="h-5 w-5 text-blue-500" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
              {/* Desktop: Name, availability note, pencil */}
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
                <Tooltip
                  content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                  disabled={hasActiveBookings}
                >
                  <button
                    onClick={
                      hasActiveBookings ? undefined : handleEditTitleCategory
                    }
                    className={`rounded-full p-2 transition-colors hover:bg-blue-100 ${
                      hasActiveBookings ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    aria-label="Edit title and category"
                    disabled={hasActiveBookings}
                  >
                    <PencilIcon className="h-5 w-5 text-blue-500" />
                  </button>
                </Tooltip>
              </div>
              <div className="mt-2 flex items-center gap-2 text-lg font-medium text-blue-700">
                <TagIcon className="h-5 w-5 text-blue-400" />
                {service.category.name}
              </div>
              {/* Remove availability note/label */}
              {editTitleCategory && (
                <div className="mt-4 flex flex-col gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full rounded-lg border border-blue-200 bg-white/80 px-4 py-2 text-2xl font-bold text-blue-900 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Service Title"
                  />
                  <select
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                    className="w-full rounded-lg border border-blue-200 bg-white/80 px-4 py-2 text-base text-blue-700 focus:border-blue-500 focus:ring-blue-500"
                    disabled={categoriesLoading}
                  >
                    <option value="">
                      {categoriesLoading
                        ? "Loading categories..."
                        : "Select Category"}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleSaveTitleCategory}
                      className="rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700"
                      disabled={loading || hasActiveBookings}
                      aria-label="Save title and category"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleCancelTitleCategory}
                      className="rounded-full bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
                      disabled={loading}
                      aria-label="Cancel editing title and category"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Ratings */}
            <div className="flex min-w-[180px] flex-col items-center justify-center gap-2">
              <ViewReviewsButton
                serviceId={service.id}
                averageRating={service.averageRating!}
                totalReviews={service.totalReviews!}
                variant="card"
                className="mt-1"
              />
            </div>
          </div>
        </section>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left: Location & Packages */}
          <div className="flex flex-col gap-8">
            {/* Location & Availability */}
            <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
                  <MapPinIcon className="h-6 w-6 text-blue-400" />
                  Location & Availability
                </h3>
                <Tooltip
                  content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                  disabled={hasActiveBookings}
                >
                  <button
                    onClick={
                      hasActiveBookings
                        ? undefined
                        : handleEditLocationAvailability
                    }
                    className={`rounded-full p-2 transition-colors hover:bg-blue-100 ${
                      hasActiveBookings ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    aria-label="Edit location and availability"
                    disabled={hasActiveBookings}
                  >
                    <PencilIcon className="h-5 w-5 text-blue-500" />
                  </button>
                </Tooltip>
              </div>

              {editLocationAvailability ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-blue-700">
                        City/Municipality
                      </label>
                      <input
                        type="text"
                        value={editedCity}
                        onChange={(e) => setEditedCity(e.target.value)}
                        className="w-full rounded-md border border-blue-200 bg-white/80 px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="City or Municipality"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-blue-700">
                        Province
                      </label>
                      <input
                        type="text"
                        value={editedState}
                        onChange={(e) => setEditedState(e.target.value)}
                        className="w-full rounded-md border border-blue-200 bg-white/80 px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Province"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-700">
                      <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
                      Availability
                    </label>
                    <AvailabilityEditor
                      weeklySchedule={editedWeeklySchedule}
                      setWeeklySchedule={setEditedWeeklySchedule}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancelLocationAvailability}
                      className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveLocationAvailability}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-blue-700">
                      Full Address
                    </label>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
                      {service.location.city}
                      {service.location.state && `, ${service.location.state}`}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-700">
                      <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
                      Availability
                    </label>
                    <div className="flex flex-wrap gap-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-4 text-sm font-medium text-blue-900">
                      {service.weeklySchedule?.filter(
                        (entry) => entry.availability.isAvailable,
                      ).length ? (
                        [...service.weeklySchedule]
                          .filter((entry) => entry.availability.isAvailable)
                          .sort((a, b) => dayOrder[a.day] - dayOrder[b.day])
                          .map((entry) => (
                            <div
                              key={entry.day}
                              className="flex min-w-[140px] flex-col items-start rounded-xl border border-blue-100 bg-white/80 p-3 shadow"
                            >
                              <span className="mb-2 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-blue-800 shadow-sm">
                                <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
                                {entry.day}
                              </span>
                              {entry.availability.slots &&
                              entry.availability.slots.length > 0 ? (
                                <ul className="ml-1 space-y-1">
                                  {entry.availability.slots.map((slot, idx) => (
                                    <li
                                      key={idx}
                                      className="flex items-center gap-2 text-xs text-blue-900"
                                    >
                                      <span className="inline-block rounded bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                                        {formatTime(slot.startTime)} -{" "}
                                        {formatTime(slot.endTime)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-xs text-blue-400">
                                  No slots
                                </span>
                              )}
                            </div>
                          ))
                      ) : (
                        <span className="text-blue-400">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Service Packages */}
            <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
                  <BriefcaseIcon className="h-6 w-6 text-blue-400" />
                  Service Packages ({packages.length})
                </h3>
                {!isAddingOrEditingPackage && (
                  <Tooltip
                    content={`Cannot add/edit packages with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                    disabled={hasActiveBookings}
                  >
                    <button
                      onClick={hasActiveBookings ? undefined : handleAddPackage}
                      className={`inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 ${
                        hasActiveBookings ? "cursor-not-allowed opacity-50" : ""
                      }`}
                      disabled={hasActiveBookings}
                    >
                      <PlusIcon className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Add Package</span>
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className="space-y-4">
                {isAddingOrEditingPackage && (
                  <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 shadow-inner">
                    <h4 className="mb-3 text-lg font-semibold text-blue-800">
                      {currentPackageId ? "Edit Package" : "Add New Package"}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="packageTitle"
                          className="mb-1 block text-sm font-medium text-blue-700"
                        >
                          Title
                        </label>
                        <input
                          type="text"
                          id="packageTitle"
                          value={packageFormTitle}
                          onChange={(e) => setPackageFormTitle(e.target.value)}
                          className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="e.g., Basic Cleaning, Premium Tune-up"
                          required
                          disabled={packageFormLoading}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="packageDescription"
                          className="mb-1 block text-sm font-medium text-blue-700"
                        >
                          Description
                        </label>
                        <textarea
                          id="packageDescription"
                          value={packageFormDescription}
                          onChange={(e) =>
                            setPackageFormDescription(e.target.value)
                          }
                          rows={3}
                          className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Brief description of what's included in this package"
                          required
                          disabled={packageFormLoading}
                        ></textarea>
                      </div>
                      <div>
                        <label
                          htmlFor="packagePrice"
                          className="mb-1 block text-sm font-medium text-blue-700"
                        >
                          Price (₱)
                        </label>
                        <input
                          type="number"
                          id="packagePrice"
                          value={packageFormPrice}
                          onChange={(e) => setPackageFormPrice(e.target.value)}
                          min="0.01"
                          step="0.01"
                          className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="e.g., 500.00"
                          required
                          disabled={packageFormLoading}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleCancelPackageEdit}
                          className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                          disabled={packageFormLoading}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSavePackage}
                          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          disabled={packageFormLoading}
                        >
                          {packageFormLoading
                            ? "Saving..."
                            : currentPackageId
                              ? "Update Package"
                              : "Create Package"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Redesigned package cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {packages.length > 0
                    ? packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="flex flex-col justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 shadow transition-shadow hover:shadow-lg"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold break-words text-blue-900">
                                {pkg.title}
                              </h4>
                              <span className="text-lg font-bold text-green-600">
                                ₱{pkg.price.toFixed(2)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm break-words text-blue-700">
                              {pkg.description}
                            </p>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Tooltip
                              content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                              disabled={hasActiveBookings}
                            >
                              <button
                                onClick={
                                  hasActiveBookings
                                    ? undefined
                                    : () => handleEditPackage(pkg)
                                }
                                className={`rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 ${
                                  hasActiveBookings || isAddingOrEditingPackage
                                    ? "cursor-not-allowed opacity-50"
                                    : ""
                                }`}
                                aria-label={`Edit ${pkg.title}`}
                                disabled={
                                  hasActiveBookings || isAddingOrEditingPackage
                                }
                              >
                                Edit
                              </button>
                            </Tooltip>
                            <Tooltip
                              content={`Cannot delete with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                              disabled={hasActiveBookings}
                            >
                              <button
                                onClick={
                                  hasActiveBookings
                                    ? undefined
                                    : () => handleDeletePackage(pkg.id)
                                }
                                className={`rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 ${
                                  hasActiveBookings || isAddingOrEditingPackage
                                    ? "cursor-not-allowed opacity-50"
                                    : ""
                                }`}
                                aria-label={`Delete ${pkg.title}`}
                                disabled={
                                  hasActiveBookings || isAddingOrEditingPackage
                                }
                              >
                                Delete
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      ))
                    : !isAddingOrEditingPackage && (
                        <div className="col-span-full py-8 text-center text-blue-300">
                          <BriefcaseIcon className="mx-auto mb-4 h-12 w-12" />
                          <p className="mb-2 text-blue-400">
                            No packages available for this service
                          </p>
                          <p className="text-sm">
                            Packages help customers choose specific service
                            options with different pricing
                          </p>
                        </div>
                      )}
                </div>
              </div>
            </section>
          </div>

          {/* Right: Certifications & Service Images */}
          <div className="flex flex-col gap-8">
            {/* Certifications */}
            <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
                  <AcademicCapIcon className="h-6 w-6 text-blue-400" />
                  Certifications
                </h3>
                <Tooltip
                  content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                  disabled={hasActiveBookings}
                >
                  <button
                    onClick={
                      hasActiveBookings ? undefined : handleEditCertifications
                    }
                    className={`rounded-full p-2 transition-colors hover:bg-blue-100 ${
                      hasActiveBookings ? "opaWcity-50 cursor-not-allowed" : ""
                    }`}
                    aria-label="Edit certifications"
                    disabled={hasActiveBookings}
                  >
                    <PencilIcon className="h-5 w-5 text-blue-500" />
                  </button>
                </Tooltip>
              </div>
              {/* Editable Certificate Grid */}
              {editCertifications ? (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {tempDisplayCertificates.length > 0 ? (
                      tempDisplayCertificates.map((certificate, index) => (
                        <div
                          key={index}
                          className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-blue-100 bg-blue-50 shadow-sm"
                        >
                          {certificate.error ? (
                            <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
                              <AcademicCapIcon className="mx-auto h-8 w-8 text-blue-200" />
                              <p className="mt-1">Failed to load</p>
                            </div>
                          ) : certificate.dataUrl ? (
                            <img
                              src={certificate.dataUrl}
                              alt={`Certificate ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : certificate.fileName
                              ?.toLowerCase()
                              .endsWith(".pdf") ? (
                            <div className="flex h-full w-full items-center justify-center bg-red-50">
                              <div className="text-center">
                                <AcademicCapIcon className="mx-auto h-8 w-8 text-red-500" />
                                <p className="mt-1 text-xs text-red-700">
                                  {certificate.fileName}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <div className="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-blue-400"></div>
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveCertificate(index)}
                            className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                            aria-label="Remove certificate"
                            type="button"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          {certificate.isNew && (
                            <div className="absolute top-1 left-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                              NEW
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-8 text-blue-300">
                        <AcademicCapIcon className="mb-2 h-12 w-12" />
                        <span className="text-base">
                          No certificates uploaded yet.
                        </span>
                      </div>
                    )}
                    {/* Add Certificate Button */}
                    {tempDisplayCertificates.length < 10 && (
                      <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 text-blue-400 transition-colors hover:border-blue-400 hover:bg-blue-100">
                        <AcademicCapIcon className="mb-1 h-8 w-8" />
                        <span className="text-xs">Add Certificate</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          className="hidden"
                          onChange={handleCertificationUpload}
                          disabled={uploadingCertificates}
                        />
                      </label>
                    )}
                  </div>
                  {certificateUploadError && (
                    <div className="mt-2 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
                      {certificateUploadError}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={handleCancelCertifications}
                      className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      disabled={uploadingCertificates}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCertifications}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      disabled={uploadingCertificates}
                    >
                      {uploadingCertificates ? "Saving..." : "Save"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {serviceCertificates && serviceCertificates.length > 0 ? (
                    serviceCertificates.map(
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
                            ) : isPdfFile(url) ? (
                              <div className="flex flex-col items-center justify-center">
                                <DocumentIcon className="h-12 w-12 text-red-500" />
                                <span className="mt-1 text-xs text-blue-700">
                                  View PDF
                                </span>
                              </div>
                            ) : (
                              <img
                                src={url}
                                alt={`Certificate ${index + 1}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            )}
                          </button>
                        );
                      },
                    )
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-8 text-blue-300">
                      <AcademicCapIcon className="mb-2 h-12 w-12" />
                      <span className="text-base">
                        No certificates uploaded yet.
                      </span>
                    </div>
                  )}
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
                <Tooltip
                  content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                  disabled={hasActiveBookings}
                >
                  <button
                    onClick={hasActiveBookings ? undefined : handleEditImages}
                    className={`rounded-full p-2 transition-colors hover:bg-blue-100 ${
                      hasActiveBookings ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    aria-label="Edit images"
                    disabled={hasActiveBookings}
                  >
                    <PencilIcon className="h-5 w-5 text-blue-500" />
                  </button>
                </Tooltip>
              </div>
              {/* Editable Image Grid */}
              {editImages ? (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {tempDisplayImages.length > 0 ? (
                      tempDisplayImages.map((image, index) => (
                        <div
                          key={index}
                          className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-blue-100 bg-blue-50 shadow-sm"
                        >
                          {image.error ? (
                            <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
                              <PhotoIcon className="mx-auto h-8 w-8 text-blue-200" />
                              <p className="mt-1">Failed to load</p>
                            </div>
                          ) : image.dataUrl ? (
                            <img
                              src={image.dataUrl}
                              alt={`Service image ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <div className="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-blue-400"></div>
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                            aria-label="Remove image"
                            type="button"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          {image.isNew && (
                            <div className="absolute top-1 left-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                              NEW
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-8 text-blue-300">
                        <PhotoIcon className="mb-2 h-12 w-12" />
                        <span className="text-base">
                          No images uploaded yet.
                        </span>
                      </div>
                    )}
                    {/* Add Image Button */}
                    {tempDisplayImages.length < 5 && (
                      <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 text-blue-400 transition-colors hover:border-blue-400 hover:bg-blue-100">
                        <PhotoIcon className="mb-1 h-8 w-8" />
                        <span className="text-xs">Add Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImages}
                        />
                      </label>
                    )}
                  </div>
                  {uploadError && (
                    <div className="mt-2 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
                      {uploadError}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={handleCancelImages}
                      className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      disabled={uploadingImages}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveImages}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? "Saving..." : "Save"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {serviceImages && serviceImages.length > 0 ? (
                    serviceImages.map((image: any, index: number) => {
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
                          ) : isPdfFile(url) ? (
                            <div className="flex flex-col items-center justify-center">
                              <DocumentIcon className="h-12 w-12 text-red-500" />
                              <span className="mt-1 text-xs text-blue-700">
                                View PDF
                              </span>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Service image ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-8 text-blue-300">
                      <PhotoIcon className="mb-2 h-12 w-12" />
                      <span className="text-base">No images uploaded yet.</span>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row sm:justify-start">
          <button
            onClick={
              isUpdatingStatus || hasActiveBookings
                ? undefined
                : handleStatusToggle
            }
            disabled={isUpdatingStatus || hasActiveBookings}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-600 px-6 py-3 text-lg font-semibold text-blue-600 shadow-sm transition-colors duration-150 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none ${
              service.status === "Available"
                ? `border-blue-600 bg-white text-blue-600 ${hasActiveBookings ? "cursor-not-allowed opacity-60" : "hover:bg-blue-600 hover:text-white"}`
                : `border-transparent bg-blue-600 text-white ${hasActiveBookings ? "cursor-not-allowed opacity-60" : "hover:bg-blue-700"}`
            }`}
          >
            {isUpdatingStatus ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-blue-100" />
            ) : service.status === "Available" ? (
              <LockClosedIcon className="h-6 w-6" />
            ) : (
              <LockOpenIcon className="h-6 w-6" />
            )}
            {isUpdatingStatus
              ? "Updating..."
              : service.status === "Available"
                ? "Deactivate"
                : "Activate"}
          </button>
          <Tooltip
            content={`Cannot delete service with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
            disabled={hasActiveBookings}
          >
            <button
              onClick={
                hasActiveBookings ? undefined : () => setShowDeleteConfirm(true)
              }
              disabled={isDeleting || hasActiveBookings}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-600 bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-colors duration-150 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:outline-none disabled:opacity-60 ${
                hasActiveBookings
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-red-400 hover:text-white"
              }`}
              tabIndex={hasActiveBookings ? -1 : 0}
            >
              <TrashIcon className="h-6 w-6" />
              {isDeleting ? "Deleting..." : "Delete Service"}
            </button>
          </Tooltip>
        </div>
        {/* Add space below the buttons */}
        <div className="h-8" />
      </main>
    </div>
  );
};

export default ProviderServiceDetailPage;
