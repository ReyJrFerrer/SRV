import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import useBookRequest, { BookingRequest } from "../../../hooks/bookRequest";
import useBookingManagement from "../../../hooks/bookingManagement";
import phLocations from "../../../data/ph_locations.json";
import {
  createDirectPayment,
  checkProviderOnboarding,
} from "../../../services/firebase";
import { useAuth } from "../../../context/AuthContext";
import { useLocationStore } from "../../../store/locationStore";
import PaymentSection from "../../../components/client/booking/PaymentSection";
import PackagesSection from "../../../components/client/booking/PackagesSection";
import ScheduleSection from "../../../components/client/booking/ScheduleSection";
import ServiceLocationSection from "../../../components/client/booking/ServiceLocationSection";
import NotesSection from "../../../components/client/booking/NotesSection";
import StickyConfirmBar from "../../../components/client/booking/StickyConfirmBar";

const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: serviceId } = useParams<{ id: string }>();

  // Set document title
  useEffect(() => {
    document.title = "Book Service | SRV";
  }, []);

  // --- Auth context ---
  const { identity } = useAuth();

  // --- Zustand location store ---
  const {
    userAddress,
    userProvince,
    locationLoading,
    requestLocation,
    location: geoLocation,
  } = useLocationStore();

  // --- Section refs ---
  const barangayRef = useRef<HTMLSelectElement>(null);
  const otherBarangayRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const houseNumberRef = useRef<HTMLInputElement>(null);
  const packageSectionRef = useRef<HTMLDivElement>(null);
  const bookingSectionRef = useRef<HTMLDivElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // --- Booking state ---
  const [packages, setPackages] = useState<
    {
      id: string;
      title: string;
      description: string;
      price: number;
      commissionFee?: number;
      checked: boolean;
    }[]
  >([]);
  const [bookingOption, setBookingOption] = useState<
    "sameday" | "scheduled" | null
  >(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [slotAvailability, setSlotAvailability] = useState<
    Record<string, boolean>
  >({});
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [street, setStreet] = useState<string>("");
  const [houseNumber, setHouseNumber] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const NOTES_CHAR_LIMIT = 50;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "CashOnHand" | "GCash" | "SRVWallet"
  >("CashOnHand");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProviderOnboarded, setIsProviderOnboarded] =
    useState<boolean>(false);

  // Initialize location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const displayMunicipality = userAddress || "";
  const displayProvince = userProvince || "";

  // --- Service and booking data (from hook) ---
  const {
    service,
    packages: hookPackages,
    providerProfile,
    loading,
    error,
    availableSlots,
    isSameDayAvailable,
    loadServiceData,
    getAvailableSlots,
    checkTimeSlotAvailability,
    createBookingRequest,
    calculateTotalPrice,
  } = useBookRequest();

  const { bookings: userBookings } = useBookingManagement();

  // Barangay and manual location state
  const [barangayOptions, setBarangayOptions] = useState<string[]>([]);
  const [selectedBarangay, setSelectedBarangay] = useState<string>("");
  const [otherBarangay, setOtherBarangay] = useState("");
  const [locationInputMode, setLocationInputMode] = useState<
    "detected" | "manual" | "hidden"
  >("hidden");
  const [manualProvince, setManualProvince] = useState<string>("");
  const [manualCity, setManualCity] = useState<string>("");
  const [manualBarangayOptions, setManualBarangayOptions] = useState<string[]>(
    [],
  );
  const [mapLocation, setMapLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [mapPreciseAddress, setMapPreciseAddress] = useState<string>("");
  const [mapDisplayAddress, setMapDisplayAddress] = useState<string>("");
  const [showFallbackForms, setShowFallbackForms] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<"detected" | "custom">("detected");
  const [detectedAddress, setDetectedAddress] = useState<string>("");
  const [detectedStatus, setDetectedStatus] = useState<
    "idle" | "loading" | "ok" | "failed" | "denied" | "na"
  >("idle");
  const [mapsReady, setMapsReady] = useState<boolean>(false);

  // Google maps readiness
  useEffect(() => {
    if ((window as any).google?.maps) {
      setMapsReady(true);
      return;
    }
    let attempts = 0;
    const iv = setInterval(() => {
      if ((window as any).google?.maps) {
        setMapsReady(true);
        clearInterval(iv);
      } else if (attempts++ > 50) {
        clearInterval(iv);
      }
    }, 200);
    return () => clearInterval(iv);
  }, []);

  // Reverse geocode detected coordinates
  useEffect(() => {
    if (mapMode !== "detected") return;
    if (detectedStatus === "loading" || detectedStatus === "ok") return;
    if (!geoLocation?.latitude || !geoLocation?.longitude) return;
    if (!mapsReady) return;
    try {
      if (!(window as any).google?.maps) return;
      setDetectedStatus("loading");
      const geocoder = new (window as any).google.maps.Geocoder();
      const loc = { lat: geoLocation.latitude, lng: geoLocation.longitude };
      geocoder.geocode({ location: loc }, (results: any, status: string) => {
        if (status === "OK" && results && results[0]) {
          const addr = results[0].formatted_address as string;
          setDetectedAddress(addr);
          setDetectedStatus("ok");
          setMapLocation(
            (prev) => prev ?? { lat: loc.lat, lng: loc.lng, address: addr },
          );
          if (!mapPreciseAddress) setMapPreciseAddress(addr);
          if (!mapDisplayAddress) setMapDisplayAddress(addr);
        } else {
          setDetectedStatus("failed");
        }
      });
    } catch {
      setDetectedStatus("failed");
    }
  }, [
    mapMode,
    geoLocation,
    mapsReady,
    detectedStatus,
    mapPreciseAddress,
    mapDisplayAddress,
  ]);

  // Manual barangays when province/city changes
  useEffect(() => {
    if (manualProvince && manualCity) {
      const provinceObj = (phLocations as any).provinces.find(
        (prov: any) =>
          prov.name.trim().toLowerCase() ===
          manualProvince.trim().toLowerCase(),
      );
      const muniObj = provinceObj?.municipalities.find(
        (muni: any) =>
          muni.name.trim().toLowerCase() === manualCity.trim().toLowerCase(),
      );
      if (muniObj && Array.isArray(muniObj.barangays)) {
        setManualBarangayOptions(
          muniObj.barangays.filter(
            (b: string) =>
              b && b.trim().toLowerCase().replace(/\s+/g, "") !== "others",
          ),
        );
      } else {
        setManualBarangayOptions([]);
      }
      setSelectedBarangay("");
    } else {
      setManualBarangayOptions([]);
      setSelectedBarangay("");
    }
  }, [manualProvince, manualCity]);

  // Detected barangays from displayMunicipality/province
  useEffect(() => {
    let found: string[] = [];
    const cityNorm = (displayMunicipality || "").trim().toLowerCase();
    const provinceNorm = (displayProvince || "").trim().toLowerCase();
    const provinces = (phLocations as any).provinces;

    if (
      (cityNorm === "baguio" || cityNorm === "baguio city") &&
      ["benguet", "cordillera administrative region", "car", "region"].includes(
        provinceNorm,
      )
    ) {
      const benguet = provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "benguet",
      );
      const baguio = benguet?.municipalities.find(
        (m: any) => m.name.trim().toLowerCase() === "baguio city",
      );
      if (baguio?.barangays) found = baguio.barangays;
    } else if (
      (cityNorm === "la trinidad" || cityNorm === "latrinidad") &&
      provinceNorm === "benguet"
    ) {
      const benguet = provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "benguet",
      );
      const laTrinidad = benguet?.municipalities.find(
        (m: any) => m.name.trim().toLowerCase() === "la trinidad",
      );
      if (laTrinidad?.barangays) found = laTrinidad.barangays;
    } else if (cityNorm === "itogon" && provinceNorm === "benguet") {
      const benguet = provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "benguet",
      );
      const itogon = benguet?.municipalities.find(
        (m: any) => m.name.trim().toLowerCase() === "itogon",
      );
      if (itogon?.barangays) found = itogon.barangays;
    } else if (cityNorm === "tuba" && provinceNorm === "benguet") {
      const benguet = provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "benguet",
      );
      const tuba = benguet?.municipalities.find(
        (m: any) => m.name.trim().toLowerCase() === "tuba",
      );
      if (tuba?.barangays) found = tuba.barangays;
    } else if (
      (provinceNorm === "pangasinan" &&
        [
          "mapandan",
          "manaoag",
          "san fabian",
          "mangaldan",
          "sta. barbara",
          "san jacinto",
          "calasiao",
        ].includes(cityNorm)) ||
      (cityNorm === "dagupan" && provinceNorm === "region 1")
    ) {
      const pangasinan = provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "pangasinan",
      );
      const muni = pangasinan?.municipalities.find(
        (m: any) => m.name.trim().toLowerCase() === cityNorm,
      );
      if (muni?.barangays) found = muni.barangays;
    } else if (cityNorm) {
      let matched = false;
      for (const prov of provinces) {
        for (const muni of prov.municipalities) {
          if (
            typeof muni === "object" &&
            muni.name.trim().toLowerCase() === cityNorm &&
            Array.isArray(muni.barangays)
          ) {
            found = muni.barangays as string[];
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }
    if (found.length > 0) {
      setBarangayOptions(
        found.filter(
          (b) => b && b.trim().toLowerCase().replace(/\s+/g, "") !== "others",
        ),
      );
    } else if (cityNorm) {
      setBarangayOptions([
        ...Array.from({ length: 10 }, (_, i) => `Barangay ${i + 1}`),
      ]);
    } else {
      setBarangayOptions([]);
    }
    setSelectedBarangay("");
  }, [displayMunicipality, displayProvince]);

  // Load service and packages
  useEffect(() => {
    if (serviceId) loadServiceData(serviceId);
  }, [serviceId, loadServiceData]);

  // Check provider onboarding
  useEffect(() => {
    const run = async () => {
      if (service?.providerId) {
        try {
          const onb = await checkProviderOnboarding(
            service.providerId.toString(),
          );
          setIsProviderOnboarded(onb);
        } catch {
          setIsProviderOnboarded(false);
        }
      }
    };
    run();
  }, [service?.providerId]);

  useEffect(() => {
    if (hookPackages.length > 0)
      setPackages(hookPackages.map((p: any) => ({ ...p, checked: false })));
  }, [hookPackages]);

  // Load available slots when date/option changes
  useEffect(() => {
    if (!service) return;
    if (bookingOption === "scheduled" && selectedDate) {
      getAvailableSlots(service.id, selectedDate);
    } else if (bookingOption === "sameday") {
      const date = new Date();
      getAvailableSlots(service.id, date);
    }
  }, [service, selectedDate, bookingOption, getAvailableSlots]);

  // Check all slot availability
  useEffect(() => {
    const checkAll = async () => {
      if (!service || availableSlots.length === 0) return;
      setCheckingSlots(true);
      const map: Record<string, boolean> = {};
      const today = new Date();
      const dateToCheck =
        bookingOption === "sameday"
          ? new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
              9,
              0,
              0,
              0,
            )
          : selectedDate;
      if (!dateToCheck) {
        setCheckingSlots(false);
        return;
      }
      const isTimeSlotPassed = (_start: string, end: string) => {
        if (bookingOption !== "sameday") return false;
        const now = new Date();
        const [eh, em] = end.split(":").map(Number);
        const slotEnd = new Date();
        slotEnd.setHours(eh, em, 0, 0);
        return now >= slotEnd;
      };
      for (const slot of availableSlots) {
        const key = `${slot.timeSlot.startTime}-${slot.timeSlot.endTime}`;
        const passed = isTimeSlotPassed(
          slot.timeSlot.startTime,
          slot.timeSlot.endTime,
        );
        if (passed) map[key] = false;
        else {
          try {
            const ok = await checkTimeSlotAvailability(
              service.id,
              dateToCheck,
              slot.timeSlot.startTime,
            );
            map[key] = ok;
          } catch {
            map[key] = false;
          }
        }
      }
      setSlotAvailability(map);
      setCheckingSlots(false);
    };
    if (
      availableSlots.length > 0 &&
      ((bookingOption === "scheduled" && selectedDate) ||
        bookingOption === "sameday")
    ) {
      checkAll();
    }
  }, [
    availableSlots,
    selectedDate,
    bookingOption,
    service,
    checkTimeSlotAvailability,
  ]);

  const hasUserBookedTimeSlot = useCallback(
    (timeSlot: string, dateToCheck: Date): boolean => {
      if (!service) return false;
      const [startTimeStr] = timeSlot.split("-");
      const targetDay = dateToCheck.toDateString();
      return userBookings.some((booking) => {
        if (["Cancelled", "Declined", "Completed"].includes(booking.status))
          return false;
        if (booking.serviceId !== service.id) return false;
        const bookingDate = new Date(booking.scheduledDate);
        const bookingDay = bookingDate.toDateString();
        if (bookingDay !== targetDay) return false;
        const bookingRequestedDate = new Date(booking.requestedDate);
        const bookingStartTime = `${String(bookingRequestedDate.getHours()).padStart(2, "0")}:${String(bookingRequestedDate.getMinutes()).padStart(2, "0")}`;
        return bookingStartTime === startTimeStr.trim();
      });
    },
    [service, userBookings],
  );

  const totalPrice = useMemo(
    () =>
      packages
        .filter((p: any) => p.checked)
        .reduce(
          (sum: number, pkg: any) => sum + pkg.price + (pkg.commissionFee || 0),
          0,
        ),
    [packages, hookPackages, calculateTotalPrice],
  );

  useEffect(() => {
    if (
      paymentMethod === "CashOnHand" &&
      packages.some((p: any) => p.checked)
    ) {
      const paidAmount = parseFloat(amountPaid);
      if (amountPaid && (isNaN(paidAmount) || paidAmount < totalPrice))
        setPaymentError(`Amount must be at least ₱${totalPrice.toFixed(2)}`);
      else setPaymentError(null);
    } else setPaymentError(null);
  }, [amountPaid, totalPrice, paymentMethod, packages]);

  const handlePackageChange = (packageId: string) => {
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId ? { ...pkg, checked: !pkg.checked } : pkg,
      ),
    );
    setFormError(null);
  };
  const handleBookingOptionChange = (option: "sameday" | "scheduled") => {
    setBookingOption(option);
    setSelectedTime("");
    setSlotAvailability({});
    setFormError(null);
    if (option === "scheduled" && service) {
      setSelectedDate(null);
      setTimeout(() => {
        const next = findNextAvailableBusinessDay();
        if (next) setSelectedDate(next);
      }, 0);
    } else if (option === "sameday") {
      setSelectedDate(null);
    }
  };

  const dayIndexToName = (dayIndex: number): string =>
    [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][dayIndex] || "";
  const findNextAvailableBusinessDay = (): Date | null => {
    if (!service?.weeklySchedule) return null;
    const today = new Date();
    let currentDate = new Date(today.setDate(today.getDate() + 1));
    for (let i = 0; i < 14; i++) {
      const dayName = dayIndexToName(currentDate.getDay());
      const isAvailable = service.weeklySchedule.some(
        (s) => s.day === dayName && s.availability.isAvailable,
      );
      if (isAvailable) {
        return new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          9,
          0,
          0,
          0,
        );
      }
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }
    return null;
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const adjusted = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        9,
        0,
        0,
        0,
      );
      setSelectedDate(adjusted);
    } else {
      setSelectedDate(null);
    }
    setSelectedTime("");
    setFormError(null);
  };
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // 1. Allow only numbers and a single decimal point
    value = value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }

    // 2. Prevent leading zeros on the integer part
    if (parts[0].length > 1 && parts[0].startsWith("0")) {
      parts[0] = parseInt(parts[0], 10).toString();
      value = parts.join(".");
    }

    // 3. Prevent exceeding 1,000,000
    if (parseFloat(value) > 1000000) {
      value = "1000000";
    }

    // 4. Update state
    setAmountPaid(value);
    setFormError(null);
  };
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setFormError(null);
  };

  const [highlightInput, setHighlightInput] = useState<string>("");
  useEffect(() => {
    if (
      highlightInput === "barangay" &&
      selectedBarangay &&
      selectedBarangay !== "__other__"
    )
      setHighlightInput("");
    if (
      highlightInput === "otherBarangay" &&
      otherBarangay &&
      otherBarangay.trim().length >= 3 &&
      otherBarangay.trim().length <= 20
    )
      setHighlightInput("");
    if (
      highlightInput === "street" &&
      street &&
      street.trim().length >= 3 &&
      street.trim().length <= 20
    )
      setHighlightInput("");
    if (
      highlightInput === "houseNumber" &&
      houseNumber &&
      houseNumber.length <= 15 &&
      /\d/.test(houseNumber)
    )
      setHighlightInput("");
    if (highlightInput === "amountPaid" && amountPaid) setHighlightInput("");
    if (highlightInput === "selectedTime" && selectedTime)
      setHighlightInput("");
    if (highlightInput === "package" && packages.some((pkg) => pkg.checked))
      setHighlightInput("");
    if (highlightInput === "bookingOption" && bookingOption)
      setHighlightInput("");
    if (highlightInput === "paymentSection" && !paymentError && amountPaid)
      setHighlightInput("");
  }, [
    highlightInput,
    selectedBarangay,
    otherBarangay,
    street,
    houseNumber,
    amountPaid,
    selectedTime,
    packages,
    bookingOption,
    paymentError,
  ]);

  useEffect(() => {
    if (window.innerWidth > 768) return;
    let ref: HTMLElement | null = null;
    if (highlightInput === "barangay") ref = barangayRef.current;
    if (highlightInput === "otherBarangay") ref = otherBarangayRef.current;
    if (highlightInput === "street") ref = streetRef.current;
    if (highlightInput === "houseNumber") ref = houseNumberRef.current;
    if (highlightInput === "package") ref = packageSectionRef.current as any;
    if (highlightInput === "bookingOption" || highlightInput === "selectedTime")
      ref = bookingSectionRef.current as any;
    if (highlightInput === "paymentSection")
      ref = paymentSectionRef.current as any;
    if (ref) {
      setTimeout(() => {
        ref?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [highlightInput]);

  const handleConfirmBooking = async () => {
    setFormError(null);
    setIsSubmitting(true);
    let highlightField = "";
    try {
      if (!packages.some((p) => p.checked)) {
        setFormError("Please select at least one package before proceeding.");
        highlightField = "package";
        setIsSubmitting(false);
        setHighlightInput(highlightField);
        return;
      }
      if (!bookingOption) {
        setFormError("Please select a booking type (Same Day or Scheduled).");
        highlightField = "bookingOption";
        setIsSubmitting(false);
        setHighlightInput(highlightField);
        return;
      }
      if (!selectedTime) {
        const timeLabel =
          bookingOption === "sameday" ? "time for today" : "time slot";
        setFormError(`Please select a ${timeLabel} before proceeding.`);
        highlightField = "selectedTime";
        setIsSubmitting(false);
        setHighlightInput(highlightField);
        return;
      }

      const isUsingMapPin =
        !showFallbackForms &&
        !!(mapLocation && mapLocation.lat && mapLocation.lng);
      if (!isUsingMapPin) {
        if (!selectedBarangay.trim()) {
          setFormError(
            "Please select your Barangay before proceeding (or drop a map pin).",
          );
          highlightField = "barangay";
          setIsSubmitting(false);
          setHighlightInput(highlightField);
          return;
        }
        if (
          selectedBarangay === "__other__" &&
          (!otherBarangay ||
            otherBarangay.trim().length < 3 ||
            otherBarangay.trim().length > 20)
        ) {
          setFormError(
            "Please enter a valid barangay name (3-20 characters) for 'Others'.",
          );
          highlightField = "otherBarangay";
          setIsSubmitting(false);
          setHighlightInput(highlightField);
          return;
        }
        if (street.trim().length < 3 || street.trim().length > 20) {
          setFormError("Street Name must be between 3 and 20 characters.");
          highlightField = "street";
          setIsSubmitting(false);
          setHighlightInput(highlightField);
          return;
        }
        if (
          !houseNumber.trim() ||
          houseNumber.length > 15 ||
          !/\d/.test(houseNumber)
        ) {
          setFormError(
            "House/Unit No. must be at most 15 characters and contain at least one number.",
          );
          highlightField = "houseNumber";
          setIsSubmitting(false);
          setHighlightInput(highlightField);
          return;
        }
      }

      if (
        paymentMethod === "CashOnHand" &&
        packages.some((pkg) => pkg.checked)
      ) {
        const paidAmount = parseFloat(amountPaid);
        if (!amountPaid.trim()) {
          setFormError("Please enter the cash amount before proceeding.");
          highlightField = "paymentSection";
          setIsSubmitting(false);
          setHighlightInput(highlightField);
          return;
        }
        if (isNaN(paidAmount) || paidAmount < totalPrice) {
          setFormError(
            `Cash amount must be at least ₱${totalPrice.toFixed(2)}.`,
          );
          highlightField = "paymentSection";
          setIsSubmitting(false);
          setHighlightInput(highlightField);
          return;
        }
      }

      if (!packages.some((pkg) => pkg.checked)) {
        setFormError("Please select at least one package before proceeding.");
        highlightField = "package";
        setIsSubmitting(false);
        setHighlightInput(highlightField);
        return;
      }
      if (!bookingOption) {
        setFormError("Please select a booking type (Same Day or Scheduled).");
        highlightField = "bookingOption";
        setIsSubmitting(false);
        setHighlightInput(highlightField);
        return;
      }
      if (!selectedTime) {
        const timeLabel =
          bookingOption === "sameday" ? "time for today" : "time slot";
        setFormError(`Please select a ${timeLabel} before proceeding.`);
        highlightField = "selectedTime";
        setIsSubmitting(false);
        setHighlightInput(highlightField);
        return;
      }

      const [, endTimeStr] = selectedTime.split("-");
      if (!endTimeStr) {
        setFormError("Invalid time slot format. Expected format: HH:MM-HH:MM");
        setIsSubmitting(false);
        return;
      }
      const [endHour, endMinute] = endTimeStr.split(":").map(Number);
      if (isNaN(endHour) || isNaN(endMinute)) {
        setFormError("Invalid time slot format.");
        setIsSubmitting(false);
        return;
      }
      let finalScheduledDate: Date;
      if (bookingOption === "sameday") {
        const today = new Date();
        finalScheduledDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          endHour,
          endMinute,
          0,
          0,
        );
      } else if (bookingOption === "scheduled" && selectedDate) {
        finalScheduledDate = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          endHour,
          endMinute,
          0,
          0,
        );
      } else {
        setFormError("Please select a date for scheduled booking.");
        setIsSubmitting(false);
        return;
      }

      const barangayValue =
        selectedBarangay === "__other__" ? otherBarangay : selectedBarangay;
      const finalMunicipality =
        locationInputMode === "manual" ? manualCity : displayMunicipality;
      const finalProvince =
        locationInputMode === "manual" ? manualProvince : displayProvince;

      let finalAddress: string;
      if (!showFallbackForms && mapLocation?.lat && mapLocation?.lng) {
        let base = mapDisplayAddress || mapLocation.address?.trim() || "";
        const normalizedBase = base.toLowerCase();
        if (
          barangayValue &&
          barangayValue.trim() &&
          !normalizedBase.includes(barangayValue.trim().toLowerCase())
        ) {
          if (finalMunicipality && base.includes(finalMunicipality)) {
            const parts = base.split(finalMunicipality);
            base = `${parts[0].replace(/,\s*$/, "")}, ${barangayValue}, ${finalMunicipality}${parts.slice(1).join(finalMunicipality)}`;
          } else {
            base = `${base}, ${barangayValue}`;
          }
        }
        const landmarkPart = landmark ? ` (${landmark})` : "";
        finalAddress = base
          ? `${base}${landmarkPart}`
          : `Pinned Location (${mapLocation.lat.toFixed(5)}, ${mapLocation.lng.toFixed(5)})${landmarkPart}`;
      } else {
        finalAddress = [
          houseNumber,
          street,
          barangayValue,
          finalMunicipality,
          finalProvince,
          landmark,
        ]
          .filter(Boolean)
          .join(", ");
      }

      const [startTimeStr] = selectedTime.split("-");
      const duplicateBooking = userBookings.find((booking) => {
        if (["Cancelled", "Declined", "Completed"].includes(booking.status))
          return false;
        if (booking.serviceId !== service!.id) return false;
        const bookingDate = new Date(booking.scheduledDate);
        const bookingDay = bookingDate.toDateString();
        let targetDate: Date;
        if (bookingOption === "sameday") {
          const today = new Date();
          targetDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
          );
        } else {
          targetDate = new Date(
            selectedDate!.getFullYear(),
            selectedDate!.getMonth(),
            selectedDate!.getDate(),
          );
        }
        const targetDay = targetDate.toDateString();
        if (bookingDay !== targetDay) return false;
        const bookingRequestedDate = new Date(booking.requestedDate);
        const bookingStartTime = `${String(bookingRequestedDate.getHours()).padStart(2, "0")}:${String(bookingRequestedDate.getMinutes()).padStart(2, "0")}`;
        return bookingStartTime === startTimeStr.trim();
      });
      if (duplicateBooking) {
        setFormError(
          `You already have a ${duplicateBooking.status.toLowerCase()} booking for this service on ${new Date(duplicateBooking.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${selectedTime}. Please choose a different time slot or cancel your existing booking.`,
        );
        highlightField = "selectedTime";
        setIsSubmitting(false);
        setHighlightInput(highlightField);
        return;
      }

      const bookingData: BookingRequest = {
        serviceId: service!.id,
        serviceName: service!.title,
        providerId: service!.providerId.toString(),
        packages: packages.filter((pkg) => pkg.checked),
        totalPrice,
        bookingType: bookingOption as "sameday" | "scheduled",
        scheduledDate: finalScheduledDate,
        scheduledTime: selectedTime,
        location: finalAddress,
        notes: notes,
        amountToPay: parseFloat(amountPaid),
        paymentMethod: paymentMethod,
        locationDetection: !showFallbackForms ? "automatic" : "manual",
      };
      if (mapLocation?.lat && mapLocation?.lng) {
        (bookingData as any).latitude = mapLocation.lat;
        (bookingData as any).longitude = mapLocation.lng;
        if (mapLocation.address)
          (bookingData as any).geocodedAddress = mapLocation.address;
        if (mapPreciseAddress)
          (bookingData as any).preciseAddress = mapPreciseAddress;
        if (mapDisplayAddress)
          (bookingData as any).displayAddress = mapDisplayAddress;
      }

      if (paymentMethod === "GCash") {
        if (!identity) {
          setFormError("You must be logged in to make digital payments.");
          return;
        }
        const isOnboarded = await checkProviderOnboarding(
          service!.providerId.toString(),
        );
        if (!isOnboarded) {
          setFormError(
            "This provider hasn't set up direct payments yet. Please use cash payment or SRV Wallet.",
          );
          return;
        }
        const clientId = identity.getPrincipal().toString();
        const paymentResult = await createDirectPayment({
          bookingId: `temp_${Date.now()}`,
          clientId,
          providerId: service!.providerId.toString(),
          packages: packages,
          serviceTitle: service!.title,
          category: service!.category.name.toString(),
          bookingData: {
            ...bookingData,
            location:
              typeof bookingData.location === "string"
                ? bookingData.location
                : finalAddress,
          },
        });
        if (!paymentResult.success) {
          setFormError(
            paymentResult.error ||
              "Failed to create payment invoice. Please try again.",
          );
          return;
        }
        if (paymentResult.invoiceUrl) {
          window.open(paymentResult.invoiceUrl, "_blank");
          navigate("/client/booking/payment-pending", {
            state: {
              invoiceId: paymentResult.invoiceId,
              invoiceUrl: paymentResult.invoiceUrl,
              bookingData,
            },
          });
          return;
        }
      }

      const booking = await createBookingRequest(bookingData);
      if (booking) {
        setFormError(null);
        const confirmationDetails = {
          ...bookingData,
          providerName: providerProfile?.name,
          date: finalScheduledDate
            ? finalScheduledDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Same Day",
          time: bookingData.scheduledTime || "As soon as possible",
          packagePrice: totalPrice.toFixed(2),
          amountToPay:
            paymentMethod === "CashOnHand"
              ? amountPaid || totalPrice.toFixed(2)
              : totalPrice.toFixed(2),
          landmark: landmark || "None",
          municipality: finalMunicipality,
          province: finalProvince,
        };
        navigate("/client/booking/confirmation", {
          state: { details: confirmationDetails },
        });
      } else {
        setFormError("Failed to create booking. Please try again.");
      }
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setFormError(
        `An error occurred while creating the booking: ${errorMessage}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!serviceId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (loading)
    return <div className="p-10 text-center">Loading service details...</div>;
  if (error)
    return <div className="p-10 text-center text-red-500">{String(error)}</div>;
  if (!service)
    return <div className="p-10 text-center">Service not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1">
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-yellow-50">
          <style>{`
          .booking-calendar-wrapper .react-datepicker { width: 100%; border: none; box-shadow: none; }
          .booking-calendar-wrapper .react-datepicker__month-container { width: 100%; }
          .booking-calendar-wrapper .react-datepicker__header { background-color: #f3f4f6; border-bottom: none; border-radius: 0.75rem 0.75rem 0 0; }
          .booking-calendar-wrapper .react-datepicker__day-names, .booking-calendar-wrapper .react-datepicker__week { display: flex; justify-content: space-around; }
          .booking-calendar-wrapper .react-datepicker__day { margin: 0.25rem; border-radius: 0.5rem; transition: background 0.2s, color 0.2s; }
          .booking-calendar-wrapper .react-datepicker__day--selected, .booking-calendar-wrapper .react-datepicker__day--keyboard-selected {
            background-color: #2563eb !important; color: #fff !important; font-weight: bold; }
          .booking-calendar-wrapper .react-datepicker__day--disabled { opacity: 0.4; cursor: not-allowed; }
          .booking-calendar-wrapper .react-datepicker__day:hover:not(.react-datepicker__day--disabled) { background-color: #dbeafe; color: #1e40af; }
          .booking-calendar-wrapper .react-datepicker__current-month { font-weight: 600; color: #1e293b; }
        `}</style>
          <div className="flex-grow pb-2 md:pb-28">
            <div className="mx-auto max-w-5xl px-2 py-8 md:px-0">
              <div className="md:flex md:gap-x-8">
                <div className="space-y-6 md:w-1/2">
                  <PackagesSection
                    packages={packages}
                    onToggle={handlePackageChange}
                    highlight={highlightInput === "package"}
                    innerRef={packageSectionRef}
                  />
                  <ServiceLocationSection
                    highlight={highlightInput === "mapLocation"}
                    mapsReady={mapsReady}
                    mapMode={mapMode}
                    setMapMode={setMapMode}
                    showFallbackForms={showFallbackForms}
                    setShowFallbackForms={setShowFallbackForms}
                    geoLocation={geoLocation as any}
                    locationLoading={locationLoading}
                    detectedStatus={detectedStatus}
                    detectedAddress={detectedAddress}
                    mapLocation={mapLocation}
                    setMapLocation={setMapLocation}
                    mapPreciseAddress={mapPreciseAddress}
                    setMapPreciseAddress={setMapPreciseAddress}
                    mapDisplayAddress={mapDisplayAddress}
                    setMapDisplayAddress={setMapDisplayAddress}
                    locationInputMode={locationInputMode}
                    setLocationInputMode={setLocationInputMode}
                    displayMunicipality={displayMunicipality}
                    displayProvince={displayProvince}
                    barangayOptions={barangayOptions}
                    selectedBarangay={selectedBarangay}
                    setSelectedBarangay={setSelectedBarangay}
                    otherBarangay={otherBarangay}
                    setOtherBarangay={setOtherBarangay}
                    street={street}
                    setStreet={setStreet}
                    houseNumber={houseNumber}
                    setHouseNumber={setHouseNumber}
                    landmark={landmark}
                    setLandmark={setLandmark}
                    manualProvince={manualProvince}
                    setManualProvince={setManualProvince}
                    manualCity={manualCity}
                    setManualCity={setManualCity}
                    manualBarangayOptions={manualBarangayOptions}
                    highlightInput={highlightInput}
                    barangayRef={barangayRef}
                    otherBarangayRef={otherBarangayRef}
                    streetRef={streetRef}
                    houseNumberRef={houseNumberRef}
                  />
                </div>
                <div className="mt-8 space-y-6 md:mt-0 md:w-1/2">
                  <ScheduleSection
                    innerRef={bookingSectionRef}
                    bookingOption={bookingOption}
                    isSameDayAvailable={!!isSameDayAvailable}
                    onChangeBookingOption={handleBookingOptionChange}
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    selectedTime={selectedTime}
                    setSelectedTime={setSelectedTime}
                    availableSlots={availableSlots as any}
                    slotAvailability={slotAvailability}
                    checkingSlots={checkingSlots}
                    hasUserBookedTimeSlot={hasUserBookedTimeSlot}
                    serviceWeeklySchedule={service.weeklySchedule}
                    dayIndexToName={dayIndexToName}
                    highlight={
                      highlightInput === "bookingOption" ||
                      highlightInput === "selectedTime"
                    }
                  />

                  <div className="hidden md:block">
                    <div ref={paymentSectionRef}>
                      <PaymentSection
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        packages={packages}
                        amountPaid={amountPaid}
                        handleAmountChange={handleAmountChange}
                        paymentError={paymentError}
                        totalPrice={totalPrice}
                        highlight={highlightInput === "paymentSection"}
                        isProviderOnboarded={isProviderOnboarded}
                      />
                    </div>
                  </div>

                  <div className="mt-4 md:hidden">
                    <div ref={paymentSectionRef}>
                      <PaymentSection
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        packages={packages}
                        amountPaid={amountPaid}
                        handleAmountChange={handleAmountChange}
                        paymentError={paymentError}
                        totalPrice={totalPrice}
                        highlight={highlightInput === "paymentSection"}
                        isProviderOnboarded={isProviderOnboarded}
                      />
                    </div>
                  </div>

                  <NotesSection
                    notes={notes}
                    onChange={handleNotesChange}
                    limit={NOTES_CHAR_LIMIT}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 z-10 w-full border-t bg-white py-3 shadow-md md:py-4">
            
          </div>
          <StickyConfirmBar 
            formError={formError}
            isSubmitting={isSubmitting}
            onConfirm={handleConfirmBooking}
          />
        </div>
      </main>
    </div>
  );
};

export default BookingPage;
