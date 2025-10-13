// Page: Client Booking
// Purpose: Booking flow with packages, schedule selection, location via map or manual form, and payment.
// Inputs: serviceId via route, Zustand location context.
// Outputs: Creates booking request; optionally initiates digital payment.
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  CurrencyDollarIcon,
  CreditCardIcon,
  GlobeAltIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import useBookRequest, { BookingRequest } from "../../hooks/bookRequest";
import phLocations from "../../data/ph_locations.json";
import {
  createDirectPayment,
  checkProviderOnboarding,
} from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useLocationStore } from "../../store/locationStore";
import LocationMapPicker from "../common/LocationMapPicker";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";

// --- Payment Section Sub-Component ---

// Payment method selection and input for cash change
type PaymentSectionProps = {
  paymentMethod: "CashOnHand" | "GCash" | "SRVWallet";
  setPaymentMethod: (method: "CashOnHand" | "GCash" | "SRVWallet") => void;
  packages: {
    id: string;
    title: string;
    description: string;
    price: number;
    commissionFee?: number;
    checked: boolean;
  }[];
  amountPaid: string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  paymentError: string | null;
  totalPrice: number;
  highlight?: boolean; // <-- Add highlight prop
  isProviderOnboarded?: boolean; // <-- Add provider onboarding status
};

const PaymentSection: React.FC<PaymentSectionProps> = ({
  paymentMethod,
  setPaymentMethod,
  packages,
  amountPaid,
  handleAmountChange,
  paymentError,
  totalPrice,
  highlight = false,
  // isProviderOnboarded = false,
}) => (
  <div
    className={`mt-4 bg-white p-4 md:rounded-xl md:shadow-sm ${
      highlight
        ? "border-2 border-red-500 ring-2 ring-red-200"
        : "border border-gray-200"
    }`}
  >
    <h3 className="mb-4 text-lg font-semibold text-gray-900">Payment Method</h3>
    <div className="space-y-3">
      <div
        onClick={() => setPaymentMethod("CashOnHand")}
        className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
          paymentMethod === "CashOnHand"
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300"
        }`}
      >
        <div className="flex items-center">
          <CurrencyDollarIcon className="mr-3 h-6 w-6 text-green-500" />
          <span className="font-medium text-gray-800">Cash</span>
        </div>
        {paymentMethod === "CashOnHand" && (
          <CheckCircleIcon className="h-6 w-6 text-blue-500" />
        )}
      </div>
      {paymentMethod === "CashOnHand" && packages.some((p) => p.checked) && (
        <div className="pt-2 pl-4">
          <label className="text-sm font-medium text-gray-700">
            Change for how much?
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amountPaid}
            onChange={handleAmountChange}
            placeholder={`e.g., ${totalPrice.toFixed(2)}`}
            className={`mt-1 w-full rounded-md border p-2 ${
              paymentError ? "border-red-500" : "border-gray-300"
            }`}
          />
          {paymentError && amountPaid && (
            <p className="mt-1 flex items-center text-xs text-red-600">
              <ExclamationCircleIcon className="mr-1 h-4 w-4" />
              {paymentError}
            </p>
          )}
        </div>
      )}
      <div
        // onClick={() => (isProviderOnboarded ? setPaymentMethod("GCash") : null)}
        className={
          `flex cursor-not-allowed items-center justify-between rounded-lg border p-3 opacity-50`
          //   ${
          //   !isProviderOnboarded
          //     ? "cursor-not-allowed border-gray-300 opacity-50"
          //     : paymentMethod === "GCash"
          //       ? "cursor-pointer border-blue-500 bg-blue-50"
          //       : "cursor-pointer border-gray-300"
          // }
        }
      >
        <div className="flex items-center">
          <WalletIcon className="mr-3 h-6 w-6 text-blue-500" />
          <div className="flex flex-col">
            <span className="font-medium text-gray-800">
              E-Wallet (GCash and PayMaya)
            </span>
            {/* {!isProviderOnboarded && (
              <span className="text-xs text-gray-500">
                Provider not set up for direct payments
              </span>
            )} */}
          </div>
        </div>

        <div className="flex items-center">
          {/* {!isProviderOnboarded && (
            <span className="mr-2 text-xs text-gray-400">Unavailable</span>
          )} */}
          {/* {paymentMethod === "GCash" && isProviderOnboarded && (
            <CheckCircleIcon className="h-6 w-6 text-blue-500" />
          )} */}
        </div>
        <span className="text-xs text-gray-400">Soon</span>
      </div>
      <div
        // onClick={() => setPaymentMethod("SRVWallet")}
        className={`flex cursor-not-allowed items-center justify-between rounded-lg border p-3 opacity-50`}
      >
        <div className="flex items-center">
          <img
            src="/logo.svg"
            alt="SRV"
            width={24}
            height={24}
            className="mr-3"
          />
          <span className="font-medium text-gray-800">SRV Wallet</span>
        </div>
        <span className="text-xs text-gray-400">Soon</span>
        {/* {paymentMethod === "SRVWallet" && (
          <CheckCircleIcon className="h-6 w-6 text-blue-500" />
        )} */}
      </div>
      <div className="flex cursor-not-allowed items-center justify-between rounded-lg border p-3 opacity-50">
        <div className="flex items-center">
          <CreditCardIcon className="mr-3 h-6 w-6 text-gray-400" />
          <span className="font-medium text-gray-500">Debit/Credit Card</span>
        </div>
        <span className="text-xs text-gray-400">Soon</span>
      </div>
      <div className="flex cursor-not-allowed items-center justify-between rounded-lg border p-3 opacity-50">
        <div className="flex items-center">
          <GlobeAltIcon className="mr-3 h-6 w-6 text-gray-400" />
          <span className="font-medium text-gray-500">Web3 Wallet</span>
        </div>
        <span className="text-xs text-gray-400">Soon</span>
      </div>
    </div>
  </div>
);

// --- Main Booking Page Component ---
const ClientBookingPageComponent: React.FC = () => {
  // --- Auth context ---
  const { identity } = useAuth();

  // --- Use Zustand location store ---
  const {
    userAddress,
    userProvince,
    locationLoading,
    requestLocation,
    location: geoLocation,
  } = useLocationStore();

  // --- Section refs for scrolling/highlighting ---
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
  // --- Slot availability checking state ---
  const [slotAvailability, setSlotAvailability] = useState<
    Record<string, boolean>
  >({});
  const [checkingSlots, setCheckingSlots] = useState(false);
  // --- Address and notes state ---
  const [street, setStreet] = useState<string>("");
  const [houseNumber, setHouseNumber] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const NOTES_CHAR_LIMIT = 50;
  // --- Payment state ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "CashOnHand" | "GCash" | "SRVWallet"
  >("CashOnHand");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProviderOnboarded, setIsProviderOnboarded] =
    useState<boolean>(false);
  // --- Routing ---
  const navigate = useNavigate();
  const { id: serviceId } = useParams<{ id: string }>();

  // Initialize location on component mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Set displayMunicipality and displayProvince from Zustand store
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

  // --- Barangay dropdown options ---
  const [barangayOptions, setBarangayOptions] = useState<string[]>([]);
  const [selectedBarangay, setSelectedBarangay] = useState<string>("");
  const [otherBarangay, setOtherBarangay] = useState("");
  // Add new state for location input mode and manual province/city selection
  const [locationInputMode, setLocationInputMode] = useState<
    "detected" | "manual" | "hidden"
  >("hidden");
  const [manualProvince, setManualProvince] = useState<string>("");
  const [manualCity, setManualCity] = useState<string>("");
  const [manualBarangayOptions, setManualBarangayOptions] = useState<string[]>(
    [],
  );
  // Map picker integration state (custom pin/search)
  const [mapLocation, setMapLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [mapPreciseAddress, setMapPreciseAddress] = useState<string>("");
  const [mapDisplayAddress, setMapDisplayAddress] = useState<string>("");
  const [showFallbackForms, setShowFallbackForms] = useState<boolean>(false);
  // Detected vs custom map mode
  const [mapMode, setMapMode] = useState<"detected" | "custom">("detected");
  const [detectedAddress, setDetectedAddress] = useState<string>("");
  const [detectedStatus, setDetectedStatus] = useState<
    "idle" | "loading" | "ok" | "failed" | "denied" | "na"
  >("idle");

  // Detected map readiness (avoid second loader conflict). Poll for global google maps.
  const [mapsReady, setMapsReady] = useState<boolean>(false);
  // API key is provided by root APIProvider
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
        // Stop after ~10s (50 * 200ms)
        clearInterval(iv);
      }
    }, 200);
    return () => clearInterval(iv);
  }, []);

  // Reverse geocode detected coordinates
  useEffect(() => {
    if (mapMode !== "detected") return;
    if (detectedStatus === "loading" || detectedStatus === "ok") return;
    if (!geoLocation || !geoLocation.latitude || !geoLocation.longitude) return;
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
  // --- Update manualBarangayOptions when manualProvince or manualCity changes ---
  useEffect(() => {
    if (manualProvince && manualCity) {
      const provinceObj = phLocations.provinces.find(
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

  useEffect(() => {
    let foundBarangays: string[] = [];
    const cityNorm = (displayMunicipality || "").trim().toLowerCase();
    const provinceNorm = (displayProvince || "").trim().toLowerCase();

    // Special case: Baguio City in Benguet or CAR
    if (
      (cityNorm === "baguio" || cityNorm === "baguio city") &&
      ["benguet", "cordillera administrative region", "car", "region"].includes(
        provinceNorm,
      )
    ) {
      const benguet = phLocations.provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "benguet",
      );
      const baguio = benguet?.municipalities.find(
        (muni: any) => muni.name.trim().toLowerCase() === "baguio city",
      );
      if (baguio && Array.isArray(baguio.barangays)) {
        foundBarangays = baguio.barangays;
      }
    }
    // Special case: La Trinidad in Benguet
    else if (
      (cityNorm === "la trinidad" || cityNorm === "latrinidad") &&
      provinceNorm === "benguet"
    ) {
      const benguet = phLocations.provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "benguet",
      );
      const laTrinidad = benguet?.municipalities.find(
        (muni: any) => muni.name.trim().toLowerCase() === "la trinidad",
      );
      if (laTrinidad && Array.isArray(laTrinidad.barangays)) {
        foundBarangays = laTrinidad.barangays;
      }
    }
    // Special case: Itogon in Benguet
    else if (cityNorm === "itogon" && provinceNorm === "benguet") {
      const benguet = phLocations.provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "benguet",
      );
      const itogon = benguet?.municipalities.find(
        (muni: any) => muni.name.trim().toLowerCase() === "itogon",
      );
      if (itogon && Array.isArray(itogon.barangays)) {
        foundBarangays = itogon.barangays;
      }
    }
    // Special case: Tuba in Benguet
    else if (cityNorm === "tuba" && provinceNorm === "benguet") {
      const benguet = phLocations.provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "benguet",
      );
      const tuba = benguet?.municipalities.find(
        (muni: any) => muni.name.trim().toLowerCase() === "tuba",
      );
      if (tuba && Array.isArray(tuba.barangays)) {
        foundBarangays = tuba.barangays;
      }
    }
    // Special case: Pangasinan municipalities
    else if (
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
      // Use Pangasinan province for Dagupan as well
      const pangasinan = phLocations.provinces.find(
        (prov: any) => prov.name.trim().toLowerCase() === "pangasinan",
      );
      const muni = pangasinan?.municipalities.find(
        (m: any) => m.name.trim().toLowerCase() === cityNorm,
      );
      if (muni && Array.isArray(muni.barangays)) {
        foundBarangays = muni.barangays;
      }
    }
    // General lookup for other cities/municipalities
    else if (cityNorm) {
      let matched = false;
      for (const province of phLocations.provinces) {
        for (const muni of province.municipalities) {
          if (
            typeof muni === "object" &&
            muni.name.trim().toLowerCase() === cityNorm &&
            Array.isArray(muni.barangays)
          ) {
            foundBarangays = muni.barangays as string[];
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }
    if (foundBarangays.length > 0) {
      // Remove any barangay named 'Others' (case-insensitive, with possible whitespace)
      setBarangayOptions(
        foundBarangays.filter(
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
    // (end barangay options refresh)
  }, [displayMunicipality, displayProvince]);
  // --- Load service and packages on mount ---
  useEffect(() => {
    if (serviceId) loadServiceData(serviceId);
  }, [serviceId, loadServiceData]);

  // --- Check provider onboarding status when service is loaded ---
  useEffect(() => {
    const checkProviderOnboardingStatus = async () => {
      if (service?.providerId) {
        try {
          const isOnboarded = await checkProviderOnboarding(
            service.providerId.toString(),
          );
          setIsProviderOnboarded(isOnboarded);
        } catch (error) {
          // console.error("Error checking provider onboarding:", error);
          setIsProviderOnboarded(false);
        }
      }
    };

    checkProviderOnboardingStatus();
  }, [service?.providerId]);

  useEffect(() => {
    if (hookPackages.length > 0) {
      setPackages(hookPackages.map((pkg: any) => ({ ...pkg, checked: false })));
    }
  }, [hookPackages]);
  // --- Load available slots on date/option change ---
  useEffect(() => {
    if (service) {
      if (bookingOption === "scheduled" && selectedDate) {
        getAvailableSlots(service.id, selectedDate);
      } else if (bookingOption === "sameday") {
        // Load slots for today
        const date = new Date();
        getAvailableSlots(service.id, date);
      }
    }
  }, [service, selectedDate, bookingOption, getAvailableSlots]);

  // --- Check availability for all time slots when availableSlots change ---
  useEffect(() => {
    const checkAllSlotAvailability = async () => {
      if (!service || availableSlots.length === 0) return;

      setCheckingSlots(true);
      const availabilityMap: Record<string, boolean> = {};

      const today = new Date();

      // Determine the date to check
      const dateToCheck =
        bookingOption === "sameday"
          ? new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
              9, // Use 9 AM instead of noon to avoid any timezone edge cases
              0,
              0,
              0,
            )
          : selectedDate;

      if (!dateToCheck) {
        setCheckingSlots(false);
        return;
      }

      // Helper: check if a time slot has passed (same-day only)
      const isTimeSlotPassed = (
        _startTime: string,
        endTime: string,
      ): boolean => {
        if (bookingOption !== "sameday") return false;

        const now = new Date();
        const [endHour, endMinute] = endTime.split(":").map(Number);
        const slotEndTime = new Date();
        slotEndTime.setHours(endHour, endMinute, 0, 0);

        // A slot is only "passed" if the current time is past the END of the slot
        return now >= slotEndTime;
      };

      // Check availability for each slot
      for (const slot of availableSlots) {
        const timeSlotKey = `${slot.timeSlot.startTime}-${slot.timeSlot.endTime}`;

        // First check if the time slot has passed (for same-day booking)
        const hasTimePassed = isTimeSlotPassed(
          slot.timeSlot.startTime,
          slot.timeSlot.endTime,
        );

        if (hasTimePassed) {
          availabilityMap[timeSlotKey] = false;
        } else {
          try {
            // Use just the start time for availability checking
            const isAvailable = await checkTimeSlotAvailability(
              service.id,
              dateToCheck,
              slot.timeSlot.startTime, // Pass just the start time instead of the full range
            );
            availabilityMap[timeSlotKey] = isAvailable;
          } catch (error) {
            // //console.error(
            //   `Error checking availability for slot ${timeSlotKey}:`,
            //   error,
            // );
            availabilityMap[timeSlotKey] = false; // Default to unavailable on error
          }
        }
      }

      setSlotAvailability(availabilityMap);
      setCheckingSlots(false);
    };

    if (
      availableSlots.length > 0 &&
      ((bookingOption === "scheduled" && selectedDate) ||
        bookingOption === "sameday")
    ) {
      checkAllSlotAvailability();
    }
  }, [
    availableSlots,
    selectedDate,
    bookingOption,
    service,
    checkTimeSlotAvailability,
  ]);

  // --- Calculate total price for selected packages ---
  const totalPrice = useMemo(() => {
    return packages
      .filter((p: any) => p.checked)
      .reduce(
        (sum: number, pkg: any) => sum + pkg.price + (pkg.commissionFee || 0),
        0,
      );
  }, [packages, hookPackages, calculateTotalPrice]);

  // --- Validate payment amount ---
  useEffect(() => {
    if (
      paymentMethod === "CashOnHand" &&
      packages.some((p: any) => p.checked)
    ) {
      const paidAmount = parseFloat(amountPaid);
      if (amountPaid && (isNaN(paidAmount) || paidAmount < totalPrice)) {
        setPaymentError(`Amount must be at least ₱${totalPrice.toFixed(2)}`);
      } else {
        setPaymentError(null);
      }
    } else {
      setPaymentError(null);
    }
  }, [amountPaid, totalPrice, paymentMethod, packages]);

  // --- Package selection handler ---
  const handlePackageChange = (packageId: string) => {
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId ? { ...pkg, checked: !pkg.checked } : pkg,
      ),
    );
    setFormError(null);
  };
  // --- Booking option handler ---
  const handleBookingOptionChange = (option: "sameday" | "scheduled") => {
    setBookingOption(option);
    setSelectedTime(""); // Clear selected time when switching booking options
    setSlotAvailability({}); // Clear slot availability cache
    setFormError(null);

    // Auto-select next available business day when switching to scheduled
    if (option === "scheduled" && service) {
      // First clear the selected date to ensure clean state
      setSelectedDate(null);

      // Use setTimeout to ensure the state update is processed before setting new date
      setTimeout(() => {
        const nextAvailableDate = findNextAvailableBusinessDay();
        if (nextAvailableDate) {
          setSelectedDate(nextAvailableDate);
        }
      }, 0);
    } else if (option === "sameday") {
      // Clear selected date for same-day booking
      setSelectedDate(null);
    }
  };

  // Helper: find the next available business day
  const findNextAvailableBusinessDay = (): Date | null => {
    if (!service?.weeklySchedule) return null;

    const today = new Date();
    let currentDate = new Date(today.setDate(today.getDate() + 1)); // Start from tomorrow

    // Check up to 14 days ahead to find an available day
    for (let i = 0; i < 14; i++) {
      const dayName = dayIndexToName(currentDate.getDay());
      const isAvailable = service.weeklySchedule.some(
        (s) => s.day === dayName && s.availability.isAvailable,
      );

      if (isAvailable) {
        // Create adjusted date to avoid timezone issues (similar to handleDateChange)
        return new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          9, // Use 9 AM for consistency
          0,
          0,
          0,
        );
      }

      // Move to next day
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }

    return null; // No available day found within 14 days
  };
  // --- Date selection handler ---
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Create a new date object to avoid timezone issues, use 9 AM
      const adjustedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        9, // Use 9 AM instead of noon to be consistent with business hours
        0,
        0,
        0,
      );
      setSelectedDate(adjustedDate);
    } else {
      setSelectedDate(null);
    }
    setSelectedTime("");
    setFormError(null);
  };
  // --- Payment amount handler ---
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value: string = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setAmountPaid(value);
    setFormError(null);
  };

  // --- Notes change handler ---
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setFormError(null);
  };

  // --- Confirm booking handler ---
  const handleConfirmBooking = async () => {
    setFormError(null);
    setIsSubmitting(true);

    let highlightField = "";

    try {
      // 1. Select Packages
      if (!packages.some((pkg) => pkg.checked)) {
        setFormError("Please select at least one package before proceeding.");
        highlightField = "package";
        setIsSubmitting(false);
        setHighlightInput(highlightField);
        return;
      }

      // 2. Booking Schedule (booking type and time)
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

      // 3. Service Location validation
      // If a map pin has been chosen, skip granular address validation (treat form as fallback)
      const isUsingMapPin = !!(
        mapLocation &&
        mapLocation.lat &&
        mapLocation.lng
      );
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

      // 4. Payment Method (if cash)
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

      // Validate at least one package is selected
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

      // Validate time selection for both same-day and scheduled bookings
      if (!selectedTime) {
        const timeLabel =
          bookingOption === "sameday" ? "time for today" : "time slot";
        setFormError(`Please select a ${timeLabel} before proceeding.`);
        highlightField = "selectedTime";
        setIsSubmitting(false);
        setHighlightInput(highlightField);
        return;
      }

      let finalScheduledDate: Date | undefined = undefined;
      if (bookingOption === "sameday") {
        finalScheduledDate = new Date();
      } else if (bookingOption === "scheduled" && selectedDate) {
        finalScheduledDate = selectedDate;
      }
      // Build address string from manual entry and header context
      const barangayValue =
        selectedBarangay === "__other__" ? otherBarangay : selectedBarangay;

      const finalMunicipality =
        locationInputMode === "manual" ? manualCity : displayMunicipality;
      const finalProvince =
        locationInputMode === "manual" ? manualProvince : displayProvince;

      // Build final address: map pin (primary) else fallback to manual/detected structured address
      let finalAddress: string;
      if (isUsingMapPin) {
        // Base address preference: user-friendly display address if we built one; else mapLocation.address
        let base = mapDisplayAddress || mapLocation!.address?.trim() || "";
        // Ensure barangay is present (only insert if we have a barangay from fallback selection or detection and it's not already there)
        const normalizedBase = base.toLowerCase();
        if (
          barangayValue &&
          barangayValue.trim() &&
          !normalizedBase.includes(barangayValue.trim().toLowerCase())
        ) {
          // Insert barangay before city if possible
          if (finalMunicipality && base.includes(finalMunicipality)) {
            // Split at municipality occurrence
            const parts = base.split(finalMunicipality);
            base = `${parts[0].replace(/,\s*$/, "")}, ${barangayValue}, ${finalMunicipality}${parts.slice(1).join(finalMunicipality)}`;
          } else {
            base = `${base}, ${barangayValue}`;
          }
        }
        const landmarkPart = landmark ? ` (${landmark})` : "";
        finalAddress = base
          ? `${base}${landmarkPart}`
          : `Pinned Location (${mapLocation!.lat.toFixed(5)}, ${mapLocation!.lng.toFixed(5)})${landmarkPart}`;
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
      const bookingData: BookingRequest = {
        serviceId: service!.id,
        serviceName: service!.title,
        providerId: service!.providerId.toString(),
        packages: packages.filter((pkg) => pkg.checked),
        totalPrice,
        bookingType: bookingOption as "sameday" | "scheduled",
        scheduledDate: finalScheduledDate,
        scheduledTime: selectedTime, // Include selectedTime for both same-day and scheduled bookings
        location: finalAddress,
        notes: notes,
        amountToPay: parseFloat(amountPaid),
        paymentMethod: paymentMethod, // Include the selected payment method
      };
      // Append raw coordinates if map picker used
      if (mapLocation?.lat && mapLocation?.lng) {
        (bookingData as any).latitude = mapLocation.lat;
        (bookingData as any).longitude = mapLocation.lng;
        if (mapLocation.address) {
          (bookingData as any).geocodedAddress = mapLocation.address;
        }
        if (mapPreciseAddress)
          (bookingData as any).preciseAddress = mapPreciseAddress;
        if (mapDisplayAddress)
          (bookingData as any).displayAddress = mapDisplayAddress;
      }

      // Handle different payment methods
      if (paymentMethod === "GCash") {
        // For GCash payments, create a direct payment invoice first
        if (!identity) {
          setFormError("You must be logged in to make digital payments.");
          return;
        }

        // Check if provider is onboarded for direct payments
        const isProviderOnboarded = await checkProviderOnboarding(
          service!.providerId.toString(),
        );
        if (!isProviderOnboarded) {
          setFormError(
            "This provider hasn't set up direct payments yet. Please use cash payment or SRV Wallet.",
          );
          return;
        }

        const clientId = identity.getPrincipal().toString();

        // Create direct payment invoice with selected packages

        const paymentResult = await createDirectPayment({
          bookingId: `temp_${Date.now()}`, // Temporary ID, will be updated after booking creation
          clientId: clientId,
          providerId: service!.providerId.toString(),
          packages: packages,
          serviceTitle: service!.title,
          category: service!.category.name.toString(),
          bookingData: {
            ...bookingData,
            location:
              typeof bookingData.location === "string"
                ? bookingData.location
                : finalAddress, // Ensure location is string
          }, // Pass the full booking data
        });

        if (!paymentResult.success) {
          setFormError(
            paymentResult.error ||
              "Failed to create payment invoice. Please try again.",
          );
          return;
        }

        // If payment invoice was created successfully, redirect to payment
        if (paymentResult.invoiceUrl) {
          // Redirect to payment page
          window.open(paymentResult.invoiceUrl, "_blank");

          // Show a message to user about payment process
          navigate("/client/booking/payment-pending", {
            state: {
              invoiceId: paymentResult.invoiceId,
              invoiceUrl: paymentResult.invoiceUrl,
              bookingData: bookingData,
            },
          });
          return;
        }
      }

      // For cash payments and SRV Wallet, proceed with normal booking creation
      const booking = await createBookingRequest(bookingData);

      if (booking) {
        setFormError(null); // Clear error after successful booking
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setFormError(
        `An error occurred while creating the booking: ${errorMessage}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Highlight state and helper ---
  const [highlightInput, setHighlightInput] = useState<string>("");

  // --- Clear highlight when user edits the field ---
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

  // --- Scroll to error section on highlightInput change (mobile only) ---
  useEffect(() => {
    if (window.innerWidth > 768) return; // Only scroll on mobile
    let ref: HTMLElement | null = null;
    if (highlightInput === "barangay") ref = barangayRef.current;
    if (highlightInput === "otherBarangay") ref = otherBarangayRef.current;
    if (highlightInput === "street") ref = streetRef.current;
    if (highlightInput === "houseNumber") ref = houseNumberRef.current;
    if (highlightInput === "package") ref = packageSectionRef.current;
    if (highlightInput === "bookingOption" || highlightInput === "selectedTime")
      ref = bookingSectionRef.current;
    if (highlightInput === "paymentSection") ref = paymentSectionRef.current;
    if (ref) {
      setTimeout(() => {
        ref?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [highlightInput]);

  // --- Render: Booking Page Layout ---
  // Loading, error, and not found states
  if (loading)
    return <div className="p-10 text-center">Loading service details...</div>;
  if (error)
    return <div className="p-10 text-center text-red-500">{String(error)}</div>;
  if (!service)
    return <div className="p-10 text-center">Service not found.</div>;
  // Helper: Convert day index to name (for calendar)
  const dayIndexToName = (dayIndex: number): string => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[dayIndex] || "";
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <style>
        {`
        .booking-calendar-wrapper .react-datepicker { width: 100%; border: none; box-shadow: none; }
        .booking-calendar-wrapper .react-datepicker__month-container { width: 100%; }
        .booking-calendar-wrapper .react-datepicker__header { background-color: #f3f4f6; border-bottom: none; border-radius: 0.75rem 0.75rem 0 0; }
        .booking-calendar-wrapper .react-datepicker__day-names, .booking-calendar-wrapper .react-datepicker__week { display: flex; justify-content: space-around; }
        .booking-calendar-wrapper .react-datepicker__day { margin: 0.25rem; border-radius: 0.5rem; transition: background 0.2s, color 0.2s; }
        .booking-calendar-wrapper .react-datepicker__day--selected, .booking-calendar-wrapper .react-datepicker__day--keyboard-selected {
          background-color: #2563eb !important;
          color: #fff !important;
          font-weight: bold;
        }
        .booking-calendar-wrapper .react-datepicker__day--disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .booking-calendar-wrapper .react-datepicker__day:hover:not(.react-datepicker__day--disabled) {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .booking-calendar-wrapper .react-datepicker__current-month {
          font-weight: 600;
          color: #1e293b;
        }
      `}
      </style>
      <div className="flex-grow pb-36 md:pb-28">
        <div className="mx-auto max-w-5xl px-2 py-8 md:px-0">
          <div className="md:flex md:gap-x-8">
            <div className="space-y-6 md:w-1/2">
              {/* --- Highlight Select Package Section --- */}
              <div
                ref={packageSectionRef}
                className={`glass-card rounded-2xl border bg-white/70 p-6 shadow-xl backdrop-blur-md ${
                  highlightInput === "package"
                    ? "border-2 border-red-500 ring-2 ring-red-200"
                    : "border-blue-100"
                }`}
              >
                <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-blue-900">
                  <span className="mr-2 inline-block h-6 w-2 rounded-full bg-blue-400"></span>
                  Select Package(s) <span className="text-red-500">*</span>
                </h3>
                {packages.map((pkg) => (
                  <label
                    key={pkg.id}
                    className="mb-3 flex cursor-pointer items-start space-x-3 rounded-xl p-3 transition hover:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      checked={pkg.checked}
                      onChange={() => handlePackageChange(pkg.id)}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900">
                        {pkg.title}
                      </div>
                      <div className="mb-1 text-sm text-gray-600">
                        {pkg.description}
                      </div>
                      <div className="text-base font-bold text-blue-600">
                        ₱
                        {(pkg.price + (pkg.commissionFee || 0)).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
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
            </div>
            <div className="mt-8 space-y-6 md:mt-0 md:w-1/2">
              {/* --- Highlight Booking Schedule Section --- */}
              <div
                ref={bookingSectionRef}
                className={`glass-card rounded-2xl border bg-white/70 p-6 shadow-xl backdrop-blur-md ${
                  highlightInput === "bookingOption" ||
                  highlightInput === "selectedTime"
                    ? "border-2 border-red-500 ring-2 ring-red-200"
                    : "border-yellow-100"
                }`}
              >
                <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-yellow-900">
                  <span className="mr-2 inline-block h-6 w-2 rounded-full bg-yellow-400"></span>
                  Booking Schedule <span className="text-red-500">*</span>
                </h3>
                <div className="mb-4 flex gap-3">
                  <button
                    className={`flex-1 rounded-xl border p-3 text-center font-semibold shadow-sm transition-colors ${
                      !isSameDayAvailable
                        ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
                        : bookingOption === "sameday"
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:border-yellow-200 hover:bg-yellow-100"
                    }`}
                    onClick={() =>
                      isSameDayAvailable && handleBookingOptionChange("sameday")
                    }
                    disabled={!isSameDayAvailable}
                    title={
                      !isSameDayAvailable
                        ? "Same-day booking not available for this service today"
                        : ""
                    }
                  >
                    <div className="text-base font-semibold">Same Day</div>
                    {!isSameDayAvailable && (
                      <div className="text-xs text-gray-400">
                        Not Available Today
                      </div>
                    )}
                  </button>
                  <button
                    className={`flex-1 rounded-xl border p-3 text-center font-semibold shadow-sm transition-colors ${
                      bookingOption === "scheduled"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-yellow-200 hover:bg-yellow-100"
                    }`}
                    onClick={() => handleBookingOptionChange("scheduled")}
                  >
                    <div className="text-base font-semibold">Scheduled</div>
                  </button>
                </div>

                {/* --- Same Day Time Selection --- */}
                {bookingOption === "sameday" && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Select a time for today:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {checkingSlots ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                            Checking availability...
                          </div>
                        ) : availableSlots.length > 0 ? (
                          availableSlots
                            .filter((slot: any) => slot.isAvailable)
                            .map((slot: any, index: number) => {
                              const to12Hour = (t: string) => {
                                const [h, m] = t.split(":").map(Number);
                                const hour = h % 12 || 12;
                                const ampm = h < 12 ? "AM" : "PM";
                                return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
                              };
                              const time = `${slot.timeSlot.startTime}-${slot.timeSlot.endTime}`;
                              const [start, end] = time.split("-");
                              const formatted = `${to12Hour(start)} - ${to12Hour(end)}`;
                              const isSlotAvailable =
                                slotAvailability[time] !== false;

                              // Check if the time slot has passed (for same-day booking)
                              const isTimeSlotPassed = (): boolean => {
                                const now = new Date();
                                const [endHour, endMinute] =
                                  slot.timeSlot.endTime.split(":").map(Number);
                                const slotEndTime = new Date();
                                slotEndTime.setHours(endHour, endMinute, 0, 0);
                                // A slot is only "passed" if the current time is past the END of the slot
                                return now >= slotEndTime;
                              };

                              const hasTimePassed = isTimeSlotPassed();
                              const unavailableReason = hasTimePassed
                                ? "Time has passed"
                                : "This time slot is already booked";

                              return (
                                <button
                                  key={index}
                                  onClick={() =>
                                    isSlotAvailable && setSelectedTime(time)
                                  }
                                  disabled={!isSlotAvailable}
                                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                                    !isSlotAvailable
                                      ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400"
                                      : selectedTime === time
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                  }`}
                                  title={
                                    !isSlotAvailable ? unavailableReason : ""
                                  }
                                >
                                  {formatted}
                                  {!isSlotAvailable && (
                                    <span className="ml-1 text-xs">
                                      {hasTimePassed ? "(Passed)" : "(Booked)"}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                        ) : (
                          <p className="text-sm text-gray-500">
                            No available slots for today.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {bookingOption === "scheduled" && (
                  <div className="space-y-4">
                    <div className="booking-calendar-wrapper">
                      <DatePicker
                        selected={selectedDate}
                        onChange={handleDateChange}
                        minDate={
                          new Date(new Date().setDate(new Date().getDate() + 1))
                        }
                        filterDate={(date: Date) => {
                          const dayName = dayIndexToName(date.getDay());
                          return service.weeklySchedule
                            ? service.weeklySchedule.some(
                                (s) =>
                                  s.day === dayName &&
                                  s.availability.isAvailable,
                              )
                            : false;
                        }}
                        inline
                        renderCustomHeader={({
                          date,
                          decreaseMonth,
                          increaseMonth,
                          prevMonthButtonDisabled,
                          nextMonthButtonDisabled,
                        }) => (
                          <div className="flex items-center justify-between rounded-t-lg bg-gray-100 px-2 py-2">
                            <button
                              onClick={decreaseMonth}
                              disabled={prevMonthButtonDisabled}
                              className="rounded-full p-1 hover:bg-gray-200 disabled:opacity-30"
                              type="button"
                              aria-label="Previous Month"
                            >
                              <svg
                                className="h-5 w-5 text-gray-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 19l-7-7 7-7"
                                />
                              </svg>
                            </button>
                            <span className="text-base font-semibold text-gray-800">
                              {date.toLocaleString("default", {
                                month: "long",
                              })}{" "}
                              {date.getFullYear()}
                            </span>
                            <button
                              onClick={increaseMonth}
                              disabled={nextMonthButtonDisabled}
                              className="rounded-full p-1 hover:bg-gray-200 disabled:opacity-30"
                              type="button"
                              aria-label="Next Month"
                            >
                              <svg
                                className="h-5 w-5 text-gray-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                        dayClassName={(date: Date) => {
                          const isSelected =
                            selectedDate &&
                            date.toDateString() === selectedDate.toDateString();
                          const dayName = dayIndexToName(date.getDay());
                          const isAvailable = service.weeklySchedule
                            ? service.weeklySchedule.some(
                                (s) =>
                                  s.day === dayName &&
                                  s.availability.isAvailable,
                              )
                            : false;
                          return [
                            "transition-colors duration-150",
                            isSelected
                              ? "!bg-blue-600 !text-white !font-bold"
                              : "",
                            isAvailable
                              ? "hover:bg-blue-100 cursor-pointer"
                              : "opacity-40 cursor-not-allowed",
                          ].join(" ");
                        }}
                        calendarClassName="rounded-lg shadow-lg border border-gray-200 bg-white"
                        wrapperClassName="w-full"
                      />
                    </div>
                    {selectedDate && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Select a time:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {checkingSlots ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                              Checking availability...
                            </div>
                          ) : availableSlots.length > 0 ? (
                            availableSlots
                              .filter((slot: any) => slot.isAvailable)
                              .map((slot: any, index: number) => {
                                const to12Hour = (t: string) => {
                                  const [h, m] = t.split(":").map(Number);
                                  const hour = h % 12 || 12;
                                  const ampm = h < 12 ? "AM" : "PM";
                                  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
                                };
                                const time = `${slot.timeSlot.startTime}-${slot.timeSlot.endTime}`;
                                const [start, end] = time.split("-");
                                const formatted = `${to12Hour(start)} - ${to12Hour(end)}`;
                                const isSlotAvailable =
                                  slotAvailability[time] !== false;

                                return (
                                  <button
                                    key={index}
                                    onClick={() =>
                                      isSlotAvailable && setSelectedTime(time)
                                    }
                                    disabled={!isSlotAvailable}
                                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                                      !isSlotAvailable
                                        ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400"
                                        : selectedTime === time
                                          ? "border-blue-600 bg-blue-600 text-white"
                                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                    }`}
                                    title={
                                      !isSlotAvailable
                                        ? "This time slot is already booked"
                                        : ""
                                    }
                                  >
                                    {formatted}
                                    {!isSlotAvailable && (
                                      <span className="ml-1 text-xs">
                                        (Booked)
                                      </span>
                                    )}
                                  </button>
                                );
                              })
                          ) : (
                            <p className="text-sm text-gray-500">
                              No available slots for this day.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* --- Service Location Section (Detected default; custom pin/search secondary) --- */}
              <div
                className={`glass-card rounded-2xl border bg-white/70 p-6 shadow-xl backdrop-blur-md ${highlightInput === "mapLocation" ? "border-2 border-red-500 ring-2 ring-red-200" : "border-gray-100"}`}
              >
                <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
                  <span className="mr-2 inline-block h-6 w-2 rounded-full bg-gray-400"></span>
                  Service Location <span className="text-red-500">*</span>
                </h3>
                {/* Toggle buttons */}
                <div className="mb-4 flex gap-3 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setMapMode("detected")}
                    className={`flex-1 rounded-lg border px-3 py-2 transition ${mapMode === "detected" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-blue-50"}`}
                  >
                    Use Detected Location
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapMode("custom")}
                    className={`flex-1 rounded-lg border px-3 py-2 transition ${mapMode === "custom" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-blue-50"}`}
                  >
                    Pin / Search Location
                  </button>
                </div>
                {mapMode === "detected" && (
                  <div className="mb-6">
                    <div className="mb-2 text-[11px] font-medium text-gray-600">
                      Automatically detected via browser geolocation. Drop a
                      custom pin if this is inaccurate.
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      {mapsReady && geoLocation ? (
                        <Map
                          defaultCenter={{
                            lat: geoLocation.latitude,
                            lng: geoLocation.longitude,
                          }}
                          defaultZoom={16}
                          mapId="6922634ff75ae05ac38cc473"
                          style={{ width: "100%", height: 260 }}
                          disableDefaultUI={true}
                          zoomControl={true}
                        >
                          <AdvancedMarker
                            position={{
                              lat: geoLocation.latitude,
                              lng: geoLocation.longitude,
                            }}
                          />
                        </Map>
                      ) : (
                        <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                          {locationLoading || detectedStatus === "loading"
                            ? "Detecting location..."
                            : "Map loading..."}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {detectedStatus === "ok" && detectedAddress
                        ? detectedAddress
                        : detectedStatus === "failed"
                          ? "Unable to resolve address. You can switch to Pin / Search."
                          : detectedStatus === "loading" || locationLoading
                            ? "Resolving detected address..."
                            : !geoLocation
                              ? "Location not yet available."
                              : "Detected."}
                    </div>
                  </div>
                )}
                {mapMode === "custom" && (
                  <div className="mb-4">
                    <LocationMapPicker
                      value={
                        mapLocation
                          ? {
                              ...mapLocation,
                              address: mapLocation.address ?? "",
                            }
                          : null
                      }
                      onChange={(loc: any) => {
                        // Save structured map location
                        setMapLocation(loc);
                        const preciseAddressForDB =
                          loc.formatted_address || loc.address || "";
                        const placeName = loc.rawName;
                        let displayAddress = preciseAddressForDB;
                        if (
                          placeName &&
                          !preciseAddressForDB.startsWith(placeName)
                        ) {
                          displayAddress = `${placeName}, ${preciseAddressForDB}`;
                        }
                        setMapPreciseAddress(preciseAddressForDB);
                        setMapDisplayAddress(displayAddress);
                        if (highlightInput === "mapLocation")
                          setHighlightInput("");
                      }}
                      persistKey="booking:lastLocation"
                      highlight={highlightInput === "mapLocation"}
                      label="Pin / Search Location"
                    />
                    {(mapDisplayAddress || mapPreciseAddress) && (
                      <div className="mt-2 space-y-1">
                        {mapDisplayAddress && (
                          <div className="flex items-start gap-1">
                            <span
                              className="truncate text-xs font-medium text-gray-700"
                              title={mapDisplayAddress}
                            >
                              {mapDisplayAddress}
                            </span>
                            <span
                              className="cursor-help text-[10px] text-blue-500"
                              title="Display Address: Readable version (place/building, street, barangay, city)."
                            >
                              (?)
                            </span>
                          </div>
                        )}
                        {mapPreciseAddress &&
                          mapDisplayAddress &&
                          mapDisplayAddress !== mapPreciseAddress && (
                            <div className="flex items-start gap-1">
                              <span
                                className="truncate text-[10px] text-gray-500"
                                title="Precise Address: Full Google formatted address (may include plus code) stored for provider navigation."
                              >
                                Provider reference: {mapPreciseAddress}
                              </span>
                              <span
                                className="cursor-help text-[10px] text-blue-400"
                                title="Used internally to help the provider navigate accurately."
                              >
                                (i)
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}
                {!showFallbackForms && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFallbackForms(true);
                      setLocationInputMode("detected");
                    }}
                    className="mb-3 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Use Manual Address Form
                  </button>
                )}
                {showFallbackForms && (
                  <div className="mb-4 flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name="locationInputMode"
                        value="detected"
                        checked={locationInputMode === "detected"}
                        onChange={() => setLocationInputMode("detected")}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-gray-700">Use Detected</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name="locationInputMode"
                        value="manual"
                        checked={locationInputMode === "manual"}
                        onChange={() => setLocationInputMode("manual")}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-gray-700">Manual City/Prov</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFallbackForms(false);
                        setLocationInputMode("hidden");
                      }}
                      className="ml-auto text-xs text-blue-600 underline"
                    >
                      Use Maps
                    </button>
                  </div>
                )}
                {showFallbackForms && locationInputMode === "detected" ? (
                  <div className="mt-2 space-y-3">
                    <p className="text-xs text-gray-600">
                      Your location is automatically detected.
                    </p>
                    <div className="mb-2 w-full rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs text-blue-700">
                            Municipality/City
                          </label>
                          <input
                            type="text"
                            value={
                              locationLoading
                                ? "Detecting..."
                                : (displayMunicipality || "")
                                      .trim()
                                      .toLowerCase() === "baguio"
                                  ? "Baguio City"
                                  : displayMunicipality || ""
                            }
                            readOnly
                            className="w-full border-none bg-blue-50 font-semibold text-blue-900 capitalize"
                            placeholder="Municipality/City"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs text-blue-700">
                            Province
                          </label>
                          <input
                            type="text"
                            value={
                              locationLoading
                                ? "Detecting..."
                                : displayProvince ===
                                    "Cordillera Administrative Region"
                                  ? "Benguet"
                                  : displayProvince || ""
                            }
                            readOnly
                            className="w-full border-none bg-blue-50 font-semibold text-blue-900 capitalize"
                            placeholder="Province"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Barangay dropdown populated from ph_locations.json */}
                    <select
                      ref={barangayRef}
                      value={selectedBarangay}
                      onChange={(e) => setSelectedBarangay(e.target.value)}
                      className={`w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize ${
                        highlightInput === "barangay"
                          ? "border-2 border-red-500 ring-2 ring-red-200"
                          : ""
                      }`}
                    >
                      <option value="" disabled>
                        Select Barangay *
                      </option>
                      {barangayOptions
                        .filter(
                          (b) =>
                            b &&
                            b.trim().toLowerCase().replace(/\s+/g, "") !==
                              "others",
                        )
                        .map((barangay, idx) => (
                          <option key={idx} value={barangay}>
                            {barangay}
                          </option>
                        ))}
                      <option value="__other__">Others</option>
                    </select>
                    {selectedBarangay === "__other__" && (
                      <input
                        ref={otherBarangayRef}
                        type="text"
                        placeholder="Enter your Barangay *"
                        value={otherBarangay}
                        onChange={(e) => setOtherBarangay(e.target.value)}
                        className={`mt-3 w-full rounded-xl border bg-white p-3 text-sm text-gray-700 capitalize ${
                          highlightInput === "otherBarangay" ||
                          (otherBarangay &&
                            (otherBarangay.trim().length < 3 ||
                              otherBarangay.trim().length > 20))
                            ? "border-2 border-red-500 ring-2 ring-red-200"
                            : "border-blue-400"
                        }`}
                        minLength={3}
                        maxLength={20}
                        required
                      />
                    )}
                    <input
                      ref={streetRef}
                      type="text"
                      placeholder="Street Name *"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className={`w-full rounded-xl border p-3 text-sm capitalize transition-colors ${
                        !selectedBarangay
                          ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
                          : "border-gray-300 bg-white text-gray-700"
                      } ${
                        highlightInput === "street" ||
                        (street &&
                          (street.trim().length < 3 ||
                            street.trim().length > 20))
                          ? "border-2 border-red-500 ring-2 ring-red-200"
                          : ""
                      }`}
                      disabled={!selectedBarangay}
                      minLength={3}
                      maxLength={20}
                    />
                    <input
                      ref={houseNumberRef}
                      type="text"
                      placeholder="House/Unit No. *"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      className={`mt-3 w-full rounded-xl border p-3 text-sm capitalize transition-colors ${
                        !street
                          ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
                          : "border-gray-300 bg-white text-gray-700"
                      } ${
                        highlightInput === "houseNumber" ||
                        (houseNumber &&
                          (houseNumber.length > 15 || !/\d/.test(houseNumber)))
                          ? "border-2 border-red-500 ring-2 ring-red-200"
                          : ""
                      }`}
                      disabled={!street}
                      maxLength={15}
                    />
                    {/* Landmark input, always enabled */}
                    <input
                      type="text"
                      placeholder="Building / Subdivision / Sitio / etc. (optional)"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize"
                    />
                  </div>
                ) : showFallbackForms && locationInputMode === "manual" ? (
                  <div className="mt-2 space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-blue-700">
                          Province *
                        </label>
                        <select
                          value={manualProvince}
                          onChange={(e) => {
                            setManualProvince(e.target.value);
                            setManualCity("");
                          }}
                          className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize"
                        >
                          <option value="" disabled>
                            Select Province
                          </option>
                          {phLocations.provinces.map((prov: any) => (
                            <option key={prov.name} value={prov.name}>
                              {prov.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-blue-700">
                          City/Municipality *
                        </label>
                        <select
                          value={manualCity}
                          onChange={(e) => setManualCity(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize"
                          disabled={!manualProvince}
                        >
                          <option value="" disabled>
                            Select City/Municipality
                          </option>
                          {manualProvince &&
                            phLocations.provinces
                              .find(
                                (prov: any) =>
                                  prov.name.trim().toLowerCase() ===
                                  manualProvince.trim().toLowerCase(),
                              )
                              ?.municipalities.map((muni: any) => (
                                <option key={muni.name} value={muni.name}>
                                  {muni.name}
                                </option>
                              ))}
                        </select>
                      </div>
                    </div>
                    {/* Barangay dropdown for manual selection */}
                    <select
                      ref={barangayRef}
                      value={selectedBarangay}
                      onChange={(e) => setSelectedBarangay(e.target.value)}
                      className={`w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize ${
                        highlightInput === "barangay"
                          ? "border-2 border-red-500 ring-2 ring-red-200"
                          : ""
                      }`}
                      disabled={!manualCity}
                    >
                      <option value="" disabled>
                        Select Barangay *
                      </option>
                      {manualBarangayOptions.map((barangay, idx) => (
                        <option key={idx} value={barangay}>
                          {barangay}
                        </option>
                      ))}
                      <option value="__other__">Others</option>
                    </select>
                    {selectedBarangay === "__other__" && (
                      <input
                        ref={otherBarangayRef}
                        type="text"
                        placeholder="Enter your Barangay *"
                        value={otherBarangay}
                        onChange={(e) => setOtherBarangay(e.target.value)}
                        className={`mt-3 w-full rounded-xl border bg-white p-3 text-sm text-gray-700 capitalize ${
                          highlightInput === "otherBarangay" ||
                          (otherBarangay &&
                            (otherBarangay.trim().length < 3 ||
                              otherBarangay.trim().length > 20))
                            ? "border-2 border-red-500 ring-2 ring-red-200"
                            : "border-blue-400"
                        }`}
                        minLength={3}
                        maxLength={20}
                        required
                      />
                    )}
                    <input
                      ref={streetRef}
                      type="text"
                      placeholder="Street Name *"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className={`w-full rounded-xl border p-3 text-sm capitalize transition-colors ${
                        !selectedBarangay
                          ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
                          : "border-gray-300 bg-white text-gray-700"
                      } ${
                        highlightInput === "street" ||
                        (street &&
                          (street.trim().length < 3 ||
                            street.trim().length > 20))
                          ? "border-2 border-red-500 ring-2 ring-red-200"
                          : ""
                      }`}
                      disabled={!selectedBarangay}
                      minLength={3}
                      maxLength={20}
                    />
                    <input
                      ref={houseNumberRef}
                      type="text"
                      placeholder="House/Unit No. *"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      className={`mt-3 w-full rounded-xl border p-3 text-sm capitalize transition-colors ${
                        !street
                          ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
                          : "border-gray-300 bg-white text-gray-700"
                      } ${
                        highlightInput === "houseNumber" ||
                        (houseNumber &&
                          (houseNumber.length > 15 || !/\d/.test(houseNumber)))
                          ? "border-2 border-red-500 ring-2 ring-red-200"
                          : ""
                      }`}
                      disabled={!street}
                      maxLength={15}
                    />
                    {/* Landmark input, always enabled */}
                    <input
                      type="text"
                      placeholder="Building / Subdivision / Sitio / etc. (optional)"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm capitalize"
                    />
                  </div>
                ) : null}
              </div>
              <div className="glass-card rounded-2xl border border-blue-100 bg-white/70 p-6 shadow-xl backdrop-blur-md">
                <h3 className="mb-4 flex items-center text-xl font-bold text-blue-900">
                  <span className="mr-2 inline-block h-6 w-2 rounded-full bg-blue-400"></span>
                  Notes for Provider{" "}
                  <span className="text-base font-normal text-gray-400">
                    (Optional)
                  </span>
                </h3>
                <textarea
                  placeholder="e.g., Beware of the dog, please bring a ladder, etc. (max 30 characters)"
                  value={notes}
                  onChange={handleNotesChange}
                  rows={4}
                  maxLength={NOTES_CHAR_LIMIT}
                  className="w-full rounded-xl border border-gray-200 bg-white/80 p-3 text-base shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
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
            </div>
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 z-20 border-t bg-white/80 p-4 shadow-xl backdrop-blur-md">
        <div className="mx-auto max-w-md">
          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-base text-red-700 shadow-sm">
              {formError}
            </div>
          )}
          <button
            onClick={handleConfirmBooking}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-yellow-400 px-8 py-4 text-lg font-bold text-white shadow-lg transition-colors hover:from-yellow-400 hover:to-blue-600 disabled:bg-gray-300 disabled:text-gray-400"
          >
            {isSubmitting && (
              <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
            )}
            {isSubmitting ? "Submitting..." : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientBookingPageComponent;
