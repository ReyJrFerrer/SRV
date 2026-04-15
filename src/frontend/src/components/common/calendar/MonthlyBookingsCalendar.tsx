import React from "react";

export interface CalendarItem {
  id: string;
  date: Date;
  title: string;
  subtitle?: string;
  status?: string;
}

interface MonthlyBookingsCalendarProps {
  items: CalendarItem[];
  initialMonth?: Date;
  className?: string;
  onItemClick?: (id: string) => void;
  weekStartsOn?: 0 | 1; // 0: Sunday, 1: Monday
}

const fmtKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

function getGridRange(baseMonth: Date, weekStartsOn: 0 | 1) {
  const start = startOfMonth(baseMonth);
  const end = endOfMonth(baseMonth);

  const startDay = start.getDay(); // 0 Sun ... 6 Sat
  const diffToStart =
    weekStartsOn === 1 ? (startDay === 0 ? 6 : startDay - 1) : startDay;
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - diffToStart);

  const endDay = end.getDay();
  const diffToEnd =
    weekStartsOn === 1 ? (endDay === 0 ? 0 : 7 - endDay) : 6 - endDay;
  const gridEnd = new Date(end);
  gridEnd.setDate(end.getDate() + diffToEnd);

  return { gridStart, gridEnd };
}

const dayNames = (weekStartsOn: 0 | 1) =>
  weekStartsOn === 1
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MonthlyBookingsCalendar: React.FC<MonthlyBookingsCalendarProps> = ({
  items,
  initialMonth,
  className = "",
  onItemClick,
  weekStartsOn = 0,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    initialMonth ? new Date(initialMonth) : new Date(),
  );
  const [detailDayItems, setDetailDayItems] = React.useState<
    CalendarItem[] | null
  >(null);

  // Group items by day key (YYYY-MM-DD)
  const grouped = React.useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    items.forEach((it) => {
      const key = fmtKey(it.date);
      if (!map[key]) map[key] = [];
      map[key].push(it);
    });
    return map;
  }, [items]);

  const monthLabel = currentMonth.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const { gridStart, gridEnd } = React.useMemo(
    () => getGridRange(currentMonth, weekStartsOn),
    [currentMonth, weekStartsOn],
  );

  const days: Date[] = React.useMemo(() => {
    const arr: Date[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
      arr.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  const isSameMonth = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const statusClasses = (status?: string) => {
    if (!status)
      return "border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100";
    const s = status.toLowerCase();
    if (s.includes("pending") || s.includes("requested")) {
      return "border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100";
    }
    if (s.includes("confirm") || s.includes("accept")) {
      return "border-green-200 bg-green-50 text-green-800 hover:bg-green-100";
    }
    if (s.includes("progress")) {
      return "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100";
    }
    if (s.includes("complete")) {
      return "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200";
    }
    if (s.includes("cancel") || s.includes("declin")) {
      return "border-red-100 bg-red-50 text-red-600 hover:bg-red-100";
    }
    return "border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100";
  };

  const openDetailForDay = (items: CalendarItem[]) => {
    setDetailDayItems(
      items.sort((a, b) => a.date.getTime() - b.date.getTime()),
    );
  };

  const closeDetail = () => setDetailDayItems(null);

  return (
    <div
      className={`relative w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-gray-800">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            onClick={() =>
              setCurrentMonth(
                (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
              )
            }
            aria-label="Previous month"
          >
            Prev
          </button>
          <button
            type="button"
            className="flex h-9 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </button>
          <button
            type="button"
            className="flex h-9 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            onClick={() =>
              setCurrentMonth(
                (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
              )
            }
            aria-label="Next month"
          >
            Next
          </button>
        </div>
      </div>

      <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 sm:grid">
        {dayNames(weekStartsOn).map((d) => (
          <div
            key={d}
            className="bg-gray-50 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500"
          >
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = fmtKey(d);
          const dayItems = grouped[key] || [];
          const inMonth = isSameMonth(d, currentMonth);
          const today = isToday(d);

          return (
            <div
              key={key}
              className={`min-h-[120px] p-2 transition-colors duration-200 ${
                !inMonth ? "bg-gray-50/50" : "bg-white"
              } hover:bg-gray-50/80`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    today
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : inMonth
                        ? "text-gray-700"
                        : "text-gray-400"
                  }`}
                >
                  {d.getDate()}
                </span>
                {dayItems.length > 0 && (
                  <span className="flex h-5 items-center justify-center rounded-full bg-yellow-100 px-2 text-xs font-bold text-yellow-700">
                    {dayItems.length}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {dayItems.slice(0, 3).map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onItemClick && onItemClick(it.id)}
                    className={`group w-full truncate rounded-xl border px-2.5 py-1.5 text-left transition-all ${statusClasses(
                      it.status,
                    )}`}
                    title={`${formatTime(it.date)} • ${it.title}${
                      it.subtitle ? ` — ${it.subtitle}` : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold opacity-80">
                        {formatTime(it.date)}
                      </span>
                      <span className="truncate text-xs font-semibold text-gray-900 group-hover:text-current">
                        {it.title}
                      </span>
                    </div>
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <button
                    type="button"
                    onClick={() => openDetailForDay(dayItems)}
                    className="w-full rounded-xl bg-gray-50 px-2.5 py-1.5 text-center text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    +{dayItems.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: compact grid */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 sm:hidden">
        {dayNames(weekStartsOn).map((d) => (
          <div
            key={d}
            className="bg-gray-50 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-gray-500"
          >
            {d.charAt(0)}
          </div>
        ))}
        {days.map((d) => {
          const key = fmtKey(d);
          const dayItems = grouped[key] || [];
          const inMonth = isSameMonth(d, currentMonth);
          const today = isToday(d);

          return (
            <div
              key={key}
              className={`min-h-[60px] p-1 ${
                !inMonth ? "bg-gray-50/50" : "bg-white"
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    today
                      ? "bg-blue-600 text-white shadow-sm"
                      : inMonth
                        ? "text-gray-700"
                        : "text-gray-400"
                  }`}
                >
                  {d.getDate()}
                </span>
                {dayItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openDetailForDay(dayItems)}
                    className="flex h-2 w-2 rounded-full bg-yellow-400 ring-2 ring-white"
                    aria-label={`${dayItems.length} items`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detailDayItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md scale-100 transform rounded-3xl bg-white p-6 shadow-2xl transition-all">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {detailDayItems[0]?.date.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <p className="text-sm font-medium text-gray-500">
                  {detailDayItems.length} booking
                  {detailDayItems.length !== 1 && "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="custom-scrollbar max-h-[60vh] space-y-3 overflow-y-auto pr-2">
              {detailDayItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    if (onItemClick) onItemClick(it.id);
                    closeDetail();
                  }}
                  className={`group w-full rounded-2xl border p-4 text-left transition-all hover:shadow-md ${statusClasses(
                    it.status,
                  )}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-md bg-white/60 px-2 py-1 text-xs font-bold text-gray-700 shadow-sm backdrop-blur-sm">
                          {formatTime(it.date)}
                        </span>
                        <h4 className="truncate text-sm font-bold text-gray-900">
                          {it.title}
                        </h4>
                      </div>
                      {it.subtitle && (
                        <p className="mt-1 truncate text-xs font-medium text-gray-600">
                          {it.subtitle}
                        </p>
                      )}
                    </div>
                    {it.status && (
                      <span className="rounded-lg bg-white/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600 shadow-sm backdrop-blur-sm">
                        {it.status}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyBookingsCalendar;
