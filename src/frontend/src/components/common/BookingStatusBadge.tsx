import React from "react";

const getNotificationBadgeConfig = (status: string) => {
  const st = status.toLowerCase();

  if (st === "requested") {
    return { color: "bg-amber-500 ring-amber-200", label: "NEW" };
  }
  if (st === "accepted" || st === "confirmed") {
    return { color: "bg-green-600 ring-green-200", label: "CONFIRMED" };
  }
  if (st === "inprogress" || st === "in_progress") {
    return { color: "bg-blue-500 ring-blue-200", label: "UPDATE" };
  }
  if (st === "completed") {
    return { color: "bg-indigo-600 ring-indigo-200", label: "SUCCESS" };
  }
  if (st === "cancelled") {
    return { color: "bg-red-500 ring-red-200", label: "ALERT" };
  }
  if (st === "declined") {
    return { color: "bg-gray-500 ring-gray-200", label: "ALERT" };
  }
  if (st === "disputed") {
    return { color: "bg-orange-500 ring-orange-200", label: "DISPUTE" };
  }

  return { color: "bg-blue-500 ring-white", label: "UPDATE" };
};

const getStatusBadgeClasses = (status: string): string => {
  switch (status.toUpperCase()) {
    case "REQUESTED":
    case "PENDING":
      return "text-amber-700 bg-amber-50 border border-amber-100";
    case "ACCEPTED":
    case "CONFIRMED":
      return "text-emerald-700 bg-emerald-50 border border-emerald-100";
    case "INPROGRESS":
    case "IN_PROGRESS":
      return "text-blue-700 bg-blue-50 border border-blue-100";
    case "COMPLETED":
      return "text-indigo-700 bg-indigo-50 border border-indigo-100";
    case "CANCELLED":
      return "text-rose-700 bg-rose-50 border border-rose-100";
    case "DECLINED":
      return "text-slate-700 bg-slate-50 border border-slate-100";
    case "DISPUTED":
      return "text-orange-700 bg-orange-50 border border-orange-100";
    default:
      return "text-slate-700 bg-slate-50 border border-slate-100";
  }
};

const getStatusTextClasses = (status: string): string => {
  switch (status.toUpperCase()) {
    case "REQUESTED":
    case "PENDING":
      return "text-yellow-600 font-semibold";
    case "ACCEPTED":
    case "CONFIRMED":
      return "text-green-600 font-semibold";
    case "INPROGRESS":
    case "IN_PROGRESS":
      return "text-blue-600 font-semibold";
    case "COMPLETED":
      return "text-indigo-600 font-semibold";
    case "CANCELLED":
      return "text-red-600 font-semibold";
    case "DECLINED":
      return "text-gray-500 font-semibold";
    case "DISPUTED":
      return "text-orange-600 font-semibold";
    default:
      return "text-gray-500 font-semibold";
  }
};

export const getNotificationBorderClasses = (status: string): string => {
  const st = status.toLowerCase();

  if (st === "cancelled" || st === "declined") {
    return "border-l-4 border-l-red-500 border-red-200 bg-red-50/40";
  }
  if (st === "completed") {
    return "border-l-4 border-l-indigo-500 border-indigo-200 bg-indigo-50/40";
  }
  if (st === "accepted" || st === "confirmed") {
    return "border-l-4 border-l-green-500 border-green-200 bg-green-50/40";
  }
  if (st === "requested") {
    return "border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/40";
  }
  if (st === "disputed") {
    return "border-l-4 border-l-orange-500 border-orange-200 bg-orange-50/40";
  }
  if (st === "inprogress" || st === "in_progress") {
    return "border-l-4 border-l-blue-500 border-blue-200 bg-blue-50/40";
  }

  return "border-l-4 border-l-blue-500 border-blue-200 bg-blue-50/40";
};

export const getNotificationBorderHoverClasses = (status: string): string => {
  const st = status.toLowerCase();

  if (st === "cancelled" || st === "declined") {
    return "hover:border-red-300";
  }
  if (st === "completed") {
    return "hover:border-indigo-300";
  }
  if (st === "accepted" || st === "confirmed") {
    return "hover:border-green-300";
  }
  if (st === "requested") {
    return "hover:border-amber-300";
  }
  if (st === "disputed") {
    return "hover:border-orange-300";
  }
  if (st === "inprogress" || st === "in_progress") {
    return "hover:border-blue-300";
  }

  return "hover:border-blue-300";
};

export const BookingNotificationBadge: React.FC<{
  status: string;
  size?: "sm" | "md";
}> = ({ status, size = "sm" }) => {
  const { color, label } = getNotificationBadgeConfig(status);
  const sizeClasses =
    size === "md"
      ? "px-2.5 py-1 text-[10px] tracking-widest"
      : "px-2 py-0.5 text-[9px] tracking-wider";

  return (
    <span
      className={`shrink-0 animate-pulse rounded-full ${color} ${sizeClasses} font-black uppercase text-white shadow-sm ring-1`}
    >
      {label}
    </span>
  );
};

export const BookingStatusPill: React.FC<{
  status: string;
  variant?: "filled" | "text";
  size?: "sm" | "md";
}> = ({ status, variant = "filled", size = "sm" }) => {
  const sizeClasses = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  if (variant === "text") {
    return (
      <span className={getStatusTextClasses(status)}>
        {status.replace("_", " ")}
      </span>
    );
  }

  return (
    <span
      className={`shrink-0 rounded-full ${sizeClasses} font-bold uppercase tracking-wide ${getStatusBadgeClasses(status)}`}
    >
      {status.replace("_", " ")}
    </span>
  );
};
