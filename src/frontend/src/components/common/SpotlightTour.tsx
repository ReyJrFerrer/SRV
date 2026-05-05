import React, { useState, useEffect, useRef } from "react";
import {
  Joyride,
  EventData,
  STATUS,
  Step,
  TooltipRenderProps,
} from "react-joyride";
import {
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

export type FlowType =
  | "client"
  | "provider"
  | "client-service"
  | "client-bookings"
  | "client-booking-details"
  | "client-ratings"
  | "client-profile"
  | "client-receipt"
  | "provider-bookings"
  | "provider-services";

interface SpotlightTourProps {
  flowType: FlowType;
  onTourComplete?: () => void;
}

interface CustomStep extends Step {
  image?: string;
  headline?: string;
}

function WelcomeModal({
  onStart,
  onSkip,
  flowTitle,
}: {
  onStart: () => void;
  onSkip: () => void;
  flowTitle: string;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onSkip]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSkip();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div
        ref={modalRef}
        className="animate-in fade-in zoom-in-95 relative w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] duration-300 sm:max-w-md"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-center sm:p-8">
          <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>

          <button
            onClick={onSkip}
            className="absolute right-3 top-3 rounded-full bg-black/10 p-2 text-white/90 transition-all hover:bg-black/20 hover:text-white sm:right-4 sm:top-4"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 shadow-inner backdrop-blur-sm sm:mb-5 sm:h-28 sm:w-28">
            <img
              src="/images/srv characters (SVG)/tutor.svg"
              alt="Sir V"
              className="h-20 w-20 animate-bounce object-contain drop-shadow-md sm:h-24 sm:w-24"
            />
          </div>
          <div className="mb-3 inline-block rounded-full border border-white/20 bg-white/20 px-3 py-1 shadow-sm backdrop-blur-md sm:mb-3 sm:px-4 sm:py-1.5">
            <p className="text-xs font-bold tracking-wide text-white sm:text-sm">
              Hi, I'm Sir V!
            </p>
          </div>
          <h1
            id="welcome-title"
            className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-2xl"
          >
            {flowTitle}
          </h1>
          <p className="mt-1.5 text-xs font-medium text-blue-100 sm:mt-2 sm:text-sm">
            I'll be your tour guide through SRV!
          </p>
        </div>
        <div className="px-5 py-5 text-center sm:px-8 sm:py-7">
          <p className="mb-5 text-xs leading-relaxed text-gray-500 sm:mb-7 sm:text-sm">
            We'll walk you through the key features in just a few simple steps.
            Ready to explore?
          </p>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:gap-3">
            <button
              ref={startButtonRef}
              onClick={onSkip}
              className="flex-1 rounded-2xl border-2 border-gray-100 bg-white py-3 text-xs font-bold text-gray-500 transition-all hover:border-gray-200 hover:bg-gray-50 hover:text-gray-700 active:scale-[0.98] sm:py-3.5 sm:text-sm"
            >
              Maybe Later
            </button>
            <button
              onClick={onStart}
              className="flex-1 rounded-2xl bg-blue-600 py-3 text-xs font-bold text-white shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-700 hover:shadow-[0_12px_20px_-6px_rgba(37,99,235,0.5)] active:scale-[0.98] sm:py-3.5 sm:text-sm"
            >
              Start Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SpotlightTourProps {
  flowType: FlowType;
}

interface CustomStep extends Step {
  image?: string;
  headline?: string;
}

const CLIENT_SERVICE_STEPS: CustomStep[] = [
  {
    target: ".tour-client-service-hero",
    headline: "Service Details",
    content:
      "Here you can view all the details about this service, including the provider's info, price, and location.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "bottom",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-client-service-packages",
    headline: "Choose Your Package",
    content:
      "Browse through the service packages offered by this provider. Each package includes a detailed description and pricing.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "bottom",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-client-service-availability",
    headline: "Check Availability",
    content:
      "Check the provider's schedule to see when they are available to perform this service.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "bottom",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-client-service-gallery",
    headline: "Service Gallery",
    content:
      "View photos and media showcasing the provider's past work and service quality.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "top",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-client-service-credentials",
    headline: "Provider Credentials",
    content:
      "Verify the provider's qualifications, identity status, and professional certificates.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "top",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-client-service-reviews",
    headline: "Client Reviews",
    content:
      "Read ratings and feedback from past clients to help you make an informed decision.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "top",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-client-service-book",
    headline: "Ready to Book?",
    content:
      "Once you've found the perfect service and package, click here to proceed with your booking.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "top",
    disableBeacon: true,
  } as CustomStep,
];

const CLIENT_BOOKINGS_STEPS: CustomStep[] = [
  {
    target: "body",
    headline: "Your Bookings Hub",
    content:
      "View and manage all your bookings here. Use the calendar toggle to switch between Same Day and Scheduled bookings. Use the search bar to find specific appointments by service or provider name.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "center",
    disableBeacon: true,
  } as CustomStep,
];

const CLIENT_BOOKING_DETAILS_STEPS: CustomStep[] = [
  {
    target: ".tour-booking-status",
    headline: "Track Your Request",
    content:
      "This badge shows the current status of your booking—whether it's pending, accepted, or completed.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "center",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-booking-actions",
    headline: "Manage This Job",
    content:
      "Here you can message the provider directly, cancel if needed, or leave a review once the job is done.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "top",
    disableBeacon: true,
  } as CustomStep,
];

const CLIENT_RATINGS_STEPS: CustomStep[] = [
  {
    target: "body",
    headline: "Your Ratings",
    content:
      "This page shows your ratings from service providers. Your ratings reflects reliability based on completed bookings. Higher scores mean more providers trust you!",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "center",
    disableBeacon: true,
  } as CustomStep,
];

const CLIENT_PROFILE_STEPS: CustomStep[] = [
  {
    target: ".tour-client-reputation-score",
    headline: "Your Reputation Score",
    content:
      "This score (0-100) reflects your reliability as a client. It's based on your booking history, reviews from providers, and how often you keep appointments. Tap 'View All Reviews' to see your detailed provider reviews.",
    image: "/images/srv characters (SVG)/tutor.svg",
    placement: "center",
    disableBeacon: true,
  } as CustomStep,
];

function Tooltip({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size,
}: TooltipRenderProps & { size?: number }) {
  const customStep = step as CustomStep;
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextButtonRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      {...tooltipProps}
      className="animate-in slide-in-from-bottom-4 fade-in relative flex w-[calc(100vw-2rem)] max-w-[21rem] flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] ring-1 ring-black/5 duration-300 md:w-[32rem] md:flex-row"
      role="dialog"
      aria-modal="true"
    >
      <button
        {...closeProps}
        className="absolute right-2 top-2 z-10 rounded-full bg-gray-50/80 p-1.5 text-gray-400/80 backdrop-blur-sm transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-95 md:right-3 md:top-3"
        aria-label="Skip walkthrough"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>

      <div className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 md:w-2/5 md:p-6">
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-200/40 blur-xl md:h-32 md:w-32"></div>
        {customStep.image && (
          <img
            src={customStep.image}
            alt="SRV Character"
            className="relative z-10 h-auto w-20 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)] md:w-32"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = target.src.replace(/ /g, "%20");
            }}
          />
        )}
      </div>

      <div className="flex w-full flex-col justify-between p-4 md:w-3/5 md:p-6">
        <div className="animate-in slide-in-from-right-2 fade-in duration-300">
          <div className="mb-1.5 flex items-center justify-between pr-6 md:mb-2 md:pr-8">
            {size && (
              <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 md:px-2 md:text-[10px]">
                Step {index + 1} of {size}
              </span>
            )}
          </div>
          {customStep.headline && (
            <h2 className="mb-1.5 text-lg font-extrabold tracking-tight text-slate-900 md:mb-2 md:text-xl">
              {customStep.headline}
            </h2>
          )}
          <p className="mb-4 text-xs leading-relaxed text-slate-600 md:mb-6 md:text-sm">
            {step.content as React.ReactNode}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 md:pt-4">
          <div className="flex w-full justify-between space-x-2">
            {index > 0 ? (
              <button
                ref={backButtonRef}
                {...backProps}
                className="flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 md:px-4 md:py-2.5 md:text-xs"
              >
                <ChevronLeftIcon className="mr-0.5 h-3 w-3 md:h-3.5 md:w-3.5" />{" "}
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              ref={nextButtonRef}
              {...primaryProps}
              className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-[0_4px_10px_-2px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-700 hover:shadow-[0_8px_16px_-4px_rgba(37,99,235,0.4)] active:scale-[0.98] md:px-5 md:py-2.5 md:text-sm"
            >
              {isLastStep ? "Finish Tour" : "Next"}
              {!isLastStep && (
                <ChevronRightIcon className="ml-0.5 h-3 w-3 md:h-4 md:w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SpotlightTour({
  flowType,
  onTourComplete,
}: SpotlightTourProps) {
  const [run, setRun] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const STORAGE_KEY = `srv_spotlight_tour_${flowType}`;
  const [steps, setSteps] = useState<CustomStep[]>([]);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const isDesktopLayout =
      typeof window !== "undefined" ? window.innerWidth >= 768 : false;

    const CLIENT_STEPS: CustomStep[] = [
      {
        target: isDesktopLayout
          ? ".tour-client-nav-desktop"
          : ".tour-client-nav-mobile",
        headline: "Welcome to SRV!",
        content:
          "Use this menu to navigate between your home, bookings, messages, notifications and profile.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: isDesktopLayout ? "right-start" : "top",
        arrowSpacing: 100,
        arrowColor: "#eff6ff",
        disableBeacon: true,
        disableScroll: true,
        spotlightPadding: 0,
      } as CustomStep,
      {
        target: '[data-tour="client-header"]',
        headline: "Your Profile & Location",
        content:
          "Welcome to SRV! This is your dashboard. You can quickly access your profile settings here and see your current location.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "bottom",
        disableBeacon: true,
      } as CustomStep,
      {
        target: '[data-tour="client-search"]',
        headline: "Find Exactly What You Need",
        content:
          "Looking for something specific? Type it here to instantly find top-rated professionals near you.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "bottom",
        disableBeacon: true,
      } as CustomStep,
      {
        target: '[data-tour="client-categories"]',
        headline: "Browse by Category",
        content:
          "Not sure what you need? Browse our wide range of service categories to find the perfect professional for your job.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "bottom",
        disableBeacon: true,
      } as CustomStep,
      {
        target: '[data-tour="client-book-now"]',
        headline: "Top Local Professionals",
        content:
          "Here you'll find the best service providers in your area, ready to help. Check their reputation scores and book instantly!",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "top",
        disableBeacon: true,
      } as CustomStep,
      {
        target: ".tour-client-reputation",
        headline: "Provider Reputation Score",
        content:
          "This score (0-100) shows how reliable a provider is. 81-100 = Premium (excellent), 51-80 = Trusted (great), 21-50 = Building (good), 0-20 = New. Higher scores mean more reliable providers!",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "top",
        disableBeacon: true,
      } as CustomStep,
    ];

    const CLIENT_RECEIPT_STEPS: CustomStep[] = [
      {
        target: ".tour-receipt-details",
        headline: "Your Receipt",
        content:
          "Your booking is complete! This receipt serves as your proof of transaction. Keep it for your records.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "bottom",
        disableBeacon: true,
      } as CustomStep,
      {
        target: ".tour-receipt-payment",
        headline: "Payment Summary",
        content:
          "Review the final amount paid and the payment method used for this service.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "top",
        disableBeacon: true,
      } as CustomStep,
      {
        target: ".tour-receipt-actions",
        headline: "Next Steps",
        content:
          "Share your receipt with others or leave a review for the provider to help other clients!",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "top",
        disableBeacon: true,
      } as CustomStep,
    ];

    const PROVIDER_STEPS: CustomStep[] = [
      {
        target: '[data-tour="provider-nav"]',
        headline: "Welcome to SRV Provider!",
        content:
          "Your central hub to grow your business, manage your services, and connect with new clients.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "center",
        disableBeacon: true,
      } as CustomStep,
      {
        target: '[data-tour="provider-stats"]',
        headline: "Track Your Success",
        content:
          "Here is a quick snapshot of your earnings, completed jobs, and upcoming bookings.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "bottom",
        disableBeacon: true,
      } as CustomStep,
      {
        target: '[data-tour="provider-requests"]',
        headline: "Manage Bookings",
        content:
          "Easily track upcoming and pending bookings all in one place. Accept or decline requests with a single click.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "bottom",
        disableBeacon: true,
      } as CustomStep,
      {
        target: '[data-tour="provider-services"]',
        headline: "Manage Services",
        content:
          "This is where you can create, edit, and manage the services you offer to clients. Make sure your listings stand out!",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "top",
        disableBeacon: true,
      } as CustomStep,
    ];

    const PROVIDER_BOOKINGS_STEPS: CustomStep[] = [
      {
        target: "[data-tour='provider-bookings-search']",
        headline: "Find Bookings",
        content:
          "Use the search bar to quickly find bookings by client name, service, or booking ID.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "bottom",
        disableBeacon: true,
      } as CustomStep,
      {
        target: "[data-tour='provider-bookings-filters']",
        headline: "Filter Your Bookings",
        content:
          "Filter bookings by status (Pending, Confirmed, In Progress, Completed, Cancelled) or by service category.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "bottom",
        disableBeacon: true,
      } as CustomStep,
      {
        target: "[data-tour='provider-bookings-timing']",
        headline: "Same Day vs Scheduled",
        content:
          "Toggle between Same Day and Scheduled bookings to view jobs based on their timing.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "top",
        disableBeacon: true,
      } as CustomStep,
      {
        target: "[data-tour='provider-bookings-list']",
        headline: "Your Bookings",
        content:
          "View all your bookings here. Click on any booking to view details, accept, decline, or start working on it.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "top",
        disableBeacon: true,
      } as CustomStep,
    ];

    const PROVIDER_SERVICES_STEPS: CustomStep[] = [
      {
        target: "[data-tour='provider-services-add']",
        headline: "Add New Service",
        content:
          "Click here to create a new service. You can have up to 5 active services at a time.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "bottom",
        disableBeacon: true,
      } as CustomStep,
      {
        target: "[data-tour='provider-services-filter']",
        headline: "View Archived Services",
        content:
          "Toggle to view your archived services. Archived services are hidden from clients but can be restored.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "left",
        disableBeacon: true,
      } as CustomStep,
      {
        target: "[data-tour='provider-services-list']",
        headline: "Your Service Listings",
        content:
          "This is where all your active services are displayed. Click on any service to edit details, update pricing, or manage availability.",
        image: "/images/srv characters (SVG)/tutor.svg",
        placement: "top",
        disableBeacon: true,
      } as CustomStep,
    ];

    const currentSteps =
      flowType === "client"
        ? CLIENT_STEPS
        : flowType === "client-service"
          ? CLIENT_SERVICE_STEPS
          : flowType === "client-bookings"
            ? CLIENT_BOOKINGS_STEPS
            : flowType === "client-booking-details"
              ? CLIENT_BOOKING_DETAILS_STEPS
              : flowType === "client-ratings"
                ? CLIENT_RATINGS_STEPS
                : flowType === "client-profile"
                  ? CLIENT_PROFILE_STEPS
                  : flowType === "client-receipt"
                    ? CLIENT_RECEIPT_STEPS
                    : flowType === "provider-bookings"
                      ? PROVIDER_BOOKINGS_STEPS
                      : flowType === "provider-services"
                        ? PROVIDER_SERVICES_STEPS
                        : PROVIDER_STEPS;

    setSteps(currentSteps);
  }, [flowType, isDesktop]);

  useEffect(() => {
    // Check and show welcome screen ONLY on first visit to home page
    const timer = setTimeout(() => {
      // Check sessionStorage first - if this page's tour was intentionally selected
      const pendingTour = sessionStorage.getItem("pending_tour");

      if (pendingTour === flowType) {
        // This specific tour was selected from settings - run it and clear the flag
        sessionStorage.removeItem("pending_tour");
        setShowWelcome(true);
        return;
      }

      // Only show welcome on home page for first visit
      if (flowType !== "client") {
        // Add delay to ensure DOM and steps are rendered
        setTimeout(() => {
          const hasSeenPage = localStorage.getItem(STORAGE_KEY);
          if (!hasSeenPage) {
            setRun(true);
          }
        }, 300);
      } else {
        const hasSeenHomeWelcome = localStorage.getItem(
          "srv_spotlight_seen_home_welcome",
        );

        // Show welcome only if never seen before
        if (!hasSeenHomeWelcome) {
          setShowWelcome(true);
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [flowType]);

  useEffect(() => {
    const handleStartTour = (e: Event) => {
      const detail = (e as CustomEvent).detail as { flowType?: string } | undefined;
      if (detail?.flowType !== flowType) return;
      sessionStorage.removeItem("pending_tour");
      setRun(false);
      setShowWelcome(false);
      setTimeout(() => setShowWelcome(true), 50);
    };
    window.addEventListener("srv:start-tour", handleStartTour);
    return () => window.removeEventListener("srv:start-tour", handleStartTour);
  }, [flowType]);

  const handleStartTour = () => {
    setShowWelcome(false);
    // Mark home welcome as seen when user starts the tour
    if (flowType === "client") {
      localStorage.setItem("srv_spotlight_seen_home_welcome", "true");
    }
    setTimeout(() => {
      setRun(true);
    }, 500);
  };

  const handleSkip = () => {
    setShowWelcome(false);
    // Mark home welcome as seen when user skips
    if (flowType === "client") {
      localStorage.setItem("srv_spotlight_seen_home_welcome", "true");
    }
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleJoyrideCallback = (data: EventData) => {
    const { status, action, type } = data;
    const finishedStatuses: string[] = [
      STATUS.FINISHED,
      STATUS.SKIPPED,
      "skip",
    ];

    if ((status as any) === "error" || type === "error") {
      setRun(false);
      // Mark as seen on error too
      if (flowType === "client") {
        localStorage.setItem("srv_spotlight_seen_home_welcome", "true");
      }
      localStorage.setItem(STORAGE_KEY, "true");
      return;
    }

    if (finishedStatuses.includes(status) || action === "close") {
      setRun(false);
      // Mark as seen when tour completes
      if (flowType === "client") {
        localStorage.setItem("srv_spotlight_seen_home_welcome", "true");
      }
      localStorage.setItem(STORAGE_KEY, "true");
      // Call onTourComplete callback if provided
      if (onTourComplete) {
        onTourComplete();
      }
    }
  };

  // Flow title for welcome screen
  const getFlowTitle = () => {
    switch (flowType) {
      case "client":
        return "Welcome to SRV!";
      case "provider":
        return "Welcome to SRV Provider!";
      case "client-service":
        return "Service Walkthrough";
      case "client-bookings":
        return "Your Bookings Tour";
      case "client-booking-details":
        return "Booking Details Tour";
      case "client-ratings":
        return "Your Ratings Tour";
      case "client-profile":
        return "Profile Tour";
      case "client-receipt":
        return "Receipt Tour";
      case "provider-bookings":
        return "Bookings Tour";
      case "provider-services":
        return "Services Tour";
      default:
        return "SRV Tour";
    }
  };

  if (showWelcome) {
    return (
      <WelcomeModal
        onStart={handleStartTour}
        onSkip={handleSkip}
        flowTitle={getFlowTitle()}
      />
    );
  }

  return (
    <Joyride
      key={run ? "joyride-running" : "joyride-idle"}
      onEvent={handleJoyrideCallback}
      continuous
      run={run}
      scrollToFirstStep
      steps={steps}
      tooltipComponent={Tooltip}
      options={{
        overlayColor: "rgba(15, 23, 42, 0.7)",
        zIndex: 10001,
        scrollDuration: 600,
        scrollOffset: 80,
      }}
      styles={{
        tooltip: {
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        },
      }}
    />
  );
}
