import React, { useState, useEffect } from "react";
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
  | "client-booking-details";

interface SpotlightTourProps {
  flowType: FlowType;
}

interface CustomStep extends Step {
  image?: string;
  color?: string;
  headline?: string;
}

const CLIENT_STEPS: CustomStep[] = [
  {
    target: ".tour-client-nav",
    headline: "Welcome to SRV!",
    content:
      "Use this menu to navigate between your home, bookings, messages, and profile.",
    image: "/images/srv characters (SVG)/girl.svg",
    color: "bg-blue-50",
    placement: "top",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-client-search",
    headline: "Find Exactly What You Need",
    content:
      "Looking for something specific? Type it here to instantly find top-rated professionals near you.",
    image: "/images/srv characters (SVG)/plumber.svg",
    color: "bg-indigo-50",
    placement: "bottom",
  } as CustomStep,
  {
    target: ".tour-client-service-card",
    headline: "Top Local Professionals",
    content:
      "These cards show you the best providers available. You can see their category, price, and basic info at a glance.",
    image: "/images/srv characters (SVG)/tech guy.svg",
    color: "bg-purple-50",
    placement: "bottom",
  } as CustomStep,
  {
    target: ".tour-client-reputation",
    headline: "Trust Built on Real Feedback",
    content:
      "This is the Reputation Score! It's a true reflection of a provider's quality, calculated from real client reviews and reliability.",
    image: "/images/srv characters (SVG)/tutor.svg",
    color: "bg-pink-50",
    placement: "top",
  } as CustomStep,
];

const PROVIDER_STEPS: CustomStep[] = [
  {
    target: ".tour-provider-nav",
    headline: "Welcome to SRV Provider!",
    content:
      "Your central hub to grow your business, manage your services, and connect with new clients.",
    image: "/images/srv characters (SVG)/tech guy.svg",
    color: "bg-blue-50",
    disableBeacon: true,
    placement: "top",
  } as CustomStep,
  {
    target: ".tour-provider-stats",
    headline: "Track Your Success",
    content:
      "Here is a quick snapshot of your earnings, completed jobs, and upcoming bookings.",
    image: "/images/srv characters (SVG)/plumber.svg",
    color: "bg-indigo-50",
    placement: "bottom",
  } as CustomStep,
  {
    target: ".tour-provider-requests",
    headline: "Manage Bookings",
    content:
      "Easily track upcoming and pending bookings all in one place. Accept or decline requests with a single click.",
    image: "/images/srv characters (SVG)/tutor.svg",
    color: "bg-pink-50",
    placement: "top",
  } as CustomStep,
  {
    target: ".tour-provider-services",
    headline: "Manage Services",
    content:
      "This is where you can create, edit, and manage the services you offer to clients. Make sure your listings stand out!",
    image: "/images/srv characters (SVG)/girl.svg",
    color: "bg-purple-50",
    placement: "top",
  } as CustomStep,
];

const CLIENT_SERVICE_STEPS: CustomStep[] = [
  {
    target: ".tour-client-service-hero",
    before: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const el = document.querySelector(".tour-client-service-hero");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            window.scrollBy(0, -120);
          }
          resolve();
        }, 150);
      });
    },
    headline: "Service Details",
    content:
      "Here you can view all the details about this service, including the provider's info, price, and availability.",
    image: "/images/srv characters (SVG)/plumber.svg",
    color: "bg-indigo-50",
    placement: "bottom",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-client-service-packages",
    before: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const el = document.querySelector(".tour-client-service-packages");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            window.scrollBy(0, -120);
          }
          resolve();
        }, 150);
      });
    },
    headline: "Choose Your Package",
    content:
      "Browse through the service packages offered by this provider. Each package includes a detailed description and pricing.",
    image: "/images/srv characters (SVG)/tech guy.svg",
    color: "bg-purple-50",
    placement: "top",
  } as CustomStep,
  {
    target: ".tour-client-service-availability",
    before: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const el = document.querySelector(
            ".tour-client-service-availability",
          );
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            window.scrollBy(0, -120);
          }
          resolve();
        }, 150);
      });
    },
    headline: "Check Availability",
    content:
      "See the provider's available time slots and schedule your booking at a time that works for you.",
    image: "/images/srv characters (SVG)/tutor.svg",
    color: "bg-pink-50",
    placement: "top",
  } as CustomStep,
  {
    target: ".tour-client-service-gallery",
    before: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const el = document.querySelector(".tour-client-service-gallery");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            window.scrollBy(0, -120);
          }
          resolve();
        }, 150);
      });
    },
    headline: "See Their Work",
    content:
      "Browse through photos and gallery images to get a feel for the quality of work this provider delivers.",
    image: "/images/srv characters (SVG)/girl.svg",
    color: "bg-teal-50",
    placement: "top",
  } as CustomStep,
  {
    target: ".tour-client-service-credentials",
    before: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const el = document.querySelector(".tour-client-service-credentials");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            window.scrollBy(0, -120);
          }
          resolve();
        }, 150);
      });
    },
    headline: "Verified Credentials",
    content:
      "This section shows any certifications, licenses, or qualifications the provider has earned.",
    image: "/images/srv characters (SVG)/plumber.svg",
    color: "bg-indigo-50",
    placement: "top",
  } as CustomStep,
  {
    target: ".tour-client-service-reviews",
    before: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const el = document.querySelector(".tour-client-service-reviews");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            window.scrollBy(0, -120);
          }
          resolve();
        }, 150);
      });
    },
    headline: "Real Reviews",
    content:
      "Read genuine feedback from past clients to help you decide if this is the right provider for you.",
    image: "/images/srv characters (SVG)/tutor.svg",
    color: "bg-pink-50",
    placement: "top",
  } as CustomStep,
  {
    target: ".tour-client-service-book",
    before: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const el = document.querySelector(".tour-client-service-book");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "end" });
          }
          resolve();
        }, 150);
      });
    },
    headline: "Ready to Book?",
    content: "When you're ready, tap here to book this service!",
    image: "/images/srv characters (SVG)/girl.svg",
    color: "bg-teal-50",
    placement: "top",
  } as CustomStep,
];

const CLIENT_BOOKINGS_STEPS: CustomStep[] = [
  {
    target: ".tour-bookings-tabs",
    headline: "Your Bookings Hub",
    content:
      "Switch between calendar and list views to manage your appointments in the way that suits you best.",
    image: "/images/srv characters (SVG)/tech guy.svg",
    color: "bg-blue-50",
    placement: "bottom",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-bookings-filter",
    headline: "Find Appointments Fast",
    content:
      "Use the search bar and filters to quickly find specific bookings by status or service category.",
    image: "/images/srv characters (SVG)/plumber.svg",
    color: "bg-indigo-50",
    placement: "bottom",
  } as CustomStep,
];

const CLIENT_BOOKING_DETAILS_STEPS: CustomStep[] = [
  {
    target: ".tour-booking-status",
    headline: "Track Your Request",
    content:
      "This badge shows the current status of your booking—whether it's pending, accepted, or completed.",
    image: "/images/srv characters (SVG)/tutor.svg",
    color: "bg-pink-50",
    placement: "bottom",
    disableBeacon: true,
  } as CustomStep,
  {
    target: ".tour-booking-actions",
    headline: "Manage This Job",
    content:
      "Here you can message the provider directly, cancel if needed, or leave a review once the job is done.",
    image: "/images/srv characters (SVG)/girl.svg",
    color: "bg-blue-50",
    placement: "top",
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
}: TooltipRenderProps) {
  const customStep = step as CustomStep;

  return (
    <div
      {...tooltipProps}
      className="relative flex w-80 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:w-[28rem] md:flex-row"
    >
      <button
        {...closeProps}
        className="absolute right-2 top-2 z-10 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label="Skip walkthrough"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>

      {/* Left/Top Side: Visuals */}
      <div
        className={`flex w-full items-center justify-center p-4 md:w-2/5 ${customStep.color || "bg-gray-50"}`}
      >
        {customStep.image && (
          <img
            src={customStep.image}
            alt="SRV Character"
            className="h-auto w-24 animate-[wiggle_1s_ease-in-out] object-contain drop-shadow-lg md:w-32"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = target.src.replace(/ /g, "%20");
            }}
          />
        )}
      </div>

      {/* Right/Bottom Side: Content */}
      <div className="flex w-full flex-col justify-between p-4 md:w-3/5">
        <div>
          {customStep.headline && (
            <h2 className="mb-2 mt-4 pr-6 text-lg font-bold text-gray-900 md:mt-0">
              {customStep.headline}
            </h2>
          )}
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            {step.content as React.ReactNode}
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex w-full justify-between space-x-2">
            {index > 0 ? (
              <button
                {...backProps}
                className="flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
              >
                <ChevronLeftIcon className="mr-1 h-4 w-4" /> Back
              </button>
            ) : (
              <div />
            )}

            <button
              {...primaryProps}
              className="flex items-center rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep && <ChevronRightIcon className="ml-1 h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SpotlightTour({ flowType }: SpotlightTourProps) {
  const [run, setRun] = useState(false);
  const STORAGE_KEY = `srv_spotlight_tour_${flowType}`;
  const steps =
    flowType === "client"
      ? CLIENT_STEPS
      : flowType === "client-service"
        ? CLIENT_SERVICE_STEPS
        : flowType === "client-bookings"
          ? CLIENT_BOOKINGS_STEPS
          : flowType === "client-booking-details"
            ? CLIENT_BOOKING_DETAILS_STEPS
            : PROVIDER_STEPS;

  useEffect(() => {
    // Delay slightly to let the UI mount fully
    const timer = setTimeout(() => {
      const hasSeen = localStorage.getItem(STORAGE_KEY);
      if (!hasSeen) {
        setRun(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [STORAGE_KEY]);

  const handleJoyrideCallback = (data: EventData) => {
    const { status, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    // Close when skipped or finished
    if (finishedStatuses.includes(status) || action === "close") {
      setRun(false);
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  return (
    <Joyride
      onEvent={handleJoyrideCallback}
      continuous
      run={run}
      scrollToFirstStep
      steps={steps}
      tooltipComponent={Tooltip}
      options={{
        overlayColor: "rgba(15, 23, 42, 0.6)",
        zIndex: 10000,
        scrollDuration: 800,
        scrollOffset: 80,
      }}
      styles={{
        beacon: {
          backgroundColor: "#facc15",
          color: "#facc15",
        },
      }}
    />
  );
}
