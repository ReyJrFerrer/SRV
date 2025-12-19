import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Toaster } from "sonner";
import BookingDrafts from "../../../components/client/BookingDrafts";
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
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// Simple lockable wrapper: just blur + disable interactions when locked
const LockableSection: React.FC<{
  locked: boolean;
  lockReason?: string;
  children: React.ReactNode;
}> = ({ locked, children }) => {
  return (
    <div className={locked ? "pointer-events-none opacity-50 blur-sm" : ""}>
      {children}
    </div>
  );
};
import PaymentSection from "../../../components/client/booking/PaymentSection";
import PackagesSection from "../../../components/client/booking/PackagesSection";
import ScheduleSection from "../../../components/client/booking/ScheduleSection";
import ServiceLocationSection from "../../../components/client/booking/ServiceLocationSection";
import NotesSection from "../../../components/client/booking/NotesSection";
import ProblemMediaSection from "../../../components/client/booking/ProblemMediaSection";
import StickyConfirmBar from "../../../components/client/booking/StickyConfirmBar";
import { uploadProblemProofMedia } from "../../../services/mediaService";

const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: serviceId } = useParams<{ id: string }>();

  // Section: Setup
  useEffect(() => {
    document.title = "Book Service | SRV";
  }, []);

  // Section: Auth and stores
  const { identity } = useAuth();

  // Section: Location store
  const {
    userAddress,
    userProvince,
    locationLoading,
    requestLocation,
    location: geoLocation,
  } = useLocationStore();

  // Section: Refs
  const barangayRef = useRef<HTMLSelectElement>(null);
  const otherBarangayRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const houseNumberRef = useRef<HTMLInputElement>(null);
  const packageSectionRef = useRef<HTMLDivElement>(null);
  const bookingSectionRef = useRef<HTMLDivElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const locationMobileRef = useRef<HTMLDivElement>(null);
  const notesMobileRef = useRef<HTMLDivElement>(null);

  // Section: State
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
  const [problemMediaFiles, setProblemMediaFiles] = useState<File[]>([]);
  const NOTES_CHAR_LIMIT = 50;
  const problemMediaSectionRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "CashOnHand" | "GCash" | "SRVWallet"
  >("CashOnHand");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProviderOnboarded, setIsProviderOnboarded] =
    useState<boolean>(false);

  // Section: Effects - initialization
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const displayMunicipality = userAddress || "";
  const displayProvince = userProvince || "";

  // Helper: strip plus-code tokens from addresses (e.g. "2CFX+WPX")
  const stripPlusCodes = (addr: string) => {
    if (!addr) return "";
    try {
      const plusCodeRegex = /^[A-Z0-9]{1,}\+[A-Z0-9]{1,}$/i;
      const parts = addr
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const filtered = parts.filter((p) => !plusCodeRegex.test(p));
      return filtered.join(", ").trim();
    } catch {
      return addr;
    }
  };

  // Section: Hooks - service & bookings
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

  // Section: Location state
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

  // Section: Drafts
  const DRAFT_KEY_PREFIX = "booking_draft_v1_";
  interface BookingDraft {
    packages: { id: string; checked: boolean }[];
    bookingOption: "sameday" | "scheduled" | null;
    selectedDate: string | null;
    // selectedTime removed to prevent restoring invalid slots
    street: string;
    houseNumber: string;
    landmark: string;
    notes: string;
    paymentMethod: "CashOnHand" | "GCash" | "SRVWallet";
    amountPaid: string;
    selectedBarangay: string;
    otherBarangay: string;
    locationInputMode: "detected" | "manual" | "hidden";
    manualProvince: string;
    manualCity: string;
    mapLocation: { lat: number; lng: number; address?: string } | null;
    mapPreciseAddress: string;
    mapDisplayAddress: string;
    timestamp: number;
  }
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [parsedDraft, setParsedDraft] = useState<BookingDraft | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const draftKey = serviceId ? `${DRAFT_KEY_PREFIX}${serviceId}` : null;
  // Section: UX helpers
  const userTouchedRef = useRef<boolean>(false);
  const suppressDraftSaveRef = useRef<boolean>(false);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  const saveDraftImmediate = useCallback(() => {
    if (suppressDraftSaveRef.current) return;
    if (!draftKey) return;
    try {
      const payload: BookingDraft = {
        packages: packages.map((p) => ({ id: p.id, checked: !!p.checked })),
        bookingOption,
        selectedDate: selectedDate ? selectedDate.toISOString() : null,
        street,
        houseNumber,
        landmark,
        notes,
        paymentMethod,
        amountPaid,
        selectedBarangay,
        otherBarangay,
        locationInputMode,
        manualProvince,
        manualCity,
        mapLocation,
        mapPreciseAddress,
        mapDisplayAddress,
        timestamp: Date.now(),
      };

      const isMeaningfulDraft = (d: BookingDraft) => {
        try {
          if (d.packages && d.packages.some((p) => p.checked)) return true;
          if (d.bookingOption) return true;
          if (d.selectedDate) return true;
          // if (d.selectedTime && d.selectedTime.trim()) return true; // removed
          if (d.street && d.street.trim()) return true;
          if (d.houseNumber && d.houseNumber.trim()) return true;
          if (d.landmark && d.landmark.trim()) return true;
          if (d.notes && d.notes.trim()) return true;
          if (d.amountPaid && d.amountPaid.trim()) return true;
          if (d.selectedBarangay && d.selectedBarangay.trim()) return true;
          if (d.otherBarangay && d.otherBarangay.trim()) return true;

          return false;
        } catch {
          return false;
        }
      };

      if (!userTouchedRef.current && !isMeaningfulDraft(payload)) return;

      localStorage.setItem(draftKey, JSON.stringify(payload));
      setLastSavedAt(Date.now());
    } catch (err) {
      // ignore storage errors
    }
  }, [
    draftKey,
    packages,
    bookingOption,
    selectedDate,
    // selectedTime, // removed
    street,
    houseNumber,
    landmark,
    notes,
    paymentMethod,
    amountPaid,
    selectedBarangay,
    otherBarangay,
    locationInputMode,
    manualProvince,
    manualCity,
    mapLocation,
    mapPreciseAddress,
    mapDisplayAddress,
  ]);

  useEffect(() => {
    return () => {
      try {
        saveDraftImmediate();
      } catch {
        //
      }
    };
  }, [saveDraftImmediate]);
  useEffect(() => {
    const el = pageContainerRef.current;
    if (!el) return;
    const mark = () => (userTouchedRef.current = true);
    el.addEventListener("input", mark);
    el.addEventListener("change", mark);
    el.addEventListener("click", mark);
    el.addEventListener("touchstart", mark, { passive: true });
    return () => {
      el.removeEventListener("input", mark);
      el.removeEventListener("change", mark);
      el.removeEventListener("click", mark);
      el.removeEventListener("touchstart", mark as any);
    };
  }, []);

  // Section: Effects - autosave
  useEffect(() => {
    if (!draftKey) return;
    const t = setTimeout(() => saveDraftImmediate(), 700);
    return () => clearTimeout(t);
  }, [saveDraftImmediate, draftKey]);

  useEffect(() => {
    const onUnload = () => saveDraftImmediate();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [saveDraftImmediate]);

  // Section: Effects - restore draft
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as BookingDraft;

        const hasInputs = (() => {
          try {
            if (parsed.packages && parsed.packages.some((p) => p.checked))
              return true;
            if (parsed.bookingOption) return true;
            if (parsed.selectedDate) return true;
            // if (parsed.selectedTime && parsed.selectedTime.trim()) return true; // removed
            if (parsed.street && parsed.street.trim()) return true;
            if (parsed.houseNumber && parsed.houseNumber.trim()) return true;
            if (parsed.landmark && parsed.landmark.trim()) return true;
            if (parsed.notes && parsed.notes.trim()) return true;
            if (parsed.amountPaid && parsed.amountPaid.trim()) return true;
            if (parsed.selectedBarangay && parsed.selectedBarangay.trim())
              return true;
            if (parsed.otherBarangay && parsed.otherBarangay.trim())
              return true;
            return false;
          } catch {
            return false;
          }
        })();

        if (hasInputs) {
          setParsedDraft(parsed);
          setShowRestorePrompt(true);
        } else {
          try {
            localStorage.removeItem(draftKey);
          } catch {}
        }
      }
    } catch (err) {
      //
    }
  }, [draftKey]);

  const handleUseDraft = () => {
    if (!parsedDraft) return setShowRestorePrompt(false);
    try {
      setPackages((prev) =>
        prev.map((p) => {
          const matched = parsedDraft.packages.find((x) => x.id === p.id);
          return matched ? { ...p, checked: !!matched.checked } : p;
        }),
      );
      setBookingOption(parsedDraft.bookingOption);
      setSelectedDate(
        parsedDraft.selectedDate ? new Date(parsedDraft.selectedDate) : null,
      );
      // setSelectedTime(parsedDraft.selectedTime || ""); // removed
      setStreet(parsedDraft.street || "");
      setHouseNumber(parsedDraft.houseNumber || "");
      setLandmark(parsedDraft.landmark || "");
      setNotes(parsedDraft.notes || "");
      setPaymentMethod(parsedDraft.paymentMethod || "CashOnHand");
      setAmountPaid(parsedDraft.amountPaid || "");
      setSelectedBarangay(parsedDraft.selectedBarangay || "");
      setOtherBarangay(parsedDraft.otherBarangay || "");
      setLocationInputMode(parsedDraft.locationInputMode || "hidden");
      setManualProvince(parsedDraft.manualProvince || "");
      setManualCity(parsedDraft.manualCity || "");
      setMapLocation(parsedDraft.mapLocation || null);
      setMapPreciseAddress(parsedDraft.mapPreciseAddress || "");
      setMapDisplayAddress(parsedDraft.mapDisplayAddress || "");
    } catch (err) {
      //
    } finally {
      setShowRestorePrompt(false);
    }
  };

  const handleDiscardDraft = () => {
    // prevent immediate re-save while removing the draft
    suppressDraftSaveRef.current = true;
    try {
      if (draftKey) localStorage.removeItem(draftKey);
    } catch {}
    // allow saves again on next tick
    setTimeout(() => (suppressDraftSaveRef.current = false), 50);
    setParsedDraft(null);
    setShowRestorePrompt(false);
  };

  // Section: Effects - maps readiness
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

  // Section: Effects - reverse geocode
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
          const cleaned = stripPlusCodes(addr);
          setDetectedAddress(cleaned);
          setDetectedStatus("ok");
          setMapLocation(
            (prev) => prev ?? { lat: loc.lat, lng: loc.lng, address: cleaned },
          );
          if (!mapPreciseAddress) setMapPreciseAddress(cleaned);
          if (!mapDisplayAddress) setMapDisplayAddress(cleaned);
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

  // Section: Effects - manual barangays
  useEffect(() => {
    try {
      if (!manualProvince) {
        setManualBarangayOptions([]);
        setSelectedBarangay("");
        return;
      }

      const provinceObj = (phLocations as any).provinces.find(
        (prov: any) =>
          prov.name.trim().toLowerCase() ===
          manualProvince.trim().toLowerCase(),
      );

      if (!provinceObj || !Array.isArray(provinceObj.municipalities)) {
        setManualBarangayOptions([]);
        setSelectedBarangay("");
        return;
      }

      const muniObj = provinceObj.municipalities.find(
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
        setSelectedBarangay("");
        return;
      }

      const firstMuni = provinceObj.municipalities[0];
      if (firstMuni && firstMuni.name) {
        setManualCity(firstMuni.name);
        if (Array.isArray(firstMuni.barangays)) {
          setManualBarangayOptions(
            firstMuni.barangays.filter(
              (b: string) =>
                b && b.trim().toLowerCase().replace(/\s+/g, "") !== "others",
            ),
          );
        } else {
          setManualBarangayOptions([]);
        }
      } else {
        setManualBarangayOptions([]);
      }
      setSelectedBarangay("");
    } catch {
      setManualBarangayOptions([]);
      setSelectedBarangay("");
    }
  }, [manualProvince, manualCity]);

  // Section: Effects - detected barangays
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

  // Section: Effects - load service
  useEffect(() => {
    if (serviceId) loadServiceData(serviceId);
  }, [serviceId, loadServiceData]);

  // Section: Effects - provider onboarding
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

  // Section: Effects - slots
  useEffect(() => {
    if (!service) return;
    if (bookingOption === "scheduled" && selectedDate) {
      getAvailableSlots(service.id, selectedDate);
    } else if (bookingOption === "sameday") {
      const date = new Date();
      getAvailableSlots(service.id, date);
    }
  }, [service, selectedDate, bookingOption, getAvailableSlots]);

  // Section: Effects - check slot availability
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

  // Section: Handlers
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
    if (highlightInput === "problemMedia" && problemMediaFiles.length > 0)
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
    problemMediaFiles,
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
    if (highlightInput === "problemMedia")
      ref = problemMediaSectionRef.current as any;
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

      // Require problem proof for repair-like categories
      const isRepairCategory = (name?: string) => {
        if (!name) return false;
        const n = name.toLowerCase();
        return (
          n.includes("repair") ||
          n.includes("technician") ||
          n.includes("gadget") ||
          n.includes("appliance") ||
          n.includes("automobile") ||
          n.includes("mechanic") ||
          n.includes("car") ||
          n.includes("motor")
        );
      };
      const requiresProof = isRepairCategory(service?.category?.name as any);
      if (requiresProof && problemMediaFiles.length === 0) {
        setFormError(
          "Please attach at least one photo or a short video showing the problem.",
        );
        highlightField = "problemMedia";
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

      // Upload proof media (if any) and attach to booking payload
      let proofUrls: string[] = [];
      if (problemMediaFiles.length > 0) {
        try {
          proofUrls = await uploadProblemProofMedia(problemMediaFiles);
        } catch (e: any) {
          setFormError(
            e?.message ||
              "Failed to upload attachments. Please remove large files or try again.",
          );
          setIsSubmitting(false);
          return;
        }
      }
      if (proofUrls.length > 0) {
        (bookingData as any).attachments = proofUrls;
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
          attachments: (bookingData as any)?.attachments || proofUrls || [],
        };
        // clear saved draft for this service now that booking succeeded
        try {
          // prevent component-unmount autosave from recreating the draft
          suppressDraftSaveRef.current = true;
          if (draftKey) localStorage.removeItem(draftKey);
        } catch (err) {
          // ignore
        }
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

  // Section gating helpers (plain computed values to avoid hook order issues)
  const packagesComplete = packages.some((p) => p.checked);
  const scheduleComplete = !!bookingOption && !!selectedTime;
  const isUsingMapPin =
    !showFallbackForms && !!(mapLocation && mapLocation.lat && mapLocation.lng);
  const isManualLocationValid = (() => {
    try {
      if (!selectedBarangay.trim()) return false;
      if (
        selectedBarangay === "__other__" &&
        (!otherBarangay ||
          otherBarangay.trim().length < 3 ||
          otherBarangay.trim().length > 20)
      )
        return false;
      if (street.trim().length < 3 || street.trim().length > 20) return false;
      if (
        !houseNumber.trim() ||
        houseNumber.length > 15 ||
        !/\d/.test(houseNumber)
      )
        return false;
      return true;
    } catch {
      return false;
    }
  })();
  const locationComplete = isUsingMapPin || isManualLocationValid;
  const paymentComplete = (() => {
    if (!packagesComplete) return false;
    if (!paymentMethod) return false;
    if (paymentMethod === "CashOnHand") {
      return !!amountPaid.trim() && !paymentError;
    }
    return true;
  })();
  const requiresProof = (() => {
    const name = (service?.category?.name as any) || "";
    const n = String(name).toLowerCase();
    return (
      n.includes("repair") ||
      n.includes("technician") ||
      n.includes("gadget") ||
      n.includes("appliance") ||
      n.includes("automobile") ||
      n.includes("mechanic") ||
      n.includes("car") ||
      n.includes("motor")
    );
  })();
  const problemPhotosComplete = requiresProof
    ? problemMediaFiles.length > 0
    : true;
  const notesPreconditionsComplete =
    packagesComplete &&
    scheduleComplete &&
    locationComplete &&
    paymentComplete &&
    problemPhotosComplete;

  // Mobile step gating: show only up to the current incomplete step
  const currentMobileStep = (() => {
    if (!packagesComplete) return 0; // Packages
    if (!scheduleComplete) return 1; // Schedule
    if (!locationComplete) return 2; // Location
    if (!paymentComplete) return 3; // Payment
    if (!problemPhotosComplete) return 4; // Problem Photos (if required)
    return 5; // Notes
  })();

  // Pop-up effect for newly unlocked sections (mobile)
  const prevMobileStepRef = useRef<number>(currentMobileStep);
  const [popIndex, setPopIndex] = useState<number | null>(null);
  useEffect(() => {
    const prev = prevMobileStepRef.current;
    if (currentMobileStep > prev) {
      setPopIndex(currentMobileStep);
      // Auto-scroll the newly unlocked section into view on mobile
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        setTimeout(() => {
          let target: HTMLElement | null = null;
          if (currentMobileStep === 1) target = bookingSectionRef.current as any;
          else if (currentMobileStep === 2) target = locationMobileRef.current as any;
          else if (currentMobileStep === 3) target = paymentSectionRef.current as any;
          else if (currentMobileStep === 4) target = problemMediaSectionRef.current as any;
          else if (currentMobileStep === 5) target = notesMobileRef.current as any;
          try {
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch {}
        }, 120);
      }
      const t = setTimeout(() => setPopIndex(null), 600);
      prevMobileStepRef.current = currentMobileStep;
      return () => clearTimeout(t);
    }
    prevMobileStepRef.current = currentMobileStep;
  }, [currentMobileStep]);

  if (!serviceId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
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
        <main className="flex-1">
          <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-yellow-50">
            {/* Header Skeleton */}
            <header className="fixed md:sticky top-0 inset-x-0 z-40 border-b border-gray-200 bg-white shadow-sm">
              <div className="relative flex w-full items-center px-5 py-4">
                <div className="mr-4 h-6 w-6 animate-pulse rounded bg-gray-300"></div>
                <div className="absolute left-1/2 h-7 w-32 -translate-x-1/2 animate-pulse rounded bg-gray-300"></div>
              </div>
            </header>

            <div className="flex-grow pb-28 pt-16 md:pt-0">
              <div className="mx-auto max-w-5xl px-2 py-8 md:px-8">
                <div className="md:flex md:gap-x-8">
                  {/* Left Column Skeleton */}
                  <div className="space-y-6 md:w-1/2">
                    {/* Packages Section Skeleton */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
                      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-300"></div>
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4"
                          >
                            <div className="h-5 w-5 animate-pulse rounded border-2 border-gray-300 bg-gray-100"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-5 w-3/4 animate-pulse rounded bg-gray-300"></div>
                              <div className="h-4 w-full animate-pulse rounded bg-gray-300"></div>
                              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-300"></div>
                            </div>
                            <div className="h-6 w-20 animate-pulse rounded bg-gray-300"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Service Location Section Skeleton */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
                      <div className="mb-4 h-6 w-48 animate-pulse rounded bg-gray-300"></div>
                      {/* Map Skeleton */}
                      <div className="mb-4 h-64 w-full animate-pulse rounded-lg bg-gray-300"></div>
                      {/* Address Inputs Skeleton */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="h-4 w-24 animate-pulse rounded bg-gray-300"></div>
                          <div className="h-10 w-full animate-pulse rounded border border-gray-200 bg-gray-100"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 animate-pulse rounded bg-gray-300"></div>
                          <div className="h-10 w-full animate-pulse rounded border border-gray-200 bg-gray-100"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-300"></div>
                            <div className="h-10 w-full animate-pulse rounded border border-gray-200 bg-gray-100"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-28 animate-pulse rounded bg-gray-300"></div>
                            <div className="h-10 w-full animate-pulse rounded border border-gray-200 bg-gray-100"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Skeleton */}
                  <div className="mt-8 space-y-6 md:mt-0 md:w-1/2">
                    {/* Schedule Section Skeleton */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
                      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-300"></div>
                      {/* Booking Option Buttons Skeleton */}
                      <div className="mb-6 flex gap-3">
                        <div className="h-12 flex-1 animate-pulse rounded-lg bg-gray-300"></div>
                        <div className="h-12 flex-1 animate-pulse rounded-lg bg-gray-300"></div>
                      </div>
                      {/* Calendar Skeleton */}
                      <div className="mb-6 h-64 w-full animate-pulse rounded-lg bg-gray-200"></div>
                      {/* Time Slots Skeleton */}
                      <div className="space-y-2">
                        <div className="h-5 w-32 animate-pulse rounded bg-gray-300"></div>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                              key={i}
                              className="h-10 animate-pulse rounded-lg bg-gray-200"
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Payment Section Skeleton (Desktop) */}
                    <div className="hidden md:block">
                      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
                        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-300"></div>
                        {/* Payment Method Buttons Skeleton */}
                        <div className="mb-4 flex gap-2">
                          <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-300"></div>
                          <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-300"></div>
                          <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-300"></div>
                        </div>
                        {/* Amount Input Skeleton */}
                        <div className="space-y-2">
                          <div className="h-4 w-32 animate-pulse rounded bg-gray-300"></div>
                          <div className="h-12 w-full animate-pulse rounded border border-gray-200 bg-gray-100"></div>
                        </div>
                        {/* Total Price Skeleton */}
                        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                          <div className="h-5 w-24 animate-pulse rounded bg-gray-300"></div>
                          <div className="h-6 w-32 animate-pulse rounded bg-gray-300"></div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Section Skeleton (Mobile) */}
                    <div className="mt-4 md:hidden">
                      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
                        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-300"></div>
                        <div className="mb-4 flex gap-2">
                          <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-300"></div>
                          <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-300"></div>
                          <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-300"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 animate-pulse rounded bg-gray-300"></div>
                          <div className="h-12 w-full animate-pulse rounded border border-gray-200 bg-gray-100"></div>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                          <div className="h-5 w-24 animate-pulse rounded bg-gray-300"></div>
                          <div className="h-6 w-32 animate-pulse rounded bg-gray-300"></div>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section Skeleton */}
                    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-md">
                      <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-300"></div>
                      <div className="h-24 w-full animate-pulse rounded border border-gray-200 bg-gray-100"></div>
                      <div className="mt-2 h-4 w-20 animate-pulse rounded bg-gray-300"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Bar Skeleton */}
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-300 bg-white/80 p-4 shadow-xl backdrop-blur-md">
              <div className="relative mx-auto max-w-5xl">
                <div className="h-12 w-full animate-pulse rounded-xl bg-gray-300"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  if (error)
    return <div className="p-10 text-center text-red-500">{String(error)}</div>;
  if (!service)
    return <div className="p-10 text-center">Service not found.</div>;

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Centralized BookingDrafts component handles modal + toasts */}
      <BookingDrafts
        isOpen={showRestorePrompt}
        onClose={() => setShowRestorePrompt(false)}
        onRestore={handleUseDraft}
        onDiscard={handleDiscardDraft}
      />
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

          @keyframes popIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .animate-pop { animation: popIn 240ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        `}</style>
          <header className="fixed md:sticky top-0 inset-x-0 z-40 border-b border-gray-200 bg-white shadow-sm">
            <div className="relative flex w-full items-center px-5 py-4">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 flex-shrink-0 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
              </button>
              <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold tracking-tight text-black">
                Book Service
              </h1>
            </div>
          </header>

          <div className="flex-grow pb-28 pt-16 md:pt-0" ref={pageContainerRef}>
            <div className="mx-auto max-w-5xl px-2 py-8 md:px-8">
              <div className="md:flex md:gap-x-8">
                {/* Left column (Desktop): Packages → Schedule → Location */}
                <div className="space-y-6 md:w-1/2">
                  <PackagesSection
                    packages={packages}
                    onToggle={handlePackageChange}
                    highlight={highlightInput === "package"}
                    innerRef={packageSectionRef}
                  />

                  {/* Desktop: Schedule locked until Packages complete */}
                  <div className="hidden md:block">
                    <LockableSection
                      locked={!packagesComplete}
                      lockReason="complete Packages first"
                    >
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
                    </LockableSection>
                  </div>

                  {/* Location locked until Schedule complete (Desktop) */}
                  <div className="hidden md:block">
                    <LockableSection
                      locked={!packagesComplete || !scheduleComplete}
                      lockReason={
                        !packagesComplete
                          ? "complete Packages first"
                          : "complete Schedule first"
                      }
                    >
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
                    </LockableSection>
                  </div>
                </div>

                {/* Right column (Desktop): Payment → Problem Photos → Notes */}
                <div className="mt-8 space-y-6 md:mt-0 md:w-1/2">
                  {/* Desktop: Payment locked until Location complete */}
                  <div className="hidden md:block">
                    <LockableSection
                      locked={
                        !(
                          packagesComplete &&
                          scheduleComplete &&
                          locationComplete
                        )
                      }
                      lockReason={
                        !packagesComplete
                          ? "complete Packages first"
                          : !scheduleComplete
                            ? "complete Schedule first"
                            : "complete Location first"
                      }
                    >
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
                    </LockableSection>
                  </div>

                  {/* Desktop: Problem Photos locked until Payment complete */}
                  <div className="hidden md:block" ref={problemMediaSectionRef}>
                    <LockableSection
                      locked={!paymentComplete}
                      lockReason="complete Payment first"
                    >
                      <ProblemMediaSection
                        files={problemMediaFiles}
                        onFilesChange={setProblemMediaFiles}
                        required={requiresProof}
                        highlight={highlightInput === "problemMedia"}
                      />
                    </LockableSection>
                  </div>

                  {/* Desktop: Notes locked until all prior sections complete */}
                  <div className="hidden md:block">
                    <LockableSection locked={!notesPreconditionsComplete}>
                      <div className="mb-6">
                        <NotesSection
                          notes={notes}
                          onChange={handleNotesChange}
                          limit={NOTES_CHAR_LIMIT}
                        />
                      </div>
                    </LockableSection>
                  </div>

                  {/* Mobile sequence: Packages (above), Schedule, Location, Payment, Photos, Notes */}
                  {/* Mobile: Show Schedule only when Packages are complete */}
                  {currentMobileStep >= 1 && (
                    <div className={`md:hidden ${popIndex === 1 ? "animate-pop" : ""}`}>
                      <LockableSection locked={!packagesComplete}>
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
                      </LockableSection>
                    </div>
                  )}

                  {/* Mobile: Show Location only when Schedule is complete */}
                  {currentMobileStep >= 2 && (
                    <div className={`md:hidden ${popIndex === 2 ? "animate-pop" : ""}`} ref={locationMobileRef}>
                      <LockableSection locked={!(packagesComplete && scheduleComplete)}>
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
                      </LockableSection>
                    </div>
                  )}

                  {/* Mobile: Show Payment only when Location is complete */}
                  {currentMobileStep >= 3 && (
                  <div className={`mt-4 md:hidden ${popIndex === 3 ? "animate-pop" : ""}`}>
                    <LockableSection
                      locked={
                        !(
                          packagesComplete &&
                          locationComplete &&
                          scheduleComplete
                        )
                      }
                      lockReason={
                        !packagesComplete
                          ? "complete Packages first"
                          : !locationComplete
                            ? "complete Location first"
                            : "complete Schedule first"
                      }
                    >
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
                    </LockableSection>
                  </div>
                  )}

                  {/* Mobile: Show Problem Photos only when Payment complete and required */}
                  {requiresProof && currentMobileStep >= 4 && (
                    <div className={`mb-6 md:hidden ${popIndex === 4 ? "animate-pop" : ""}`} ref={problemMediaSectionRef}>
                      <LockableSection
                        locked={!paymentComplete}
                        lockReason="complete Payment first"
                      >
                        <ProblemMediaSection
                          files={problemMediaFiles}
                          onFilesChange={setProblemMediaFiles}
                          required={requiresProof}
                          highlight={highlightInput === "problemMedia"}
                        />
                      </LockableSection>
                    </div>
                  )}

                  {/* Mobile: Show Notes only when all prior sections complete */}
                  {currentMobileStep >= 5 && (
                    <div className={`mb-6 md:hidden ${popIndex === 5 ? "animate-pop" : ""}`} ref={notesMobileRef}>
                      <LockableSection locked={!notesPreconditionsComplete}>
                        <NotesSection
                          notes={notes}
                          onChange={handleNotesChange}
                          limit={NOTES_CHAR_LIMIT}
                        />
                      </LockableSection>
                    </div>
                  )}
                </div>
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-300 bg-white/80 p-4 shadow-xl backdrop-blur-md">
                  <div className="relative mx-auto max-w-5xl">
                    {lastSavedAt && (
                      <div className="absolute left-4 top-3 hidden text-xs text-gray-600 sm:block">
                        Saved • {timeAgo(lastSavedAt)}
                      </div>
                    )}
                    <StickyConfirmBar
                      formError={formError}
                      isSubmitting={isSubmitting}
                      onConfirm={handleConfirmBooking}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;
