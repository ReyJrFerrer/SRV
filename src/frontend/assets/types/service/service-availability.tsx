export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";
export type TimeSlot = string; // format: "HH:MM-HH:MM"

export interface ServiceAvailability {
  schedule: DayOfWeek[];
  timeSlots: TimeSlot[];
  isAvailableNow: boolean;
}
