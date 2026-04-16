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
          <div className="flex w-full flex-col gap-3">
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
                    className="grid grid-cols-1 items-start gap-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-blue-800 sm:col-span-1 sm:pt-1.5">
                      <CalendarDaysIcon className="h-5 w-5 text-blue-400" />
                      {dayName}
                    </div>
                    <div className="flex flex-wrap justify-start gap-2 sm:col-span-2 lg:col-span-3 lg:justify-end">
                      {availability.slots && availability.slots.length > 0 ? (
                        availability.slots.map((slot: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-block whitespace-nowrap rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            {formatTime(slot.startTime)} -{" "}
                            {formatTime(slot.endTime)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-blue-400">No slots</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 py-4 text-center text-sm text-blue-400">
                Not specified
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
