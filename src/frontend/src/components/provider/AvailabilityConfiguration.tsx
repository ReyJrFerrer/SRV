import React from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DayOfWeek } from "../../services/serviceCanisterService";
interface TimeSlotUIData {
  id: string;
  startHour: string;
  startMinute: string;
  startPeriod: "AM" | "PM";
  endHour: string;
  endMinute: string;
  endPeriod: "AM" | "PM";
}

interface AvailabilityConfigurationProps {
  // Basic availability settings
  instantBookingEnabled: boolean;
  bookingNoticeHours: number;
  maxBookingsPerDay: number;

  // Schedule configuration
  availabilitySchedule: DayOfWeek[];
  useSameTimeForAllDays: boolean;
  commonTimeSlots: TimeSlotUIData[];
  perDayTimeSlots: Record<DayOfWeek, TimeSlotUIData[]>;

  // Event handlers
  onInstantBookingChange: (enabled: boolean) => void;
  onBookingNoticeHoursChange: (hours: number) => void;
  onMaxBookingsPerDayChange: (count: number) => void;
  onAvailabilityScheduleChange: (days: DayOfWeek[]) => void;
  onUseSameTimeChange: (useSame: boolean) => void;
  onCommonTimeSlotsChange: (slots: TimeSlotUIData[]) => void;
  onPerDayTimeSlotsChange: (
    perDaySlots: Record<DayOfWeek, TimeSlotUIData[]>,
  ) => void;
}

const AvailabilityConfiguration: React.FC<AvailabilityConfigurationProps> = ({
  availabilitySchedule,
  useSameTimeForAllDays,
  commonTimeSlots,
  perDayTimeSlots,
  onAvailabilityScheduleChange,
  onUseSameTimeChange,
  onCommonTimeSlotsChange,
  onPerDayTimeSlotsChange,
}) => {
  const daysOfWeek: DayOfWeek[] = [
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

  const handleDayToggle = (day: DayOfWeek) => {
    const isCurrentlySelected = availabilitySchedule.includes(day);
    if (isCurrentlySelected) {
      onAvailabilityScheduleChange(
        availabilitySchedule.filter((d) => d !== day),
      );
    } else {
      onAvailabilityScheduleChange([...availabilitySchedule, day]);
    }
  };

  const handleCommonTimeSlotChange = (
    index: number,
    field: keyof TimeSlotUIData,
    value: string,
  ) => {
    const updatedSlots = commonTimeSlots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot,
    );
    onCommonTimeSlotsChange(updatedSlots);
  };

  () => {
    const newSlot: TimeSlotUIData = {
      id: `slot-${Date.now()}`,
      startHour: "09",
      startMinute: "00",
      startPeriod: "AM",
      endHour: "05",
      endMinute: "00",
      endPeriod: "PM",
    };
    onCommonTimeSlotsChange([...commonTimeSlots, newSlot]);
  };

  const removeCommonTimeSlot = (idToRemove: string) => {
    onCommonTimeSlotsChange(
      commonTimeSlots.filter((slot) => slot.id !== idToRemove),
    );
  };

  const handlePerDayTimeSlotChange = (
    day: DayOfWeek,
    index: number,
    field: keyof TimeSlotUIData,
    value: string,
  ) => {
    const daySlots = perDayTimeSlots[day] || [];
    const updatedDaySlots = daySlots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot,
    );
    onPerDayTimeSlotsChange({
      ...perDayTimeSlots,
      [day]: updatedDaySlots,
    });
  };

  const addPerDayTimeSlot = (day: DayOfWeek) => {
    const daySlots = perDayTimeSlots[day] || [];
    const newSlot: TimeSlotUIData = {
      id: `slot-${day}-${Date.now()}`,
      startHour: "09",
      startMinute: "00",
      startPeriod: "AM",
      endHour: "05",
      endMinute: "00",
      endPeriod: "PM",
    };
    onPerDayTimeSlotsChange({
      ...perDayTimeSlots,
      [day]: [...daySlots, newSlot],
    });
  };

  const removePerDayTimeSlot = (day: DayOfWeek, idToRemove: string) => {
    const daySlots = perDayTimeSlots[day] || [];
    onPerDayTimeSlotsChange({
      ...perDayTimeSlots,
      [day]: daySlots.filter((slot) => slot.id !== idToRemove),
    });
  };

  return (
    <div className="space-y-6">
      {/* Booking Settings */}
      {/* <div className="bg-blue-50 p-4 rounded-lg"> */}
      {/* <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
          <ClockIcon className="h-4 w-4 mr-2" />
          Booking Settings
        </h4> */}
      {/* Instant Booking Toggle */} {/* Booking Notice Hours */}{" "}
      {/* Max Bookings Per Day */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="instantBookingEnabled"
              checked={instantBookingEnabled}
              onChange={(e) => onInstantBookingChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="instantBookingEnabled" className="text-sm font-medium text-gray-700">
              Enable Instant Booking
            </label>
          </div>

     
          <div>
            <label htmlFor="bookingNoticeHours" className="block text-xs font-medium text-gray-600 mb-1">
              Booking Notice (hours)
            </label>
            <input
              type="number"
              id="bookingNoticeHours"
              value={bookingNoticeHours}
              onChange={(e) => onBookingNoticeHoursChange(Math.max(0, Math.min(720, parseInt(e.target.value) || 0)))}
              min="0"
              max="720"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="24"
            />
            <p className="text-xs text-gray-500 mt-1">0-720 hours (30 days max)</p>
          </div>


          <div>
            <label htmlFor="maxBookingsPerDay" className="block text-xs font-medium text-gray-600 mb-1">
              Max Bookings/Day
            </label>
            <input
              type="number"
              id="maxBookingsPerDay"
              value={maxBookingsPerDay}
              onChange={(e) => onMaxBookingsPerDayChange(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              min="1"
              max="50"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="5"
            />
            <p className="text-xs text-gray-500 mt-1">1-50 bookings</p>
          </div>
        </div> */}
      {/* </div> */}
      {/* Working Days Selection */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700">Working Days</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {daysOfWeek.map((day) => (
            <label
              key={day}
              className="flex cursor-pointer items-center space-x-2"
            >
              <input
                type="checkbox"
                checked={availabilitySchedule.includes(day)}
                onChange={() => handleDayToggle(day)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{day.slice(0, 3)}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Time Slots Configuration */}
      {availabilitySchedule.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">Time Slots</h4>

          {/* Same Time Toggle */}
          <div className="mb-4">
            <label className="flex cursor-pointer items-center space-x-3">
              <input
                type="checkbox"
                checked={useSameTimeForAllDays}
                onChange={(e) => onUseSameTimeChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Use same time slots for all selected days
              </span>
            </label>
          </div>

          {/* Common Time Slots */}
          {useSameTimeForAllDays && (
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="space-y-3">
                {commonTimeSlots.map((slot, index) => (
                  <div
                    key={slot.id}
                    className="flex flex-col space-y-2 rounded border bg-white p-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2"
                  >
                    {/* Start Time */}
                    <div className="flex flex-shrink-0 items-center space-x-1">
                      <select
                        value={slot.startHour}
                        onChange={(e) =>
                          handleCommonTimeSlotChange(
                            index,
                            "startHour",
                            e.target.value,
                          )
                        }
                        className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        {hourOptions.map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500">:</span>
                      <select
                        value={slot.startMinute}
                        onChange={(e) =>
                          handleCommonTimeSlotChange(
                            index,
                            "startMinute",
                            e.target.value,
                          )
                        }
                        className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        {minuteOptions.map((minute) => (
                          <option key={minute} value={minute}>
                            {minute}
                          </option>
                        ))}
                      </select>
                      <select
                        value={slot.startPeriod}
                        onChange={(e) =>
                          handleCommonTimeSlotChange(
                            index,
                            "startPeriod",
                            e.target.value,
                          )
                        }
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        {periodOptions.map((period) => (
                          <option key={period} value={period}>
                            {period}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-center text-gray-500 sm:text-left">
                      to
                    </span>

                    {/* End Time */}
                    <div className="flex flex-shrink-0 items-center space-x-1">
                      <select
                        value={slot.endHour}
                        onChange={(e) =>
                          handleCommonTimeSlotChange(
                            index,
                            "endHour",
                            e.target.value,
                          )
                        }
                        className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        {hourOptions.map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500">:</span>
                      <select
                        value={slot.endMinute}
                        onChange={(e) =>
                          handleCommonTimeSlotChange(
                            index,
                            "endMinute",
                            e.target.value,
                          )
                        }
                        className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        {minuteOptions.map((minute) => (
                          <option key={minute} value={minute}>
                            {minute}
                          </option>
                        ))}
                      </select>
                      <select
                        value={slot.endPeriod}
                        onChange={(e) =>
                          handleCommonTimeSlotChange(
                            index,
                            "endPeriod",
                            e.target.value,
                          )
                        }
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        {periodOptions.map((period) => (
                          <option key={period} value={period}>
                            {period}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remove Button */}
                    {commonTimeSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCommonTimeSlot(slot.id)}
                        className="self-center p-1 text-red-500 hover:text-red-700 sm:self-auto"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-Day Time Slots */}
          {!useSameTimeForAllDays && (
            <div className="space-y-4">
              {availabilitySchedule.map((day) => (
                <div key={day} className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-3 flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <h5 className="text-sm font-medium text-gray-700">{day}</h5>
                    <button
                      type="button"
                      onClick={() => addPerDayTimeSlot(day)}
                      className="flex items-center self-start text-sm text-blue-600 hover:text-blue-700 sm:self-auto"
                    >
                      <PlusIcon className="mr-1 h-4 w-4" />
                      Add Slot
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(perDayTimeSlots[day] || []).map((slot, index) => (
                      <div
                        key={slot.id}
                        className="flex flex-col space-y-2 rounded border bg-white p-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2"
                      >
                        {/* Start Time */}
                        <div className="flex flex-shrink-0 items-center space-x-1">
                          <select
                            value={slot.startHour}
                            onChange={(e) =>
                              handlePerDayTimeSlotChange(
                                day,
                                index,
                                "startHour",
                                e.target.value,
                              )
                            }
                            className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            {hourOptions.map((hour) => (
                              <option key={hour} value={hour}>
                                {hour}
                              </option>
                            ))}
                          </select>
                          <span className="text-gray-500">:</span>
                          <select
                            value={slot.startMinute}
                            onChange={(e) =>
                              handlePerDayTimeSlotChange(
                                day,
                                index,
                                "startMinute",
                                e.target.value,
                              )
                            }
                            className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            {minuteOptions.map((minute) => (
                              <option key={minute} value={minute}>
                                {minute}
                              </option>
                            ))}
                          </select>
                          <select
                            value={slot.startPeriod}
                            onChange={(e) =>
                              handlePerDayTimeSlotChange(
                                day,
                                index,
                                "startPeriod",
                                e.target.value,
                              )
                            }
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            {periodOptions.map((period) => (
                              <option key={period} value={period}>
                                {period}
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-center text-gray-500 sm:text-left">
                          to
                        </span>

                        {/* End Time */}
                        <div className="flex flex-shrink-0 items-center space-x-1">
                          <select
                            value={slot.endHour}
                            onChange={(e) =>
                              handlePerDayTimeSlotChange(
                                day,
                                index,
                                "endHour",
                                e.target.value,
                              )
                            }
                            className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            {hourOptions.map((hour) => (
                              <option key={hour} value={hour}>
                                {hour}
                              </option>
                            ))}
                          </select>
                          <span className="text-gray-500">:</span>
                          <select
                            value={slot.endMinute}
                            onChange={(e) =>
                              handlePerDayTimeSlotChange(
                                day,
                                index,
                                "endMinute",
                                e.target.value,
                              )
                            }
                            className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            {minuteOptions.map((minute) => (
                              <option key={minute} value={minute}>
                                {minute}
                              </option>
                            ))}
                          </select>
                          <select
                            value={slot.endPeriod}
                            onChange={(e) =>
                              handlePerDayTimeSlotChange(
                                day,
                                index,
                                "endPeriod",
                                e.target.value,
                              )
                            }
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            {periodOptions.map((period) => (
                              <option key={period} value={period}>
                                {period}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Remove Button */}
                        {(perDayTimeSlots[day] || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePerDayTimeSlot(day, slot.id)}
                            className="self-center p-1 text-red-500 hover:text-red-700 sm:self-auto"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AvailabilityConfiguration;
