import React from "react";

const BookingProgressSection: React.FC<{ status?: string }> = ({ status }) => {
  const steps = [
    { key: "requested", label: "Requested" },
    { key: "accepted", label: "Accepted" },
    { key: "in_progress", label: "In Progress" },
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
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="p-4 text-center">
          <p className="text-sm font-medium text-gray-500">
            Booking {status}
          </p>
        </div>
      </section>
    );
  }

  const getStepStyle = (idx: number) => {
    const isCompleted = idx < currentStep;
    const isCurrent = idx === currentStep;
    const isCompletedStatus = normalizedStatus === "completed";
    
    if (isCompletedStatus || isCompleted) {
      return {
        circle: "bg-blue-600 text-white",
        label: "text-blue-600 font-medium",
        line: "bg-blue-600",
      };
    }
    if (isCurrent) {
      return {
        circle: "bg-gray-200 text-gray-700",
        label: "text-gray-700 font-medium",
        line: "bg-gray-200",
      };
    }
    return {
      circle: "bg-gray-100 text-gray-400",
      label: "text-gray-400",
      line: "bg-gray-100",
    };
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-500">
          Progress
        </h3>
        
        {/* Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const styles = getStepStyle(idx);
            return (
              <React.Fragment key={step.key}>
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${styles.circle}`}
                  >
                    {idx + 1}
                  </div>
                  <span className={`mt-2 text-xs ${styles.label}`}>
                    {step.label}
                  </span>
                </div>

                {/* Connector Line */}
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${styles.line}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BookingProgressSection;