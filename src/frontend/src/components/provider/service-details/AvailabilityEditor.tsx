import React, { useState } from "react";
import { PlusCircleIcon, MinusCircleIcon } from "@heroicons/react/24/solid";
import {
  DayOfWeek,
  DayAvailability,
  TimeSlot,
} from "../../../hooks/serviceManagement";
import {
  addHoursToTime,
  timeStringToDate,
  validateTimeSlots,
} from "./timeUtils";

export interface WeeklyScheduleEntry {
  day: DayOfWeek;
  availability: DayAvailability;
}

interface AvailabilityEditorProps {
  weeklySchedule: WeeklyScheduleEntry[];
  setWeeklySchedule: React.Dispatch<
    React.SetStateAction<WeeklyScheduleEntry[]>
  >;
}

const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({
  weeklySchedule,
  setWeeklySchedule,
}) => {
  const [templateTimeSlot, setTemplateTimeSlot] = useState<TimeSlot>({
    startTime: "09:00",
    endTime: "17:00",
  });

  const allDays: DayOfWeek[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const weekdays: DayOfWeek[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];
  const weekends: DayOfWeek[] = ["Sunday", "Saturday"];

  const missingDays = allDays.filter(
    (day) => !weeklySchedule.some((entry) => entry.day === day),
  );

  const handleAddDay = (day: DayOfWeek) => {
    setWeeklySchedule([
      ...weeklySchedule,
      { day, availability: { isAvailable: false, slots: [] } },
    ]);
  };

  const setScheduleToDays = (days: DayOfWeek[]) => {
    setWeeklySchedule(
      days.map((day) => ({
        day,
        availability: {
          isAvailable: true,
          slots: [
            {
              startTime: templateTimeSlot.startTime,
              endTime: templateTimeSlot.endTime,
            },
          ],
        },
      })),
    );
  };

  const deselectAllDays = () => {
    setWeeklySchedule((prev) =>
      prev.map((day) => ({
        ...day,
        availability: { ...day.availability, isAvailable: false, slots: [] },
      })),
    );
  };

  const sortedSchedule = [...weeklySchedule].sort(
    (a, b) =>
      allDays.indexOf(a.day as DayOfWeek) - allDays.indexOf(b.day as DayOfWeek),
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-6 text-[13px] text-gray-500">
        Toggle availability for each day and specify time slots.
      </p>

      <div className="mb-6 rounded-xl bg-gray-50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">
          Apply a Time Slot to Multiple Days
        </h4>

        <div className="mb-4 flex flex-col gap-3 text-sm md:items-center lg:flex-row">
          <input
            type="time"
            value={templateTimeSlot.startTime}
            onChange={(e) => {
              const newStartTime = e.target.value;
              setTemplateTimeSlot({
                ...templateTimeSlot,
                startTime: newStartTime,
                endTime:
                  newStartTime === templateTimeSlot.endTime
                    ? addHoursToTime(newStartTime, 1)
                    : templateTimeSlot.endTime,
              });
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-yellow-500 focus:ring-yellow-500"
          />
          <span className="mx-auto text-gray-400 md:mx-0">-</span>
          <input
            type="time"
            value={templateTimeSlot.endTime}
            onChange={(e) => {
              const newEndTime = e.target.value;
              if (newEndTime !== templateTimeSlot.startTime) {
                setTemplateTimeSlot({
                  ...templateTimeSlot,
                  endTime: newEndTime,
                });
              }
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-yellow-500 focus:ring-yellow-500"
          />
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2">
          <button
            onClick={() => setScheduleToDays(allDays)}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100"
          >
            Apply to All
          </button>
          <button
            onClick={() => setScheduleToDays(weekdays)}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100"
          >
            Apply to Weekdays
          </button>
          <button
            onClick={() => setScheduleToDays(weekends)}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100"
          >
            Apply to Weekends
          </button>
          <button
            onClick={deselectAllDays}
            className="rounded-lg border border-gray-200 bg-gray-100 px-3.5 py-2 text-[13px] font-semibold text-gray-600 transition-all hover:bg-gray-200"
          >
            Deselect All
          </button>
        </div>
        {missingDays.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
            <span className="text-xs font-semibold text-gray-500">
              Add a day:
            </span>
            {missingDays.map((day) => (
              <button
                key={day}
                onClick={() => handleAddDay(day)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                type="button"
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {sortedSchedule.map((dayEntry) => {
          const dayErrors = validateTimeSlots(
            dayEntry.availability.slots || [],
          );
          const isSelected = dayEntry.availability.isAvailable;

          return (
            <div
              key={dayEntry.day}
              id={`availability-day-${dayEntry.day}`}
              className={`rounded-xl border transition-all ${isSelected ? "border-yellow-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50"}`}
            >
              <div
                className={`flex items-center justify-between px-4 py-3 ${isSelected ? "border-b border-gray-100" : ""}`}
              >
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-900">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? "border-yellow-500 bg-yellow-500 text-white" : "border-gray-300 bg-white"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      className="hidden"
                      onChange={() => {
                        const newSchedule = [...weeklySchedule];
                        const idx = weeklySchedule.findIndex(
                          (d) => d.day === dayEntry.day,
                        );
                        const currentlyAvailable =
                          dayEntry.availability.isAvailable;

                        // When enabling a day, always ensure it has at least one slot
                        const newAvailability = {
                          ...dayEntry.availability,
                          isAvailable: !currentlyAvailable,
                          slots: !currentlyAvailable
                            ? !dayEntry.availability.slots ||
                              dayEntry.availability.slots.length === 0
                              ? [
                                  {
                                    startTime: templateTimeSlot.startTime,
                                    endTime: templateTimeSlot.endTime,
                                  },
                                ]
                              : dayEntry.availability.slots
                            : dayEntry.availability.slots || [],
                        };

                        newSchedule[idx] = {
                          ...dayEntry,
                          availability: newAvailability,
                        };

                        setWeeklySchedule(newSchedule);
                      }}
                    />
                    {isSelected && (
                      <svg
                        className="pointer-events-none h-3 w-3"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M3 8L6 11L11 3.5"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          stroke="currentColor"
                        />
                      </svg>
                    )}
                  </div>
                  {dayEntry.day}
                </label>
                {isSelected && (
                  <button
                    onClick={() => {
                      const idx = weeklySchedule.findIndex(
                        (d) => d.day === dayEntry.day,
                      );
                      const newSchedule = [...weeklySchedule];
                      const slots = newSchedule[idx].availability.slots || [];
                      let newSlot: TimeSlot;

                      if (slots.length > 0) {
                        const lastSlotEndTime = slots[slots.length - 1].endTime;
                        const newStartTime = addHoursToTime(lastSlotEndTime, 1);
                        const newEndTime = addHoursToTime(newStartTime, 1);
                        newSlot = {
                          startTime: newStartTime,
                          endTime: newEndTime,
                        };
                      } else {
                        // Keep the existing default behavior for first slot
                        newSlot = { startTime: "09:00", endTime: "17:00" };
                      }

                      newSchedule[idx].availability.slots = [...slots, newSlot];
                      setWeeklySchedule(newSchedule);
                    }}
                    className="inline-flex items-center rounded-full bg-yellow-50 px-3 py-1.5 text-xs font-bold text-yellow-700 transition-colors hover:bg-yellow-100"
                    aria-label={`Add time slot for ${dayEntry.day}`}
                  >
                    <PlusCircleIcon className="mr-1 h-4 w-4 text-yellow-600" />
                    Add Slot
                  </button>
                )}
              </div>

              {isSelected && (
                <div className="space-y-3 p-4">
                  {dayEntry.availability.slots &&
                  dayEntry.availability.slots.length > 0 ? (
                    <>
                      {dayEntry.availability.slots.map((slot, slotIndex) => {
                        const isSameTime = slot.startTime === slot.endTime;
                        const startTime = timeStringToDate(slot.startTime);
                        const endTime = timeStringToDate(slot.endTime);
                        const isStartAfterEnd =
                          startTime.getTime() > endTime.getTime();

                        return (
                          <div
                            key={slotIndex}
                            className={`rounded-xl border p-3 transition-colors ${
                              isSameTime || isStartAfterEnd
                                ? "border-red-200 bg-red-50"
                                : dayErrors.length > 0
                                  ? "border-yellow-200 bg-yellow-50"
                                  : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => {
                                    const newStartTime = e.target.value;
                                    const newSchedule = [...weeklySchedule];
                                    const dayIndex = weeklySchedule.findIndex(
                                      (d) => d.day === dayEntry.day,
                                    );
                                    newSchedule[dayIndex].availability.slots![
                                      slotIndex
                                    ].startTime = newStartTime;
                                    if (newStartTime === slot.endTime) {
                                      newSchedule[dayIndex].availability.slots![
                                        slotIndex
                                      ].endTime = addHoursToTime(
                                        newStartTime,
                                        1,
                                      );
                                    }
                                    setWeeklySchedule(newSchedule);
                                  }}
                                  className={`w-full rounded-lg border px-3 py-2 font-medium transition-colors focus:ring-2 ${
                                    isSameTime || isStartAfterEnd
                                      ? "border-red-300 bg-white text-red-900 focus:border-red-500 focus:ring-red-200"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-yellow-500 focus:ring-yellow-200"
                                  }`}
                                />
                                <span className="mx-auto text-xs font-semibold uppercase text-gray-400 sm:mx-0">
                                  TO
                                </span>
                                <input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) => {
                                    const newEndTime = e.target.value;
                                    if (newEndTime !== slot.startTime) {
                                      const newSchedule = [...weeklySchedule];
                                      newSchedule[
                                        weeklySchedule.findIndex(
                                          (d) => d.day === dayEntry.day,
                                        )
                                      ].availability.slots![slotIndex].endTime =
                                        newEndTime;
                                      setWeeklySchedule(newSchedule);
                                    }
                                  }}
                                  className={`w-full rounded-lg border px-3 py-2 font-medium transition-colors focus:ring-2 ${
                                    isSameTime || isStartAfterEnd
                                      ? "border-red-300 bg-white text-red-900 focus:border-red-500 focus:ring-red-200"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-yellow-500 focus:ring-yellow-200"
                                  }`}
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const newSchedule = [...weeklySchedule];
                                  const dayIdx = weeklySchedule.findIndex(
                                    (d) => d.day === dayEntry.day,
                                  );
                                  const currentSlots =
                                    newSchedule[dayIdx].availability.slots ||
                                    [];

                                  // Prevent removing the last slot if day is marked as available
                                  if (
                                    currentSlots.length <= 1 &&
                                    dayEntry.availability.isAvailable
                                  ) {
                                    // Instead of removing, uncheck the day
                                    newSchedule[
                                      dayIdx
                                    ].availability.isAvailable = false;
                                    newSchedule[dayIdx].availability.slots = [];
                                  } else {
                                    // Remove the slot
                                    newSchedule[
                                      dayIdx
                                    ].availability.slots!.splice(slotIndex, 1);
                                  }

                                  setWeeklySchedule(newSchedule);
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
                                aria-label="Remove time slot"
                              >
                                <MinusCircleIcon className="h-6 w-6" />
                              </button>
                            </div>
                            {(isSameTime || isStartAfterEnd) && (
                              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                                <span>⚠️</span>
                                <span>
                                  {isSameTime
                                    ? "Start and end times cannot be the same"
                                    : "Start time cannot be after end time"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {dayErrors.map((error, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800"
                        >
                          <span>⚠️</span>
                          <span>{error}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm italic text-red-500">
                      Day must have at least one time slot
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvailabilityEditor;
