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
const minuteOptions = ["00", "15", "30", "45"];
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
      className={`mb-2 flex flex-col gap-3 rounded-lg border p-3 shadow-sm ${
        isSameTime ? "border-red-200 bg-red-50" : "border-blue-100 bg-blue-50"
      }`}
    >
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:gap-2">
        {/* Start Time */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <span className="text-sm font-medium text-gray-600">Start:</span>
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

        {/* "to" separator */}
        <div className="my-4 flex items-center justify-center py-1 sm:my-6 lg:my-0 lg:py-0">
          <span className="text-sm font-medium text-gray-500 lg:text-base">
            to
          </span>
        </div>

        {/* End Time */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <span className="text-sm font-medium text-gray-600">End:</span>
          <div className="flex gap-1 sm:gap-2">
            <select
              value={slot.endHour}
              onChange={(e) => onSlotChange(slot.id, "endHour", e.target.value)}
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

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onRemoveSlot(slot.id)}
        className="mt-3 self-center self-end rounded-full bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700 lg:mt-0 lg:ml-auto"
        title="Remove time slot"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
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
    timeSlots.forEach((slot) => {
      const startTime = toDate(
        slot.startHour,
        slot.startMinute,
        slot.startPeriod,
      );
      const endTime = toDate(slot.endHour, slot.endMinute, slot.endPeriod);
      if (startTime.getTime() === endTime.getTime()) {
        errors.push("Start and end times cannot be the same");
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
          const newStartTime = fromDate(lastEndTime);

          const newEndTimeDate = new Date(lastEndTime.getTime());
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
          <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-blue-700 sm:text-2xl">
            <span>Working Days</span>
            <span className="text-sm text-red-500 sm:text-base">*</span>
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Select the days you are available to provide services.
          </p>

          {/* Responsive day selection with integrated preset buttons */}
          <div>
            {/* Mobile View (lg and below) */}
            <div className="space-y-3 lg:hidden">
              {/* Row 1: Weekends, Weekdays */}
              <div className="grid grid-cols-2 gap-2">
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
              </div>

              {/* Row 2: Everyday */}
              <div className="grid grid-cols-1">
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

              {/* Row 3: Monday - Friday */}
              <div className="grid grid-cols-5 gap-1">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                  (day) => (
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
                  ),
                )}
              </div>

              {/* Row 4: Saturday, Sunday, Clear All */}
              <div className="grid grid-cols-3 gap-2">
                {["Saturday", "Sunday"].map((day) => (
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

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex h-16 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2 text-sm font-medium text-red-600 shadow-sm hover:border-red-300 hover:bg-red-100"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Desktop View (lg+) */}
            <div className="hidden lg:block">
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
                    className="mt-2 mb-1 rounded text-blue-600 focus:ring-blue-500"
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
                    className="mt-2 mb-1 rounded text-blue-600 focus:ring-blue-500"
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
                    className="mt-2 mb-1 rounded text-blue-600 focus:ring-blue-500"
                    style={{ width: "1.2em", height: "1.2em" }}
                  />
                  <span className="px-2 text-base font-medium text-gray-700">
                    Everyday
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex h-16 w-28 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-base font-medium text-red-600 shadow-sm hover:border-red-300 hover:bg-red-100"
                >
                  Clear All
                </button>
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
                          className="mt-2 mb-1 rounded text-blue-600 focus:ring-blue-500"
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
              className="ml-2 text-sm leading-relaxed font-medium text-gray-700 sm:text-base"
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
