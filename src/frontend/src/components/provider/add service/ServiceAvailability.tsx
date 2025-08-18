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

const TimeSlotInput: React.FC<{
  slot: TimeSlotUIData;
  onSlotChange: (
    id: string,
    field: keyof TimeSlotUIData,
    value: string,
  ) => void;
  onRemoveSlot: (id: string) => void;
}> = ({ slot, onSlotChange, onRemoveSlot }) => (
  <div className="mb-2 flex flex-col gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 shadow-sm sm:flex-row sm:items-center">
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
      <div className="flex gap-2">
        <select
          value={slot.startHour}
          onChange={(e) => onSlotChange(slot.id, "startHour", e.target.value)}
          className="rounded-md border-gray-300 bg-white text-sm shadow-sm"
        >
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-gray-400">:</span>
        <select
          value={slot.startMinute}
          onChange={(e) => onSlotChange(slot.id, "startMinute", e.target.value)}
          className="rounded-md border-gray-300 bg-white text-sm shadow-sm"
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={slot.startPeriod}
          onChange={(e) => onSlotChange(slot.id, "startPeriod", e.target.value)}
          className="rounded-md border-gray-300 bg-white text-sm shadow-sm"
        >
          {periodOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <span className="hidden text-gray-500 sm:inline">to</span>
      <div className="mt-2 flex gap-2 sm:mt-0">
        <select
          value={slot.endHour}
          onChange={(e) => onSlotChange(slot.id, "endHour", e.target.value)}
          className="rounded-md border-gray-300 bg-white text-sm shadow-sm"
        >
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-gray-400">:</span>
        <select
          value={slot.endMinute}
          onChange={(e) => onSlotChange(slot.id, "endMinute", e.target.value)}
          className="rounded-md border-gray-300 bg-white text-sm shadow-sm"
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={slot.endPeriod}
          onChange={(e) => onSlotChange(slot.id, "endPeriod", e.target.value)}
          className="rounded-md border-gray-300 bg-white text-sm shadow-sm"
        >
          {periodOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
    </div>
    <button
      type="button"
      onClick={() => onRemoveSlot(slot.id)}
      className="self-end rounded-full bg-red-50 p-2 text-red-500 hover:bg-red-100 hover:text-red-700 sm:ml-auto"
      title="Remove time slot"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  </div>
);

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

  // Desktop: Mon-Thu, Fri-Sun
  const dayGridDesktop: DayOfWeek[][] = [
    ["Monday", "Tuesday", "Wednesday", "Thursday"],
    ["Friday", "Saturday", "Sunday"],
  ];
  // Mobile: Mon-Wed, Thu-Sat, Sun
  const dayGridMobile: DayOfWeek[][] = [
    ["Monday", "Tuesday", "Wednesday"],
    ["Thursday", "Friday", "Saturday"],
    ["Sunday"],
  ];

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Working Days Section */}
        <section className="flex flex-col rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-lg">
          <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold text-blue-700">
            <span>Working Days</span>
            <span className="text-base text-red-500">*</span>
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Select the days you are available to provide services.
          </p>

          {/* Centered Preset Checkboxes and Clear All Button */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 shadow-sm transition hover:bg-blue-100">
              <input
                type="checkbox"
                checked={isWeekendChecked}
                onChange={(e) =>
                  handlePresetChange(["Saturday", "Sunday"], e.target.checked)
                }
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Weekends
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 shadow-sm transition hover:bg-blue-100">
              <input
                type="checkbox"
                checked={isWeekdayChecked}
                onChange={(e) =>
                  handlePresetChange(
                    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    e.target.checked,
                  )
                }
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Weekdays
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 shadow-sm transition hover:bg-blue-100">
              <input
                type="checkbox"
                checked={isEverydayChecked}
                onChange={(e) => handlePresetChange(allDays, e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Everyday
              </span>
            </label>

            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100"
            >
              Clear All
            </button>
          </div>

          {/* Responsive 2-row (desktop) or 3-row (mobile) grid for days */}
          <div>
            {/* Desktop */}
            <div className="hidden flex-col gap-3 md:flex">
              {dayGridDesktop.map((row, rowIdx) => (
                <div key={rowIdx} className="flex flex-1 justify-center gap-3">
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
                      <span className="px-2 text-base font-medium break-words text-gray-700">
                        {day}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            {/* Mobile */}
            <div className="flex flex-col gap-3 md:hidden">
              {dayGridMobile.map((row, rowIdx) => (
                <div key={rowIdx} className="flex flex-1 justify-center gap-3">
                  {row.map((day) => (
                    <label
                      key={day}
                      className={`flex h-14 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border px-0 py-0 text-center shadow-sm transition ${
                        formData.availabilitySchedule.includes(day)
                          ? "border-blue-400 bg-blue-100"
                          : "border-gray-200 bg-white hover:bg-blue-50"
                      }`}
                      style={{ minWidth: "5.5rem", minHeight: "3.5rem" }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.availabilitySchedule.includes(day)}
                        onChange={() => handleDayToggle(day)}
                        className="mt-2 mb-1 rounded text-blue-600 focus:ring-blue-500"
                        style={{ width: "1.1em", height: "1.1em" }}
                      />
                      <span className="px-2 text-sm font-medium break-words text-gray-700">
                        {day}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {validationErrors.availabilitySchedule && (
            <p className="mt-2 text-sm text-red-600">
              {validationErrors.availabilitySchedule}
            </p>
          )}
        </section>

        {/* Working Hours Section */}
        <section className="flex flex-col rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-lg">
          <h2 className="mb-2 text-2xl font-bold text-blue-700">
            Working Hours <span className="text-base text-red-500">*</span>
          </h2>
          <div className="mb-4 flex items-center">
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
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="useSameTimeForAllDays"
              className="ml-2 text-base font-medium text-gray-700"
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
                </div>
              ))}
            </div>
          )}
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
