import React from "react";
import {
  MapPinIcon,
  HomeIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";

interface WeeklySchedule {
  dayOfWeek: number;
  availability: {
    isAvailable: boolean;
    slots: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
}

interface LocationAvailabilityProps {
  location?: {
    city?: string;
    state?: string;
    address?: string;
  };
  weeklySchedule?: WeeklySchedule[];
  formatTime: (time: string) => string;
}

export const LocationAvailability: React.FC<LocationAvailabilityProps> = ({
  location,
  weeklySchedule,
  formatTime,
}) => {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const availableDays =
    weeklySchedule?.filter((day) => {
      const availability = day.availability || {
        isAvailable: false,
        slots: [],
      };
      return availability.isAvailable;
    }) || [];

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
          <MapPinIcon className="h-6 w-6 text-blue-400" />
          Location & Availability
        </h3>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-l mb-1 flex items-center gap-2 font-medium text-blue-700">
            <HomeIcon className="h-4 w-4 text-blue-400" />
            Address
          </label>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-normal text-blue-900">
            {location?.city || "Not specified"}
            {location?.state && `, ${location.state}`}
          </div>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs font-medium text-blue-700">
            <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
            Availability
          </label>
          <div className="flex flex-wrap justify-center gap-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-4 text-sm font-medium text-blue-900">
            {availableDays.length > 0 ? (
              availableDays.map((day, index) => {
                const availability = day.availability || {
                  isAvailable: false,
                  slots: [],
                };
                const dayName =
                  dayNames[day.dayOfWeek] || `Day ${day.dayOfWeek}`;

                return (
                  <div
                    key={index}
                    className="flex min-w-[140px] flex-col items-start rounded-xl border border-blue-100 bg-white/80 p-3 shadow"
                  >
                    <span className="mb-2 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-blue-800 shadow-sm">
                      <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
                      {dayName}
                    </span>
                    {availability.slots && availability.slots.length > 0 ? (
                      <ul className="ml-1 space-y-1">
                        {availability.slots.map((slot: any, idx: number) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-xs text-blue-900"
                          >
                            <span className="inline-block rounded bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                              {formatTime(slot.startTime)} -{" "}
                              {formatTime(slot.endTime)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-blue-400">No slots</span>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="text-blue-400">Not specified</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
