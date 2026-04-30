// Shared Tailwind class constants for booking action buttons (client + provider)
export const containerDefault =
  "mb-1 flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm justify-end";
export const containerCompact = "flex flex-wrap gap-2 items-center justify-end";

export const baseButtonDefault =
  "flex min-w-[150px] items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors";

export const baseButtonCompact =
  "flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium text-white";

// Color tokens - solid styles (for backward compatibility)
export const color = {
  chat: "bg-slate-600 hover:bg-slate-700 ",
  cancel: "bg-red-500 hover:bg-red-600",
  bookAgain: "bg-green-500 hover:bg-green-600",
  accept: "bg-blue-600 hover:bg-blue-600",
  decline: "bg-red-500 hover:bg-red-600",
  start: "bg-indigo-500 hover:bg-indigo-600",
  complete: "bg-green-500 hover:bg-green-600",
  review: "bg-yellow-500 hover:bg-yellow-600 ",
  report: "bg-red-600 hover:bg-red-700",
  neutral: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
};

// Outline styles - clean design for booking cards
export const outlineColor = {
  chat: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  cancel: "border border-red-400 text-red-600 hover:bg-red-50",
  bookAgain: "border border-green-500 text-green-600 hover:bg-green-50",
  accept: "border border-blue-600 text-blue-600 hover:bg-blue-50",
  decline: "border border-red-400 text-red-600 hover:bg-red-50",
  start: "border border-indigo-500 text-indigo-600 hover:bg-indigo-50",
  complete: "border border-green-500 text-green-600 hover:bg-green-50",
  review: "border border-yellow-500 text-yellow-600 hover:bg-yellow-50",
  report: "border border-red-500 text-red-600 hover:bg-red-50",
  neutral: "border border-gray-300 text-gray-700 hover:bg-gray-50",
};

export default {};
