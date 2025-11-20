import React from "react";

export interface CalendarItem {
  id: string;
  date: Date; // full Date object (used for day + time)
  title: string; // service or package name
  subtitle?: string; // client/provider name
  status?: string; // booking status raw string
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
  const diffToStart = weekStartsOn === 1 ? (startDay === 0 ? 6 : startDay - 1) : startDay;
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - diffToStart);

  const endDay = end.getDay();
  const diffToEnd = weekStartsOn === 1 ? (endDay === 0 ? 0 : 7 - endDay) : 6 - endDay;
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
  const [detailDayItems, setDetailDayItems] = React.useState<CalendarItem[] | null>(null);

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

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const statusClasses = (status?: string) => {
    if (!status) return "border-gray-200 bg-gray-100 text-gray-700";
    const s = status.toLowerCase();
    if (s.includes("pending") || s.includes("requested")) {
      return "border-orange-300 bg-orange-50 text-orange-700";
    }
    if (s.includes("confirm") || s.includes("accept")) {
      return "border-green-300 bg-green-50 text-green-700";
    }
    if (s.includes("progress")) {
      return "border-blue-300 bg-blue-50 text-blue-700";
    }
    if (s.includes("complete")) {
      return "border-gray-300 bg-gray-100 text-gray-600";
    }
    if (s.includes("cancel") || s.includes("declin")) {
      return "border-gray-300 bg-gray-100 text-gray-500";
    }
    return "border-gray-200 bg-gray-100 text-gray-700";
  };

  const openDetailForDay = (items: CalendarItem[]) => {
    setDetailDayItems(items.sort((a, b) => a.date.getTime() - b.date.getTime()));
  };

  const closeDetail = () => setDetailDayItems(null);

  return (
    <div className={`relative w-full ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() =>
            setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
          }
          aria-label="Previous month"
        >
          ‹ Prev
        </button>
        <div className="text-sm font-semibold text-blue-900">{monthLabel}</div>
        <button
          type="button"
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() =>
            setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
          }
          aria-label="Next month"
        >
          Next ›
        </button>
      </div>

      <div className="hidden grid-cols-7 gap-1 rounded-lg bg-white p-2 shadow sm:grid">
        {dayNames(weekStartsOn).map((d) => (
          <div key={d} className="px-2 py-1 text-center text-xs font-semibold text-gray-500">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = fmtKey(d);
          const dayItems = grouped[key] || [];
          const faded = !isSameMonth(d, currentMonth);
          return (
            <div
              key={key}
              className={`min-h-28 rounded-md border border-gray-100 p-1.5 ${
                faded ? "bg-gray-50 opacity-60" : "bg-white"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-700">{d.getDate()}</div>
                {dayItems.length > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {dayItems.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, 2).map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onItemClick && onItemClick(it.id)}
                    className={`w-full truncate rounded-md border px-2 py-1 text-left text-[10px] hover:brightness-95 ${statusClasses(it.status)}`}
                    title={`${formatTime(it.date)} • ${it.title}${it.subtitle ? ` — ${it.subtitle}` : ""}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold">{formatTime(it.date)}</span>
                      <span className="truncate text-[10px] font-medium">{it.title}</span>
                    </div>
                    {it.subtitle && (
                      <div className="truncate text-[9px] opacity-80">{it.subtitle}</div>
                    )}
                  </button>
                ))}
                {dayItems.length > 2 && (
                  <button
                    type="button"
                    onClick={() => openDetailForDay(dayItems)}
                    className="w-full rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200"
                  >
                    +{dayItems.length - 2} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: compact grid */}
      <div className="grid grid-cols-7 gap-0.5 rounded-lg border border-gray-200 sm:hidden">
        {dayNames(weekStartsOn).map((d) => (
          <div key={d} className="bg-gray-50 py-1 text-center text-[10px] font-medium text-gray-500">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = fmtKey(d);
          const dayItems = grouped[key] || [];
          const faded = !isSameMonth(d, currentMonth);
          return (
            <div key={key} className={`min-h-12 p-0.5 ${faded ? "bg-gray-50 opacity-60" : "bg-white"}`}>
              <div className="flex items-center justify-between">
                <div className="pl-0.5 text-[10px] font-semibold text-gray-700">{d.getDate()}</div>
                {dayItems.length > 0 && (
                  <span className="mr-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
                    {dayItems.length}
                  </span>
                )}
              </div>
              {dayItems.slice(0, 1).map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onItemClick && onItemClick(it.id)}
                  className={`mt-0.5 w-full truncate rounded border px-1.5 py-0.5 text-left text-[9px] hover:brightness-95 ${statusClasses(it.status)}`}
                  title={`${formatTime(it.date)} • ${it.title}${it.subtitle ? ` — ${it.subtitle}` : ""}`}
                >
                  <span className="font-semibold">{formatTime(it.date)}</span> {it.title}
                </button>
              ))}
              {dayItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => openDetailForDay(dayItems)}
                  className="mt-0.5 w-full rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-600 hover:bg-gray-200"
                >
                  +{dayItems.length - 1} more
                </button>
              )}
            </div>
          );
        })}
      </div>

      {detailDayItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Bookings ({detailDayItems.length})
              </h3>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {detailDayItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    if (onItemClick) onItemClick(it.id);
                    closeDetail();
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-[12px] hover:brightness-95 ${statusClasses(it.status)}`}
                  title={`${formatTime(it.date)} • ${it.title}${it.subtitle ? ` — ${it.subtitle}` : ""}`}
                >
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="whitespace-nowrap font-semibold">{formatTime(it.date)}</span>
                    <span className="truncate font-medium">{it.title}</span>
                  </div>
                  {it.subtitle && (
                    <div className="truncate text-[11px] opacity-80">{it.subtitle}</div>
                  )}
                  {it.status && (
                    <div className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">
                      {it.status}
                    </div>
                  )}
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
