import React from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

type BookingStatus = "Requested" | "Accepted" | "InProgress" | "Completed" | "Cancelled" | "Declined" | "Disputed";

const BookingProgressTracker: React.FC<{ currentStatus: BookingStatus }> = ({ currentStatus }) => {
  const statuses: BookingStatus[] = ["Requested", "Accepted", "InProgress", "Completed"];
  const currentIndex = statuses.findIndex((status) => status === currentStatus);
  const isAllCompleted = currentStatus === "Completed";

  if (currentIndex === -1) {
    return (
      <div className="py-4 text-center">
        <p className="font-medium text-gray-600">This booking is not in an active progress state.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full">
        <div className="flex w-full items-center justify-between gap-1 px-0 sm:gap-4 sm:px-2">
          {statuses.map((status, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex || (isAllCompleted && index === 3);
            const isLast = index === statuses.length - 1;
            return (
              <React.Fragment key={status}>
                <div className="flex flex-col items-center text-center" style={{ width: "56px" }}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-4 shadow-lg transition-all duration-300 sm:h-12 sm:w-12 ${isAllCompleted ? "border-yellow-400 bg-yellow-400 text-white" : isCompleted ? "border-yellow-400 bg-yellow-400 text-white" : isActive ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-gray-100 text-gray-400"}`}> 
                    {(isAllCompleted && isLast) || (isCompleted && index !== 3) ? (
                      <CheckCircleIcon className="h-5 w-5 text-white sm:h-7 sm:w-7" />
                    ) : (
                      <span className="text-base font-bold sm:text-lg">{index + 1}</span>
                    )}
                  </div>
                  <p className={`mt-2 text-xs font-semibold sm:mt-3 sm:text-sm ${isAllCompleted ? "text-yellow-600" : isCompleted ? "text-yellow-600" : isActive ? "text-blue-700" : "text-gray-400"}`}>{status === "InProgress" ? "Current" : status}</p>
                </div>
                {index < statuses.length - 1 && (
                  <div className="flex min-w-[16px] flex-1 items-center sm:min-w-[40px]">
                    <div className={`h-1 w-full rounded-full transition-colors duration-300 sm:h-2 ${isAllCompleted ? "bg-yellow-400" : index < currentIndex - 1 ? "bg-yellow-400" : index === currentIndex - 1 ? "bg-blue-600" : "bg-gray-200"}`}></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BookingProgressTracker;
