import React from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

const BookingProgressSection: React.FC<{ status?: string }> = ({ status }) => {
  const steps = [
    { key: "requested", label: "Requested" },
    { key: "accepted", label: "Accepted" },
    { key: "in_progress", label: "Current" },
    { key: "completed", label: "Completed" },
  ];

  const normalizedStatus = (status || "").toLowerCase().replace(/ /g, "_");
  let currentStep = 0;
  switch (normalizedStatus) {
    case "requested":
    case "pending":
      currentStep = 0;
      break;
    case "accepted":
    case "confirmed":
      currentStep = 1;
      break;
    case "in_progress":
    case "inprogress":
      currentStep = 2;
      break;
    case "completed":
      currentStep = 3;
      break;
    case "declined":
    case "cancelled":
      currentStep = -1;
      break;
    default:
      currentStep = 0;
  }

  if (currentStep === -1) {
    return (
      <section className="my-4 flex flex-col rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-3 mr-10 w-full text-left text-lg font-bold text-blue-700">
          Progress Tracker
        </h3>
        <div className="flex items-center justify-center rounded-lg bg-red-50 px-4 py-3 font-semibold text-red-700">
          Booking {status}
        </div>
      </section>
    );
  }

  const getStepCircle = (idx: number) => {
    if (normalizedStatus === "completed") {
      return {
        bg: "bg-blue-500 border-blue-500 text-white",
        icon: (
          <CheckCircleIcon className="h-7 w-7 text-white md:h-10 md:w-10" />
        ),
      };
    }
    if (idx < currentStep) {
      return {
        bg: "bg-blue-500 border-blue-500 text-white",
        icon: (
          <CheckCircleIcon className="h-7 w-7 text-white md:h-10 md:w-10" />
        ),
      };
    }
    if (idx === currentStep) {
      return {
        bg: "bg-yellow-400 border-yellow-400 text-white",
        icon: (
          <span className="text-lg font-bold text-white md:text-2xl">
            {idx + 1}
          </span>
        ),
      };
    }
    return {
      bg: "bg-white border-yellow-500 text-yellow-500",
      icon: (
        <span className="text-lg font-bold text-yellow-500 md:text-2xl">
          {idx + 1}
        </span>
      ),
    };
  };

  const getLineColor = (idx: number) => {
    if (normalizedStatus === "completed") return "bg-blue-500";
    if (idx < currentStep) return "bg-blue-500";
    return "bg-yellow-300";
  };

  const getLabelColor = (idx: number) => {
    if (normalizedStatus === "completed") return "text-blue-700";
    if (idx < currentStep) return "text-blue-700";
    if (idx === currentStep) return "text-yellow-600";
    return "text-yellow-400";
  };

  return (
    <section className="my-4 flex flex-col items-center rounded-2xl bg-white p-4 shadow">
      <h3 className="mb-3 ml-5 mt-1 w-full text-left lg:text-lg text-md font-bold text-blue-700">
        Progress Tracker
      </h3>
      <div className="flex w-full max-w-xl items-center justify-center gap-0 sm:gap-4 md:max-w-3xl">
        {steps.map((step, idx) => {
          const { bg, icon } = getStepCircle(idx);
          const labelColor = getLabelColor(idx);
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center rounded-full border-2 ${bg} h-10 w-10 transition-colors duration-200 md:h-14 md:w-14`}
                >
                  {icon}
                </div>
                <span
                  className={`mt-1 text-xs font-medium md:text-base ${labelColor} transition-colors duration-200`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-1 w-8 sm:w-16 md:w-32 ${getLineColor(idx)} transition-colors duration-200`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

export default BookingProgressSection;
