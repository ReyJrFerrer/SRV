import React from "react";
import { DayOfWeek } from "../../../hooks/serviceManagement";
import { TrashIcon, PlusCircleIcon } from "@heroicons/react/24/solid";
import { nanoid } from "nanoid";

// Interface for the structured time slot input in the form
interface TimeSlotUIData {
  id: string;
  startHour: string;
  startMinute: string;
  startPeriod: "AM" | "PM";
  endHour: string;
  endMinute: string;
  endPeriod: "AM" | "PM";
}

interface ServiceAvailabilityProps {
  formData: {
    availabilitySchedule: DayOfWeek[];
    useSameTimeForAllDays: boolean;
    commonTimeSlots: TimeSlotUIData[];
    perDayTimeSlots: Record<DayOfWeek, TimeSlotUIData[]>;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  validationErrors?: {
    availabilitySchedule?: string;
    timeSlots?: string;
  };
}

const allDays: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const hourOptions = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

const minuteOptions = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const periodOptions: ("AM" | "PM")[] = ["AM", "PM"];

const toDate = (hour: string, minute: string, period: "AM" | "PM"): Date => {
  const date = new Date();
  let h = parseInt(hour, 10);
  if (period === "PM" && h !== 12) {
    h += 12;
  } else if (period === "AM" && h === 12) {
    h = 0;
  }
  date.setHours(h, parseInt(minute, 10), 0, 0);
  return date;
};

const fromDate = (
  date: Date,
): { hour: string; minute: string; period: "AM" | "PM" } => {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  if (h > 12) {
    h -= 12;
  } else if (h === 0) {
    h = 12;
  }
  const hour = String(h).padStart(2, "0");
  return { hour, minute: m, period };
};

const TimeSlotInput: React.FC<{
  slot: TimeSlotUIData;
  onSlotChange: (
    id: string,
    field: keyof TimeSlotUIData,
    value: string,
  ) => void;
  onRemoveSlot: (id: string) => void;
}> = ({ slot, onSlotChange, onRemoveSlot }) => {
  // Check if start and end times are the same
  const startTime = toDate(slot.startHour, slot.startMinute, slot.startPeriod);
  const endTime = toDate(slot.endHour, slot.endMinute, slot.endPeriod);
  const isSameTime = startTime.getTime() === endTime.getTime();

  return (
    <div
      className={`relative mb-2 flex-grow flex-col gap-2 rounded-lg border px-3 pb-3 pt-3 shadow-sm lg:p-3 ${
        isSameTime ? "border-red-200 bg-red-50" : "border-blue-100 bg-blue-50"
      }`}
    >
      <div className="flex w-full flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full flex-col gap-2 xl:w-auto xl:flex-row xl:items-center xl:gap-3">
          {/* --- START TIME BLOCK --- */}
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            {/* Label row (with mobile-only delete button) */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Start:</span>
              {/* Mobile/Tablet Delete Button (visible xs-lg) */}
              <button
                type="button"
                onClick={() => onRemoveSlot(slot.id)}
                className="rounded-full bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700 xl:hidden"
                title="Remove time slot"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
            {/* Input row */}
            <div className="flex gap-1 sm:gap-2">
              <select
                value={slot.startHour}
                onChange={(e) =>
                  onSlotChange(slot.id, "startHour", e.target.value)
                }
                className="flex-1 rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="flex items-center text-gray-400">:</span>
              <select
                value={slot.startMinute}
                onChange={(e) =>
                  onSlotChange(slot.id, "startMinute", e.target.value)
                }
                className="flex-1 rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={slot.startPeriod}
                onChange={(e) =>
                  onSlotChange(slot.id, "startPeriod", e.target.value)
                }
                className="rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* --- "to" SEPARATOR (desktop-only) --- */}
          <div className="hidden items-center justify-center px-2 xl:flex">
            <span className="text-sm font-medium text-gray-500">to</span>
          </div>

          {/* --- END TIME BLOCK --- */}
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <span className="text-sm font-medium text-gray-600">End:</span>
            <div className="flex gap-1 sm:gap-2">
              <select
                value={slot.endHour}
                onChange={(e) =>
                  onSlotChange(slot.id, "endHour", e.target.value)
                }
                className="flex-1 rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="flex items-center text-gray-400">:</span>
              <select
                value={slot.endMinute}
                onChange={(e) =>
                  onSlotChange(slot.id, "endMinute", e.target.value)
                }
                className="flex-1 rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={slot.endPeriod}
                onChange={(e) =>
                  onSlotChange(slot.id, "endPeriod", e.target.value)
                }
                className="rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* --- Desktop Delete Button (visible xl-up) --- */}
        <button
          type="button"
          onClick={() => onRemoveSlot(slot.id)}
          className="hidden rounded-full bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700 xl:flex"
          title="Remove time slot"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const ServiceAvailability: React.FC<ServiceAvailabilityProps> = ({
  formData,
  setFormData,
  validationErrors = {},
}) => {
  const handleDayToggle = (day: DayOfWeek) => {
    setFormData((prev: { availabilitySchedule: DayOfWeek[] }) => {
      const newSchedule = prev.availabilitySchedule.includes(day)
        ? prev.availabilitySchedule.filter((d: any) => d !== day)
        : [...prev.availabilitySchedule, day];
      return { ...prev, availabilitySchedule: newSchedule };
    });
  };

  const handlePresetChange = (presetDays: DayOfWeek[], isChecked: boolean) => {
    setFormData((prev: { availabilitySchedule: DayOfWeek[] }) => {
      let newSchedule = [...prev.availabilitySchedule];

      if (isChecked) {
        presetDays.forEach((day) => {
          if (!newSchedule.includes(day)) {
            newSchedule.push(day);
          }
        });
      } else {
        newSchedule = newSchedule.filter((day) => !presetDays.includes(day));
      }
      return { ...prev, availabilitySchedule: newSchedule };
    });
  };

  const handleClearAll = () => {
    setFormData((prev: any) => ({
      ...prev,
      availabilitySchedule: [],
    }));
  };

  const isWeekendChecked =
    formData.availabilitySchedule.includes("Saturday") &&
    formData.availabilitySchedule.includes("Sunday");

  const isWeekdayChecked =
    formData.availabilitySchedule.includes("Monday") &&
    formData.availabilitySchedule.includes("Tuesday") &&
    formData.availabilitySchedule.includes("Wednesday") &&
    formData.availabilitySchedule.includes("Thursday") &&
    formData.availabilitySchedule.includes("Friday");

  const isEverydayChecked = allDays.every((day) =>
    formData.availabilitySchedule.includes(day),
  );

  // Helper function to check for time validation errors
  const getTimeValidationErrors = (timeSlots: TimeSlotUIData[]) => {
    const errors: string[] = [];

    // Sort time slots by start time for proper validation
    const sortedSlots = [...timeSlots].sort((a, b) => {
      const aStart = toDate(a.startHour, a.startMinute, a.startPeriod);
      const bStart = toDate(b.startHour, b.startMinute, b.startPeriod);
      return aStart.getTime() - bStart.getTime();
    });

    sortedSlots.forEach((slot, index) => {
      const startTime = toDate(
        slot.startHour,
        slot.startMinute,
        slot.startPeriod,
      );
      const endTime = toDate(slot.endHour, slot.endMinute, slot.endPeriod);

      // Check if start and end times are the same
      if (startTime.getTime() === endTime.getTime()) {
        errors.push("Start and end times cannot be the same");
      }

      // Check if start time is after end time
      if (startTime.getTime() > endTime.getTime()) {
        errors.push("Start time cannot be after end time");
      }

      // Check for minimum 1-hour gap between consecutive time slots
      if (index > 0) {
        const prevSlot = sortedSlots[index - 1];
        const prevEndTime = toDate(
          prevSlot.endHour,
          prevSlot.endMinute,
          prevSlot.endPeriod,
        );

        // Calculate the time difference in milliseconds
        const timeDiff = startTime.getTime() - prevEndTime.getTime();
        const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds

        if (timeDiff < oneHourInMs) {
          const prevEndTimeStr = `${prevSlot.endHour}:${prevSlot.endMinute} ${prevSlot.endPeriod}`;
          const currentStartTimeStr = `${slot.startHour}:${slot.startMinute} ${slot.startPeriod}`;
          errors.push(
            `Time slots must have at least 1 hour gap. Previous slot ends at ${prevEndTimeStr}, current slot starts at ${currentStartTimeStr}`,
          );
        }
      }

      // Check for overlapping time slots
      if (index > 0) {
        const prevSlot = sortedSlots[index - 1];
        const prevEndTime = toDate(
          prevSlot.endHour,
          prevSlot.endMinute,
          prevSlot.endPeriod,
        );

        if (startTime.getTime() < prevEndTime.getTime()) {
          errors.push("Time slots cannot overlap");
        }
      }
    });

    return [...new Set(errors)]; // Remove duplicates
  };

  const handleTimeSlotChange = (
    day: DayOfWeek | "common",
    id: string,
    field: keyof TimeSlotUIData,
    value: string,
  ) => {
    setFormData(
      (prev: {
        commonTimeSlots: any[];
        perDayTimeSlots: { [x: string]: any[] };
      }) => {
        if (day === "common") {
          const commonTimeSlots = prev.commonTimeSlots.map(
            (slot: { id: string }) =>
              slot.id === id ? { ...slot, [field]: value } : slot,
          );
          return { ...prev, commonTimeSlots };
        }
        const perDayTimeSlots = {
          ...prev.perDayTimeSlots,
          [day]: prev.perDayTimeSlots[day].map((slot: { id: string }) =>
            slot.id === id ? { ...slot, [field]: value } : slot,
          ),
        };
        return { ...prev, perDayTimeSlots };
      },
    );
  };

  const addTimeSlot = (day: DayOfWeek | "common") => {
    setFormData(
      (prev: {
        commonTimeSlots: TimeSlotUIData[];
        perDayTimeSlots: Record<DayOfWeek, TimeSlotUIData[]>;
      }) => {
        const currentSlots =
          day === "common"
            ? prev.commonTimeSlots
            : prev.perDayTimeSlots[day] || [];
        let newSlot: TimeSlotUIData;

        if (currentSlots.length > 0) {
          const lastSlot = currentSlots[currentSlots.length - 1];
          const lastEndTime = toDate(
            lastSlot.endHour,
            lastSlot.endMinute,
            lastSlot.endPeriod,
          );

          // Add 1 hour to the last end time to create the new start time
          const newStartTimeDate = new Date(lastEndTime.getTime());
          newStartTimeDate.setHours(newStartTimeDate.getHours() + 1);
          const newStartTime = fromDate(newStartTimeDate);

          // Add another hour to create the new end time
          const newEndTimeDate = new Date(newStartTimeDate.getTime());
          newEndTimeDate.setHours(newEndTimeDate.getHours() + 1);
          const newEndTime = fromDate(newEndTimeDate);

          newSlot = {
            id: nanoid(),
            startHour: newStartTime.hour,
            startMinute: newStartTime.minute,
            startPeriod: newStartTime.period,
            endHour: newEndTime.hour,
            endMinute: newEndTime.minute,
            endPeriod: newEndTime.period,
          };
        } else {
          newSlot = {
            id: nanoid(),
            startHour: "09",
            startMinute: "00",
            startPeriod: "AM",
            endHour: "05",
            endMinute: "00",
            endPeriod: "PM",
          };
        }

        if (day === "common") {
          return {
            ...prev,
            commonTimeSlots: [...currentSlots, newSlot],
          };
        } else {
          return {
            ...prev,
            perDayTimeSlots: {
              ...prev.perDayTimeSlots,
              [day]: [...currentSlots, newSlot],
            },
          };
        }
      },
    );
  };

  const removeTimeSlot = (day: DayOfWeek | "common", id: string) => {
    setFormData(
      (prev: {
        commonTimeSlots: any[];
        perDayTimeSlots: { [x: string]: any[] };
      }) => {
        if (day === "common") {
          return {
            ...prev,
            commonTimeSlots: prev.commonTimeSlots.filter(
              (slot: { id: string }) => slot.id !== id,
            ),
          };
        }
        return {
          ...prev,
          perDayTimeSlots: {
            ...prev.perDayTimeSlots,
            [day]: prev.perDayTimeSlots[day].filter(
              (slot: { id: string }) => slot.id !== id,
            ),
          },
        };
      },
    );
  };

  // Desktop (lg+): Mon-Thu, Fri-Sun
  const dayGridDesktop: DayOfWeek[][] = [
    ["Monday", "Tuesday", "Wednesday", "Thursday"],
    ["Friday", "Saturday", "Sunday"],
  ];

  return (
    <div className="mx-auto max-w-6xl p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Working Days Section */}
        <section className="flex flex-col rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 shadow-lg sm:p-6 lg:p-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-blue-700 sm:text-2xl">
              <span>Working Days</span>
              <span className="text-sm text-red-500 sm:text-base">*</span>
            </h2>
            {formData.availabilitySchedule.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100"
              >
                Clear All
              </button>
            )}
          </div>

          <p className="mb-4 text-sm text-gray-500">
            Select the days you are available to provide services.
          </p>

          {/* Responsive day selection with integrated preset buttons */}
          <div>
            {/* Mobile View (lg and below) */}
            <div className="space-y-3 xl:hidden">
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Weekends */}
                <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-2 shadow-sm transition hover:bg-blue-100">
                  <input
                    type="checkbox"
                    checked={isWeekendChecked}
                    onChange={(e) =>
                      handlePresetChange(
                        ["Saturday", "Sunday"],
                        e.target.checked,
                      )
                    }
                    className="mb-1 rounded text-blue-600 focus:ring-blue-500"
                    style={{ width: "1.1em", height: "1.1em" }}
                  />
                  <span className="text-center text-sm font-medium text-gray-700">
                    Weekends
                  </span>
                </label>

                {/* 2. Weekdays */}
                <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-2 shadow-sm transition hover:bg-blue-100">
                  <input
                    type="checkbox"
                    checked={isWeekdayChecked}
                    onChange={(e) =>
                      handlePresetChange(
                        [
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                        ],
                        e.target.checked,
                      )
                    }
                    className="mb-1 rounded text-blue-600 focus:ring-blue-500"
                    style={{ width: "1.1em", height: "1.1em" }}
                  />
                  <span className="text-center text-sm font-medium text-gray-700">
                    Weekdays
                  </span>
                </label>

                {/* 3. Everyday (Moved here from its own row) */}
                <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-2 shadow-sm transition hover:bg-blue-100">
                  <input
                    type="checkbox"
                    checked={isEverydayChecked}
                    onChange={(e) =>
                      handlePresetChange(allDays, e.target.checked)
                    }
                    className="mb-1 rounded text-blue-600 focus:ring-blue-500"
                    style={{ width: "1.1em", height: "1.1em" }}
                  />
                  <span className="text-center text-sm font-medium text-gray-700">
                    Everyday
                  </span>
                </label>
              </div>
              {/* End of consolidated preset row */}

              {/* Row 3: Monday - Friday (Remains the same) */}
              <div className="grid grid-cols-4 gap-1">
                {["Monday", "Tuesday", "Wednesday", "Thursday"].map((day) => (
                  <label
                    key={day}
                    className={`flex h-16 cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-1 text-center shadow-sm transition ${
                      formData.availabilitySchedule.includes(day as DayOfWeek)
                        ? "border-blue-400 bg-blue-100"
                        : "border-gray-200 bg-white hover:bg-blue-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.availabilitySchedule.includes(
                        day as DayOfWeek,
                      )}
                      onChange={() => handleDayToggle(day as DayOfWeek)}
                      className="mb-1 rounded text-blue-600 focus:ring-blue-500"
                      style={{ width: "1.0em", height: "1.0em" }}
                    />
                    <span className="text-xs font-medium text-gray-700">
                      {day.slice(0, 3)}
                    </span>
                  </label>
                ))}
              </div>

              {/* Row 4: Saturday, Sunday, Clear All (Remains the same) */}
              <div className="grid grid-cols-3 gap-2">
                {["Friday", "Saturday", "Sunday"].map((day) => (
                  <label
                    key={day}
                    className={`flex h-16 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 py-2 text-center shadow-sm transition ${
                      formData.availabilitySchedule.includes(day as DayOfWeek)
                        ? "border-blue-400 bg-blue-100"
                        : "border-gray-200 bg-white hover:bg-blue-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.availabilitySchedule.includes(
                        day as DayOfWeek,
                      )}
                      onChange={() => handleDayToggle(day as DayOfWeek)}
                      className="mb-1 rounded text-blue-600 focus:ring-blue-500"
                      style={{ width: "1.1em", height: "1.1em" }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {day.slice(0, 3)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Desktop View (lg+) */}
            <div className="hidden xl:block">
              {/* Preset buttons row */}
              <div className="mb-4 flex justify-center gap-3">
                <label className="flex h-16 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm transition hover:bg-blue-100">
                  <input
                    type="checkbox"
                    checked={isWeekendChecked}
                    onChange={(e) =>
                      handlePresetChange(
                        ["Saturday", "Sunday"],
                        e.target.checked,
                      )
                    }
                    className="mb-1 mt-2 rounded text-blue-600 focus:ring-blue-500"
                    style={{ width: "1.2em", height: "1.2em" }}
                  />
                  <span className="px-2 text-base font-medium text-gray-700">
                    Weekends
                  </span>
                </label>

                <label className="flex h-16 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm transition hover:bg-blue-100">
                  <input
                    type="checkbox"
                    checked={isWeekdayChecked}
                    onChange={(e) =>
                      handlePresetChange(
                        [
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                        ],
                        e.target.checked,
                      )
                    }
                    className="mb-1 mt-2 rounded text-blue-600 focus:ring-blue-500"
                    style={{ width: "1.2em", height: "1.2em" }}
                  />
                  <span className="px-2 text-base font-medium text-gray-700">
                    Weekdays
                  </span>
                </label>

                <label className="flex h-16 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm transition hover:bg-blue-100">
                  <input
                    type="checkbox"
                    checked={isEverydayChecked}
                    onChange={(e) =>
                      handlePresetChange(allDays, e.target.checked)
                    }
                    className="mb-1 mt-2 rounded text-blue-600 focus:ring-blue-500"
                    style={{ width: "1.2em", height: "1.2em" }}
                  />
                  <span className="px-2 text-base font-medium text-gray-700">
                    Everyday
                  </span>
                </label>
              </div>

              {/* Days grid for desktop */}
              <div className="flex flex-col gap-3">
                {dayGridDesktop.map((row, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="flex flex-1 justify-center gap-3"
                  >
                    {row.map((day) => (
                      <label
                        key={day}
                        className={`flex h-16 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border px-0 py-0 text-center shadow-sm transition ${
                          formData.availabilitySchedule.includes(day)
                            ? "border-blue-400 bg-blue-100"
                            : "border-gray-200 bg-white hover:bg-blue-50"
                        }`}
                        style={{ minWidth: "6rem", minHeight: "4rem" }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.availabilitySchedule.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          className="mb-1 mt-2 rounded text-blue-600 focus:ring-blue-500"
                          style={{ width: "1.2em", height: "1.2em" }}
                        />
                        <span className="px-2 text-base font-medium text-gray-700">
                          {day}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {validationErrors.availabilitySchedule && (
            <p className="mt-2 text-sm text-red-600">
              {validationErrors.availabilitySchedule}
            </p>
          )}
        </section>

        {/* Working Hours Section */}
        <section className="flex flex-col rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 shadow-lg sm:p-6 lg:p-8">
          <h2 className="mb-2 text-xl font-bold text-blue-700 sm:text-2xl">
            Working Hours{" "}
            <span className="text-sm text-red-500 sm:text-base">*</span>
          </h2>
          <div className="mb-4 flex items-start sm:items-center">
            <input
              type="checkbox"
              id="useSameTimeForAllDays"
              checked={formData.useSameTimeForAllDays}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  useSameTimeForAllDays: e.target.checked,
                }))
              }
              className="mt-1 rounded text-blue-600 focus:ring-blue-500 sm:mt-0"
            />
            <label
              htmlFor="useSameTimeForAllDays"
              className="ml-2 text-sm font-medium leading-relaxed text-gray-700 sm:text-base"
            >
              Use the same working hours for all selected days
            </label>
          </div>

          {formData.useSameTimeForAllDays ? (
            <div className="space-y-2">
              {formData.commonTimeSlots.map((slot) => (
                <TimeSlotInput
                  key={slot.id}
                  slot={slot}
                  onSlotChange={(id, field, value) =>
                    handleTimeSlotChange("common", id, field, value)
                  }
                  onRemoveSlot={(id) => removeTimeSlot("common", id)}
                />
              ))}
              <button
                type="button"
                onClick={() => addTimeSlot("common")}
                className="mt-2 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                <PlusCircleIcon className="h-5 w-5" />
                Add Time Slot
              </button>
              {/* Error messages for common time slots */}
              {getTimeValidationErrors(formData.commonTimeSlots).map(
                (error, index) => (
                  <div
                    key={index}
                    className="mt-2 flex items-center gap-2 text-sm text-red-600"
                  >
                    <span>⚠️ {error}</span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {formData.availabilitySchedule.map((day) => (
                <div
                  key={day}
                  className="flex flex-col rounded-lg border border-blue-100 bg-white p-4 shadow-sm"
                >
                  <h4 className="mb-2 font-semibold text-blue-700">{day}</h4>
                  <div className="flex flex-col gap-2">
                    {(formData.perDayTimeSlots[day] || []).map((slot) => (
                      <TimeSlotInput
                        key={slot.id}
                        slot={slot}
                        onSlotChange={(id, field, value) =>
                          handleTimeSlotChange(day, id, field, value)
                        }
                        onRemoveSlot={(id) => removeTimeSlot(day, id)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addTimeSlot(day)}
                    className="mt-2 flex items-center gap-1 self-end text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <PlusCircleIcon className="h-5 w-5" />
                    Add Time Slot
                  </button>
                  {/* Error messages for per-day time slots */}
                  {getTimeValidationErrors(
                    formData.perDayTimeSlots[day] || [],
                  ).map((error, index) => (
                    <div
                      key={index}
                      className="mt-2 flex items-center gap-2 text-sm text-red-600"
                    >
                      <span>⚠️ {error}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {/* Error message for same start/end time is now displayed below each "Add Time Slot" button */}
          {validationErrors.timeSlots && (
            <p className="mt-4 text-sm text-red-600">
              {validationErrors.timeSlots}
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default ServiceAvailability;
