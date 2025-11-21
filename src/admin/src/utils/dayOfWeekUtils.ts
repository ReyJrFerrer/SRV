const DAY_TO_NUMBER: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

export const dayOfWeekToNumber = (day: string): number => {
  return DAY_TO_NUMBER[day] ?? 6;
};
