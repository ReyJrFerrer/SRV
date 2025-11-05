// Shared Tailwind class constants for booking action buttons (client + provider)
export const containerDefault =
  "mb-6 flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm justify-end";
export const containerCompact = "flex flex-wrap gap-2 items-center justify-end";

export const baseButtonDefault =
  "flex min-w-[150px] items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white";

export const baseButtonCompact =
  "flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium text-white";

// Color tokens - use the same across client + provider
export const color = {
  chat: "bg-slate-600 hover:bg-slate-700",
  cancel: "bg-red-500 hover:bg-red-600",
  bookAgain: "bg-green-500 hover:bg-green-600",
  accept: "bg-green-500 hover:bg-green-600",
  decline: "bg-red-500 hover:bg-red-600",
  start: "bg-indigo-500 hover:bg-indigo-600",
  complete: "bg-green-500 hover:bg-green-600",
  review: "bg-yellow-500 hover:bg-yellow-600 ",
  report: "bg-red-600 hover:bg-red-700",
  neutral: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
};

export default {};
