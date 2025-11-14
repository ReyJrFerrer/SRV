export const SERVICE_STATUS = {
  BACKEND: {
    AVAILABLE: "Available",
    UNAVAILABLE: "Unavailable",
    SUSPENDED: "Suspended",
  },
  FRONTEND: {
    ACTIVE: "active",
    CANCELLED: "cancelled",
  },
} as const;

export const SUSPENSION_DURATION = {
  SEVEN_DAYS: "7",
  THIRTY_DAYS: "30",
  CUSTOM: "custom",
  INDEFINITE: "indefinite",
} as const;

export const DEFAULT_SUSPENSION_DAYS = 7;

