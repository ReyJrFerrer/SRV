import React from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import EmptyState from "../../common/EmptyState";

export type Availability = {
  isAvailableNow?: boolean;
  availableDays?: string[];
  availableTimeStart?: string;
  availableTimeEnd?: string;
  availableTimeRanges?: string[];
  timeSlotsByDay?: Record<string, string[]>;
};

interface AvailabilitySectionProps {
  availability?: Availability;
  isActive?: boolean;
}

const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  availability,
  isActive,
}) => {
  const slotsByDay = availability?.timeSlotsByDay || {};
  const days = Object.keys(slotsByDay);
  const hasDays = days.length > 0;

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
          Availability
        </h3>
        {isActive && (
          <span className="ml-auto flex animate-pulse items-center justify-end gap-1 rounded-full border border-green-200 bg-green-100 px-3 py-1 text-[10px] font-bold text-green-700 lg:text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
            Available Now
          </span>
        )}
      </div>

      {hasDays ? (
        <ul className="flex flex-col divide-y divide-gray-100">
          {days.map((day) => {
            let slots = slotsByDay[day] || [];
            if (!Array.isArray(slots)) {
              slots = [slots as unknown as string];
            }

            return (
              <li
                key={day}
                className="flex flex-col py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="mb-3 text-base font-medium text-gray-900 sm:mb-0 sm:w-1/3">
                  {day}
                </span>
                <div className="flex flex-wrap gap-2 sm:w-2/3 sm:justify-end">
                  {slots.length > 0 ? (
                    slots.map((slot, idx) => (
                      <span
                        key={`${slot}-${idx}`}
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                      >
                        {slot}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">Not specified</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={<CalendarDaysIcon className="h-12 w-12" />}
            title="No availability"
            message="No specific availability has been set up."
          />
        </div>
      )}
    </div>
  );
};

export default AvailabilitySection;
