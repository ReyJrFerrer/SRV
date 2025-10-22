import { TimeSlot } from "../../../hooks/serviceManagement";

export const formatTime = (time: string) => {
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.padStart(2, "0")} ${ampm}`;
};

export const addHoursToTime = (time: string, hoursToAdd: number): string => {
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10) || 0;

  hour = hour + hoursToAdd;
  if (hour >= 24) {
    hour = hour % 24;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const timeStringToDate = (timeStr: string): Date => {
  const [hourStr, minuteStr] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(hourStr, 10), parseInt(minuteStr, 10), 0, 0);
  return date;
};

export const validateTimeSlots = (slots: TimeSlot[]): string[] => {
  const errors: string[] = [];
  if (slots.length === 0) return errors;
  const sortedSlots = [...slots].sort((a, b) => {
    const aStart = timeStringToDate(a.startTime);
    const bStart = timeStringToDate(b.startTime);
    return aStart.getTime() - bStart.getTime();
  });

  sortedSlots.forEach((slot, index) => {
    const startTime = timeStringToDate(slot.startTime);
    const endTime = timeStringToDate(slot.endTime);

    if (startTime.getTime() === endTime.getTime()) {
      errors.push("Start and end times cannot be the same");
    }
    if (startTime.getTime() > endTime.getTime()) {
      errors.push("Start time cannot be after end time");
    }
    if (index > 0) {
      const prevSlot = sortedSlots[index - 1];
      const prevEndTime = timeStringToDate(prevSlot.endTime);
      const timeDiff = startTime.getTime() - prevEndTime.getTime();
      const oneHourInMs = 60 * 60 * 1000;
      if (timeDiff < oneHourInMs) {
        errors.push(
          `Time slots must have at least 1 hour gap. Previous slot ends at ${formatTime(prevSlot.endTime)}, current slot starts at ${formatTime(slot.startTime)}`,
        );
      }
      if (startTime.getTime() < prevEndTime.getTime()) {
        errors.push("Time slots cannot overlap");
      }
    }
  });

  return [...new Set(errors)];
};
