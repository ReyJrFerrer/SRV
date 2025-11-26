import React from "react";
import { DayOfWeek } from "../../../hooks/serviceManagement"; // Adjust path as needed
import { TrashIcon, PlusCircleIcon } from "@heroicons/react/24/solid";
import { nanoid } from "nanoid";
import { XMarkIcon } from "@heroicons/react/24/outline";

// --- Interfaces ---
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

// --- Helpers: 12h State <-> 24h Input Conversion ---

// Converts your state (12h) -> HTML Input (24h) "14:30"
const getStateAs24h = (h: string, m: string, p: "AM" | "PM") => {
  let hour = parseInt(h, 10);
  if (p === "PM" && hour !== 12) hour += 12;
  if (p === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${m}`;
};

// Converts HTML Input (24h) -> Your State (12h)
const parse24hToState = (timeStr: string) => {
  if (!timeStr) return { hour: "09", minute: "00", period: "AM" as const };
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  else if (h === 0) h = 12;
  return {
    hour: String(h).padStart(2, "0"),
    minute: mStr,
    period: period as "AM" | "PM",
  };
};

// --- Helpers: Logic & Validation ---
const toDate = (hour: string, minute: string, period: "AM" | "PM"): Date => {
  const date = new Date();
  let h = parseInt(hour, 10);
  if (period === "PM" && h !== 12) h += 12;
  else if (period === "AM" && h === 12) h = 0;
  date.setHours(h, parseInt(minute, 10), 0, 0);
  return date;
};

const fromDate = (
  date: Date,
): { hour: string; minute: string; period: "AM" | "PM" } => {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  else if (h === 0) h = 12;
  return { hour: String(h).padStart(2, "0"), minute: m, period };
};

const getTimeValidationErrors = (slots: TimeSlotUIData[]): string[] => {
  const errors: string[] = [];
  const sortedSlots = [...slots].sort((a, b) => {
    return (
      toDate(a.startHour, a.startMinute, a.startPeriod).getTime() -
      toDate(b.startHour, b.startMinute, b.startPeriod).getTime()
    );
  });

  sortedSlots.forEach((slot, index) => {
    const startTime = toDate(
      slot.startHour,
      slot.startMinute,
      slot.startPeriod,
    );
    const endTime = toDate(slot.endHour, slot.endMinute, slot.endPeriod);

    if (startTime.getTime() === endTime.getTime())
      errors.push("Start and end times cannot be the same");
    if (startTime.getTime() > endTime.getTime())
      errors.push("Start time cannot be after end time");

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
  return [...new Set(errors)];
};

// --- Sub-Component: Native Input without Clock Icon ---
// --- Sub-Component: Native Input (Mobile Optimized) ---
const TimeSlotInput: React.FC<{
  slot: TimeSlotUIData;
  onUpdate: (id: string, updates: Partial<TimeSlotUIData>) => void;
  onRemove: (id: string) => void;
}> = ({ slot, onUpdate, onRemove }) => {
  const handleTimeChange = (type: "start" | "end", value: string) => {
    const { hour, minute, period } = parse24hToState(value);
    if (type === "start") {
      onUpdate(slot.id, {
        startHour: hour,
        startMinute: minute,
        startPeriod: period,
      });
    } else {
      onUpdate(slot.id, {
        endHour: hour,
        endMinute: minute,
        endPeriod: period,
      });
    }
  };

  return (
    <div className="relative flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-300 md:gap-3">
      {/* Start Input */}
      <div className="flex min-w-[120px] flex-1 flex-col gap-1">
        <label className="py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          From
        </label>
        <div className="relative">
          <input
            type="time"
            value={getStateAs24h(
              slot.startHour,
              slot.startMinute,
              slot.startPeriod,
            )}
            onChange={(e) => handleTimeChange("start", e.target.value)}
            // UPDATED: 'text-base' prevents iOS zoom, 'sm:text-sm' keeps it small on desktop
            className="w-full appearance-none rounded-md border border-gray-200 bg-gray-50 py-2 pl-3 pr-2 text-base font-medium text-gray-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm [&::-webkit-calendar-picker-indicator]:hidden"
          />
        </div>
      </div>

      {/* End Input */}
      <div className="flex min-w-[120px] flex-1 flex-col gap-1">
        <label className="py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          To
        </label>
        <div className="relative">
          <input
            type="time"
            value={getStateAs24h(slot.endHour, slot.endMinute, slot.endPeriod)}
            onChange={(e) => handleTimeChange("end", e.target.value)}
            // UPDATED: 'text-base' prevents iOS zoom, 'sm:text-sm' keeps it small on desktop
            className="w-full appearance-none rounded-md border border-gray-200 bg-gray-50 py-2 pl-3 pr-2 text-base font-medium text-gray-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm [&::-webkit-calendar-picker-indicator]:hidden"
          />
        </div>
      </div>

      {/* Trash Button */}
      <button
        type="button"
        onClick={() => onRemove(slot.id)}
        className="absolute right-2 top-2 rounded-full bg-red-100 p-1.5 text-red-500 hover:bg-red-200"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

// --- Main Component ---
const ServiceAvailability: React.FC<ServiceAvailabilityProps> = ({
  formData,
  setFormData,
  validationErrors = {},
}) => {
  const weekdays: DayOfWeek[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];
  const weekends: DayOfWeek[] = ["Saturday", "Sunday"];

  const activeDays = allDays.filter((d) =>
    formData.availabilitySchedule.includes(d),
  );

  const handleDayToggle = (day: DayOfWeek) => {
    setFormData((prev: any) => {
      const isSelected = prev.availabilitySchedule.includes(day);
      if (isSelected) {
        const newSchedule = prev.availabilitySchedule.filter(
          (d: any) => d !== day,
        );
        const newPerDaySlots = { ...prev.perDayTimeSlots };
        delete newPerDaySlots[day];
        return {
          ...prev,
          availabilitySchedule: newSchedule,
          perDayTimeSlots: newPerDaySlots,
        };
      } else {
        const newSchedule = [...prev.availabilitySchedule, day];
        if (!prev.useSameTimeForAllDays && !prev.perDayTimeSlots[day]?.length) {
          return {
            ...prev,
            availabilitySchedule: newSchedule,
            perDayTimeSlots: {
              ...prev.perDayTimeSlots,
              [day]: [
                {
                  id: nanoid(),
                  startHour: "09",
                  startMinute: "00",
                  startPeriod: "AM",
                  endHour: "05",
                  endMinute: "00",
                  endPeriod: "PM",
                },
              ],
            },
          };
        }
        return { ...prev, availabilitySchedule: newSchedule };
      }
    });
  };

  const togglePreset = (presetDays: DayOfWeek[]) => {
    setFormData((prev: any) => {
      const currentSchedule = prev.availabilitySchedule;
      const areAllSelected = presetDays.every((day) =>
        currentSchedule.includes(day),
      );

      if (areAllSelected) {
        const newSchedule = currentSchedule.filter(
          (day: DayOfWeek) => !presetDays.includes(day),
        );
        const newPerDaySlots = { ...prev.perDayTimeSlots };
        presetDays.forEach((day) => delete newPerDaySlots[day]);

        return {
          ...prev,
          availabilitySchedule: newSchedule,
          perDayTimeSlots: newPerDaySlots,
        };
      } else {
        const newSchedule = [...currentSchedule];
        const newPerDaySlots = { ...prev.perDayTimeSlots };

        presetDays.forEach((day) => {
          if (!newSchedule.includes(day)) {
            newSchedule.push(day);
            if (!prev.useSameTimeForAllDays && !newPerDaySlots[day]) {
              newPerDaySlots[day] = [
                {
                  id: nanoid(),
                  startHour: "09",
                  startMinute: "00",
                  startPeriod: "AM",
                  endHour: "05",
                  endMinute: "00",
                  endPeriod: "PM",
                },
              ];
            }
          }
        });

        return {
          ...prev,
          availabilitySchedule: newSchedule,
          perDayTimeSlots: newPerDaySlots,
        };
      }
    });
  };

  const handleClearAll = () => {
    setFormData((prev: any) => ({ ...prev, availabilitySchedule: [] }));
  };

  const handleSlotUpdate = (
    day: DayOfWeek | "common",
    id: string,
    updates: Partial<TimeSlotUIData>,
  ) => {
    setFormData((prev: any) => {
      if (day === "common") {
        return {
          ...prev,
          commonTimeSlots: prev.commonTimeSlots.map((s: any) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        };
      }
      return {
        ...prev,
        perDayTimeSlots: {
          ...prev.perDayTimeSlots,
          [day]: prev.perDayTimeSlots[day].map((s: any) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        },
      };
    });
  };

  const handleAddSlot = (day: DayOfWeek | "common") => {
    setFormData((prev: any) => {
      const currentSlots =
        day === "common"
          ? prev.commonTimeSlots
          : prev.perDayTimeSlots[day] || [];
      let newSlot: TimeSlotUIData;

      if (currentSlots.length > 0) {
        const lastSlot = currentSlots[currentSlots.length - 1];
        const lastEndTimeDate = toDate(
          lastSlot.endHour,
          lastSlot.endMinute,
          lastSlot.endPeriod,
        );
        const newStartTimeDate = new Date(lastEndTimeDate.getTime());
        newStartTimeDate.setHours(newStartTimeDate.getHours() + 1);
        const newEndTimeDate = new Date(newStartTimeDate.getTime());
        newEndTimeDate.setHours(newEndTimeDate.getHours() + 1);
        const newStartTime = fromDate(newStartTimeDate);
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

      if (day === "common")
        return { ...prev, commonTimeSlots: [...prev.commonTimeSlots, newSlot] };
      return {
        ...prev,
        perDayTimeSlots: {
          ...prev.perDayTimeSlots,
          [day]: [...(prev.perDayTimeSlots[day] || []), newSlot],
        },
      };
    });
  };

  const handleRemoveSlot = (day: DayOfWeek | "common", id: string) => {
    setFormData((prev: any) => {
      if (day === "common") {
        if (prev.commonTimeSlots.length <= 1) return prev;
        return {
          ...prev,
          commonTimeSlots: prev.commonTimeSlots.filter((s: any) => s.id !== id),
        };
      }
      const slots = prev.perDayTimeSlots[day] || [];
      if (slots.length <= 1) {
        const newSchedule = prev.availabilitySchedule.filter(
          (d: any) => d !== day,
        );
        const newSlots = { ...prev.perDayTimeSlots };
        delete newSlots[day];
        return {
          ...prev,
          availabilitySchedule: newSchedule,
          perDayTimeSlots: newSlots,
        };
      }
      return {
        ...prev,
        perDayTimeSlots: {
          ...prev.perDayTimeSlots,
          [day]: slots.filter((s: any) => s.id !== id),
        },
      };
    });
  };

  const renderValidationErrors = (slots: TimeSlotUIData[]) => {
    const errors = getTimeValidationErrors(slots);
    if (errors.length === 0) return null;
    return (
      <div className="mt-2 rounded border border-red-100 bg-red-50 p-2 text-sm text-red-600">
        {errors.map((err, i) => (
          <div key={i}>• {err}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="shadow-xly rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-100 via-white to-blue-100 p-6">
        {/* --- Header & Days --- */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Availability</h2>
              <p className="text-sm text-gray-500">
                Select days to set your schedule.
              </p>
            </div>
            {/* Shortcuts */}
            <div className="hidden space-x-3 text-sm sm:block">
              <button
                type="button"
                onClick={() => togglePreset(weekdays)}
                className={`font-medium hover:underline ${
                  weekdays.every((d) =>
                    formData.availabilitySchedule.includes(d),
                  )
                    ? "font-bold text-blue-800"
                    : "text-blue-600"
                }`}
              >
                Weekdays
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => togglePreset(weekends)}
                className={`font-medium hover:underline ${
                  weekends.every((d) =>
                    formData.availabilitySchedule.includes(d),
                  )
                    ? "font-bold text-blue-800"
                    : "text-blue-600"
                }`}
              >
                Weekends
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => togglePreset(allDays)}
                className={`font-medium hover:underline ${
                  allDays.every((d) =>
                    formData.availabilitySchedule.includes(d),
                  )
                    ? "font-bold text-blue-800"
                    : "text-blue-600"
                }`}
              >
                Everyday
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="font-medium text-red-500 hover:text-red-600 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {allDays.map((day) => {
              const isSelected = formData.availabilitySchedule.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`flex h-10 min-w-[3rem] flex-1 items-center justify-center rounded-full border px-4 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <span className="sm:hidden">{day.slice(0, 3)}</span>
                  <span className="hidden sm:inline">{day.slice(0, 3)}</span>
                </button>
              );
            })}
          </div>
          {validationErrors.availabilitySchedule && (
            <p className="mt-2 text-sm text-red-600">
              {validationErrors.availabilitySchedule}
            </p>
          )}
        </section>

        <hr className="my-6 border-blue-200" />

        {/* --- Hours Section --- */}
        <section>
          <div className="mb-4 flex flex-1 flex-col items-start justify-self-start">
            <h2 className="text-xl font-bold text-gray-800">Working Hours</h2>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={formData.useSameTimeForAllDays}
                onChange={(e) =>
                  setFormData((p: any) => ({
                    ...p,
                    useSameTimeForAllDays: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Same hours daily
            </label>
          </div>

          <div className="space-y-4">
            {formData.useSameTimeForAllDays ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                {formData.commonTimeSlots.map((slot) => (
                  <div key={slot.id} className="mb-3 last:mb-0">
                    <TimeSlotInput
                      slot={slot}
                      onUpdate={(id, u) => handleSlotUpdate("common", id, u)}
                      onRemove={(id) => handleRemoveSlot("common", id)}
                    />
                  </div>
                ))}
                <button
                  onClick={() => handleAddSlot("common")}
                  className="mt-2 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  <PlusCircleIcon className="h-5 w-5" /> Add Split Shift
                </button>
                {renderValidationErrors(formData.commonTimeSlots)}
              </div>
            ) : (
              <div className="space-y-4">
                {activeDays.length === 0 && (
                  <p className="text-center italic text-gray-400">
                    Select a day above to set hours.
                  </p>
                )}
                {activeDays.map((day, index) => (
                  <React.Fragment key={day}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="w-24 pt-3 font-medium text-gray-700">
                        {day}
                      </div>
                      <div className="flex-1">
                        {(formData.perDayTimeSlots[day] || []).map((slot) => (
                          <div key={slot.id} className="mb-2">
                            <TimeSlotInput
                              slot={slot}
                              onUpdate={(id, u) => handleSlotUpdate(day, id, u)}
                              onRemove={(id) => handleRemoveSlot(day, id)}
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => handleAddSlot(day)}
                          className="flex items-center justify-start text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <PlusCircleIcon className="mr-2 inline h-5 w-5 shrink-0" />
                          Add hours
                        </button>
                        {renderValidationErrors(
                          formData.perDayTimeSlots[day] || [],
                        )}
                      </div>
                    </div>
                    {index < activeDays.length - 1 && (
                      <hr className="my-6 border-blue-200" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          {validationErrors.timeSlots && (
            <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-600">
              {validationErrors.timeSlots}
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default ServiceAvailability;
