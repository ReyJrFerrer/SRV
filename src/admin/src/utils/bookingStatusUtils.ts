export const normalizeBookingStatus = (status: any): string => {
  if (!status) return "unknown";
  if (typeof status === "string") return status.toLowerCase();
  if (typeof status === "object" && status !== null) {
    const keys = Object.keys(status);
    if (keys.length > 0) return keys[0].toLowerCase();
  }
  return "unknown";
};

export const getBookingStatusColor = (status: any): string => {
  const normalized = normalizeBookingStatus(status);

  const colorMap: Record<string, string> = {
    requested: "bg-yellow-100 text-yellow-800",
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    in_progress: "bg-blue-100 text-blue-800",
    inprogress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return colorMap[normalized] || "bg-gray-100 text-gray-800";
};

export const matchesStatusFilter = (
  status: any,
  filter: string,
): boolean => {
  if (filter === "all") return true;

  const normalized = normalizeBookingStatus(status);
  const filterValue = filter.toLowerCase();

  if (filterValue === "pending") {
    return normalized === "pending" || normalized === "requested";
  }
  if (filterValue === "inprogress") {
    return normalized === "inprogress" || normalized === "in_progress";
  }

  return normalized === filterValue;
};

