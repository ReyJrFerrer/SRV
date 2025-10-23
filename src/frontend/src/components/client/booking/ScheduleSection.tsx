import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type TimeSlot = {
  timeSlot: { startTime: string; endTime: string };
  isAvailable: boolean;
};

export type ScheduleSectionProps = {
  bookingOption: "sameday" | "scheduled" | null;
  isSameDayAvailable: boolean;
  onChangeBookingOption: (opt: "sameday" | "scheduled") => void;

  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;

  selectedTime: string;
  setSelectedTime: (time: string) => void;

  availableSlots: TimeSlot[];
  slotAvailability: Record<string, boolean>;
  checkingSlots: boolean;
  hasUserBookedTimeSlot: (timeSlot: string, dateToCheck: Date) => boolean;

  serviceWeeklySchedule?: Array<{
    day: string;
    availability: { isAvailable: boolean };
  }>;

  dayIndexToName: (idx: number) => string;
  highlight?: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
};

const to12Hour = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  bookingOption,
  isSameDayAvailable,
  onChangeBookingOption,
  selectedDate,
  onDateChange,
  selectedTime,
  setSelectedTime,
  availableSlots,
  slotAvailability,
  checkingSlots,
  hasUserBookedTimeSlot,
  serviceWeeklySchedule,
  dayIndexToName,
  highlight = false,
  innerRef,
}) => {
  return (
    <div
      ref={innerRef}
      className={`glass-card rounded-2xl border bg-white/70 p-6 shadow-xl backdrop-blur-md ${
        highlight
          ? "border-2 border-red-500 ring-2 ring-red-200"
          : "border-yellow-100"
      }`}
    >
      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-blue-900">
        <span className="mr-2 inline-block h-6 w-2 rounded-full bg-blue-400"></span>
        Booking Schedule <span className="text-red-500">*</span>
      </h3>

      <div className="mb-4 flex gap-3">
        <button
          className={`flex-1 rounded-xl border p-3 text-center font-semibold shadow-sm transition-colors ${
            !isSameDayAvailable
              ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400"
              : bookingOption === "sameday"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-yellow-200 hover:bg-yellow-100"
          }`}
          onClick={() => isSameDayAvailable && onChangeBookingOption("sameday")}
          disabled={!isSameDayAvailable}
          title={
            !isSameDayAvailable
              ? "Same-day booking not available for this service today"
              : ""
          }
        >
          <div className="text-base font-semibold">Same Day</div>
          {!isSameDayAvailable && (
            <div className="text-xs text-gray-400">Not Available Today</div>
          )}
        </button>
        <button
          className={`flex-1 rounded-xl border p-3 text-center font-semibold shadow-sm transition-colors ${
            bookingOption === "scheduled"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-200 bg-gray-50 text-gray-700 hover:border-yellow-200 hover:bg-yellow-100"
          }`}
          onClick={() => onChangeBookingOption("scheduled")}
        >
          <div className="text-base font-semibold">Scheduled</div>
        </button>
      </div>

      {bookingOption === "sameday" && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Select a time for today:
            </label>
            <div className="flex flex-wrap gap-2">
              {checkingSlots ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                  Checking availability...
                </div>
              ) : availableSlots.length > 0 ? (
                availableSlots
                  .filter((slot: any) => slot.isAvailable)
                  .map((slot: any, index: number) => {
                    const time = `${slot.timeSlot.startTime}-${slot.timeSlot.endTime}`;
                    const [start, end] = time.split("-");
                    const formatted = `${to12Hour(start)} - ${to12Hour(end)}`;
                    const isSlotAvailable = slotAvailability[time] !== false;

                    const today = new Date();
                    const todayDate = new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      today.getDate(),
                    );
                    const isUserBooked = hasUserBookedTimeSlot(time, todayDate);

                    const isTimeSlotPassed = (): boolean => {
                      const now = new Date();
                      const [endHour, endMinute] = slot.timeSlot.endTime
                        .split(":")
                        .map(Number);
                      const slotEndTime = new Date();
                      slotEndTime.setHours(endHour, endMinute, 0, 0);
                      return now >= slotEndTime;
                    };

                    const hasTimePassed = isTimeSlotPassed();
                    const unavailableReason = hasTimePassed
                      ? "Time has passed"
                      : isUserBooked
                        ? "You already have a booking for this time slot"
                        : "This time slot is already booked";

                    return (
                      <button
                        key={index}
                        onClick={() =>
                          isSlotAvailable &&
                          !isUserBooked &&
                          setSelectedTime(time)
                        }
                        disabled={!isSlotAvailable || isUserBooked}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                          !isSlotAvailable || isUserBooked
                            ? isUserBooked
                              ? "cursor-not-allowed border-orange-300 bg-orange-100 text-orange-600"
                              : "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400"
                            : selectedTime === time
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                        title={
                          !isSlotAvailable || isUserBooked
                            ? unavailableReason
                            : ""
                        }
                      >
                        {formatted}
                        {isUserBooked && (
                          <span className="ml-1 text-xs">(You Booked)</span>
                        )}
                        {!isUserBooked && !isSlotAvailable && (
                          <span className="ml-1 text-xs">
                            {hasTimePassed ? "(Passed)" : "(Booked)"}
                          </span>
                        )}
                      </button>
                    );
                  })
              ) : (
                <p className="text-sm text-gray-500">
                  No available slots for today.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {bookingOption === "scheduled" && (
        <div className="space-y-4">
          <div className="booking-calendar-wrapper">
            <DatePicker
              selected={selectedDate}
              onChange={onDateChange}
              minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
              filterDate={(date: Date) => {
                const dayName = dayIndexToName(date.getDay());
                return serviceWeeklySchedule
                  ? serviceWeeklySchedule.some(
                      (s) => s.day === dayName && s.availability.isAvailable,
                    )
                  : false;
              }}
              inline
              renderCustomHeader={({
                date,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) => (
                <div className="flex items-center justify-between rounded-t-lg bg-gray-100 px-2 py-2">
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    className="rounded-full p-1 hover:bg-gray-200 disabled:opacity-30"
                    type="button"
                    aria-label="Previous Month"
                  >
                    <svg
                      className="h-5 w-5 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span className="text-base font-semibold text-gray-800">
                    {date.toLocaleString("default", { month: "long" })}{" "}
                    {date.getFullYear()}
                  </span>
                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    className="rounded-full p-1 hover:bg-gray-200 disabled:opacity-30"
                    type="button"
                    aria-label="Next Month"
                  >
                    <svg
                      className="h-5 w-5 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}
              dayClassName={(date: Date) => {
                const isSelected =
                  selectedDate &&
                  date.toDateString() === selectedDate.toDateString();
                const dayName = dayIndexToName(date.getDay());
                const isAvailable = serviceWeeklySchedule
                  ? serviceWeeklySchedule.some(
                      (s) => s.day === dayName && s.availability.isAvailable,
                    )
                  : false;
                return [
                  "transition-colors duration-150",
                  isSelected ? "!bg-blue-600 !text-white !font-bold" : "",
                  isAvailable
                    ? "hover:bg-blue-100 cursor-pointer"
                    : "opacity-40 cursor-not-allowed",
                ].join(" ");
              }}
              calendarClassName="rounded-lg shadow-lg border border-gray-200 bg-white"
              wrapperClassName="w-full"
            />
          </div>
          {selectedDate && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select a time:
              </label>
              <div className="flex flex-wrap gap-2">
                {checkingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    Checking availability...
                  </div>
                ) : availableSlots.length > 0 ? (
                  availableSlots
                    .filter((slot: any) => slot.isAvailable)
                    .map((slot: any, index: number) => {
                      const time = `${slot.timeSlot.startTime}-${slot.timeSlot.endTime}`;
                      const [start, end] = time.split("-");
                      const formatted = `${to12Hour(start)} - ${to12Hour(end)}`;
                      const isSlotAvailable = slotAvailability[time] !== false;

                      const isUserBooked = hasUserBookedTimeSlot(
                        time,
                        selectedDate!,
                      );

                      const unavailableReason = isUserBooked
                        ? "You already have a booking for this time slot"
                        : "This time slot is already booked";

                      return (
                        <button
                          key={index}
                          onClick={() =>
                            isSlotAvailable &&
                            !isUserBooked &&
                            setSelectedTime(time)
                          }
                          disabled={!isSlotAvailable || isUserBooked}
                          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                            !isSlotAvailable || isUserBooked
                              ? isUserBooked
                                ? "cursor-not-allowed border-orange-300 bg-orange-100 text-orange-600"
                                : "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400"
                              : selectedTime === time
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          title={
                            !isSlotAvailable || isUserBooked
                              ? unavailableReason
                              : ""
                          }
                        >
                          {formatted}
                          {isUserBooked && (
                            <span className="ml-1 text-xs">(You Booked)</span>
                          )}
                          {!isUserBooked && !isSlotAvailable && (
                            <span className="ml-1 text-xs">(Booked)</span>
                          )}
                        </button>
                      );
                    })
                ) : (
                  <p className="text-sm text-gray-500">
                    No available slots for this day.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleSection;
