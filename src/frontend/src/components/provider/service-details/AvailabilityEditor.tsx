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
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="mb-4 text-sm text-gray-600">
        Toggle availability for each day and specify time slots.
      </p>

      <div className="mb-4 rounded-md bg-blue-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-blue-800">
          Apply a Time Slot to Multiple Days
        </h4>

        <div className="mb-3 flex flex-col gap-2 text-sm md:items-center lg:flex-row">
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
            className="w-full rounded-md border border-gray-300 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
          />
          <span className="mx-auto md:mx-0">-</span>
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
            className="w-full rounded-md border border-gray-300 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2">
          <button
            onClick={() => setScheduleToDays(allDays)}
            className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            Apply to All
          </button>
          <button
            onClick={() => setScheduleToDays(weekdays)}
            className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            Apply to Weekdays
          </button>
          <button
            onClick={() => setScheduleToDays(weekends)}
            className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
          >
            Apply to Weekends
          </button>
          <button
            onClick={deselectAllDays}
            className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Deselect All
          </button>
        </div>
        {missingDays.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-blue-700">
              Add a day:
            </span>
            {missingDays.map((day) => (
              <button
                key={day}
                onClick={() => handleAddDay(day)}
                className="rounded-full bg-blue-200 px-3 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300"
                type="button"
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {sortedSchedule.map((dayEntry) => {
        const dayErrors = validateTimeSlots(dayEntry.availability.slots || []);
        return (
          <div
            key={dayEntry.day}
            id={`availability-day-${dayEntry.day}`}
            className="mb-4 rounded-md border border-gray-100 p-3"
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={dayEntry.availability.isAvailable}
                  onChange={() => {
                    const newSchedule = [...weeklySchedule];
                    newSchedule[
                      weeklySchedule.findIndex((d) => d.day === dayEntry.day)
                    ] = {
                      ...dayEntry,
                      availability: {
                        ...dayEntry.availability,
                        isAvailable: !dayEntry.availability.isAvailable,
                      },
                    };
                    setWeeklySchedule(newSchedule);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                {dayEntry.day}
              </label>
              {dayEntry.availability.isAvailable && (
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
                      const newStartTime = lastSlotEndTime;
                      const newEndTime = addHoursToTime(newStartTime, 2);
                      newSlot = {
                        startTime: newStartTime,
                        endTime: newEndTime,
                      };
                    } else {
                      newSlot = { startTime: "09:00", endTime: "17:00" };
                    }
                    newSchedule[idx].availability.slots = [...slots, newSlot];
                    setWeeklySchedule(newSchedule);
                  }}
                  className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  aria-label={`Add time slot for ${dayEntry.day}`}
                >
                  <PlusCircleIcon className="h-4 w-4 lg:mr-1" />
                  <span className="hidden lg:inline">Add Slot</span>
                </button>
              )}
            </div>

            {dayEntry.availability.isAvailable && (
              <div className="mt-3 space-y-3">
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
                          className={`rounded-lg border p-3 ${
                            isSameTime || isStartAfterEnd
                              ? "border-red-200 bg-red-50"
                              : dayErrors.length > 0
                                ? "border-yellow-200 bg-yellow-50"
                                : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex flex-1 flex-col gap-2 md:items-center lg:flex-row">
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
                                    ].endTime = addHoursToTime(newStartTime, 1);
                                  }
                                  setWeeklySchedule(newSchedule);
                                }}
                                className={`w-full rounded-md border px-2 py-1 focus:ring-2 ${
                                  isSameTime || isStartAfterEnd
                                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
                                    : "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200"
                                }`}
                              />
                              <span className="mx-auto text-gray-500 md:mx-0">
                                to
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
                                className={`w-full rounded-md border px-2 py-1 focus:ring-2 ${
                                  isSameTime || isStartAfterEnd
                                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
                                    : "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200"
                                }`}
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newSchedule = [...weeklySchedule];
                                newSchedule[
                                  weeklySchedule.findIndex(
                                    (d) => d.day === dayEntry.day,
                                  )
                                ].availability.slots!.splice(slotIndex, 1);
                                setWeeklySchedule(newSchedule);
                              }}
                              className="rounded-full p-1 text-red-600 hover:bg-red-100"
                              aria-label="Remove time slot"
                            >
                              <MinusCircleIcon className="h-5 w-5" />
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
                  <p className="text-sm text-gray-500">No time slots added.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AvailabilityEditor;
