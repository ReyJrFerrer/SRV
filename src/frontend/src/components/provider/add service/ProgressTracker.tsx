import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface StepItem {
  id: number;
  label: string;
}

interface ProgressTrackerProps {
  currentStep: number;
  steps?: StepItem[];
  hasErrors?: boolean;
}

const defaultSteps: StepItem[] = [
  { id: 1, label: "Service Details" },
  { id: 2, label: "Availability" },
  { id: 3, label: "Location" },
  { id: 4, label: "Images" },
  { id: 5, label: "Review & Submit" },
];

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentStep,
  steps = defaultSteps,
  hasErrors = false,
}) => {
  const total = steps.length;
  const safeStep = Math.min(Math.max(currentStep, 1), total);

  return (
    <div className="mb-6">
      <div className={`rounded-xl border bg-white p-4 shadow-sm ${hasErrors ? "border-red-300" : "border-gray-200"}`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">Progress</div>
          <div className={`text-sm font-semibold ${hasErrors ? "text-red-600" : "text-blue-700"}`}>
            {hasErrors ? (
              <span className="flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Incomplete
              </span>
            ) : (
              `Step ${safeStep}/${total}`
            )}
          </div>
        </div>

        <div className="hidden md:block">
          <ul className="flex items-center justify-between">
            {steps.map((s, idx) => {
              const isCompleted = s.id < safeStep;
              const isCurrent = s.id === safeStep;
              return (
                <li key={s.id} className="flex min-w-0 flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={
                        `flex h-8 w-8 items-center justify-center rounded-full text-sm ` +
                        (isCompleted
                          ? "bg-blue-600 text-white"
                          : isCurrent
                            ? hasErrors
                              ? "border-2 border-red-500 bg-red-50 text-red-600"
                              : "border-2 border-blue-600 text-blue-700"
                            : "border-2 border-gray-300 text-gray-500")
                      }
                    >
                      {isCompleted ? "✓" : isCurrent && hasErrors ? "!" : s.id}
                    </div>
                    <span
                      className={
                        `mt-2 truncate text-xs font-medium ` +
                        (isCompleted
                          ? "text-blue-700"
                          : isCurrent
                            ? hasErrors
                              ? "text-red-600"
                              : "text-blue-800"
                            : "text-gray-500")
                      }
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="mx-2 h-px w-12 flex-1 bg-gray-200 md:w-24" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="md:hidden">
          <div className="flex justify-between text-xs">
            {steps.map((s) => {
              const isCompleted = s.id < safeStep;
              const isCurrent = s.id === safeStep;
              return (
                <div key={s.id} className="flex flex-col items-center">
                  <div
                    className={
                      `flex h-7 w-7 items-center justify-center rounded-full text-[11px] ` +
                      (isCompleted
                        ? "bg-blue-600 text-white"
                        : isCurrent
                          ? hasErrors
                            ? "border-2 border-red-500 bg-red-50 text-red-600"
                            : "border-2 border-blue-600 text-blue-700"
                          : "border-2 border-gray-300 text-gray-500")
                    }
                  >
                    {isCompleted ? "✓" : isCurrent && hasErrors ? "!" : s.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
