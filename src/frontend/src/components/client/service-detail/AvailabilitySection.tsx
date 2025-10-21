import React from "react";

export type Availability = {
  isAvailableNow?: boolean;
  availableDays?: string[];
  availableTimeStart?: string;
  availableTimeEnd?: string;
  availableTimeRanges?: string[];
  timeSlotsByDay?: Record<string, string[]>;
};

interface AvailabilitySectionProps {
  availability?: Availability;
  isActive?: boolean;
}

const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  availability,
  isActive,
}) => {
  const slotsByDay = availability?.timeSlotsByDay || {};
  const days = Object.keys(slotsByDay);
  const hasDays = days.length > 0;
  const maxSlots = days.reduce((max, day) => {
    const slots = Array.isArray(slotsByDay[day]) ? slotsByDay[day] : [];
    return Math.max(max, slots.length);
  }, 0);

  const [openDay, setOpenDay] = React.useState<string | null>(null);

  const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={"h-7 w-7 text-blue-400 " + (props.className || "")}
    >
      <rect
        x="3"
        y="7"
        width="18"
        height="13"
        rx="3"
        strokeWidth="2"
        stroke="currentColor"
      />
      <path d="M16 3v4M8 3v4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="mt-8 rounded-3xl bg-white p-6 shadow-2xl backdrop-blur-md">
      <div className="mb-4 flex items-center gap-2">
        <CalendarIcon />
        <h3 className="text-lg font-semibold text-gray-800">Availability</h3>
        {isActive && (
          <span className="ml-2 flex animate-pulse items-center gap-1 rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
            Available Now
          </span>
        )}
      </div>
      {hasDays ? (
        <div>
          <div className="block lg:hidden">
            <ul className="divide-y divide-blue-100">
              {days.map((day) => {
                let slots = slotsByDay[day];
                if (typeof slots === "string") slots = [slots];
                if (!Array.isArray(slots)) slots = [];
                const isOpen = openDay === day;
                return (
                  <li key={day} className="py-1">
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-left text-base font-semibold text-blue-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400`}
                      onClick={() => setOpenDay(isOpen ? null : day)}
                      aria-expanded={isOpen}
                      aria-controls={`availability-panel-${day}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-400"></span>
                        {day}
                      </span>
                      <svg
                        className={`ml-2 h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {isOpen && (
                      <div
                        id={`availability-panel-${day}`}
                        className="mb-4 mt-2 flex flex-wrap items-center gap-2 px-3"
                      >
                        {slots.length > 0 ? (
                          slots.map((slot, idx) => (
                            <span
                              key={slot + idx}
                              className="inline-block min-w-[120px] rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-center text-sm font-semibold text-yellow-800 shadow-md"
                            >
                              {slot}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">Not specified</span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    {days.map((day) => (
                      <th
                        key={day}
                        className={`rounded-t-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-base font-bold text-blue-700 shadow-sm`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-400"></span>
                          {day}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(maxSlots > 0 ? maxSlots : 1)].map((_, rowIdx) => (
                    <tr key={rowIdx}>
                      {days.map((day) => {
                        let slots = slotsByDay[day];
                        if (typeof slots === "string") slots = [slots];
                        if (!Array.isArray(slots)) slots = [];
                        const slot = slots[rowIdx];
                        return (
                          <td
                            key={day + rowIdx}
                            className="px-4 py-3 text-center align-top"
                          >
                            {slot ? (
                              <span
                                className={` inline-block min-w-[120px] rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-base font-semibold text-yellow-800 shadow-md`}
                              >
                                {slot}
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                {rowIdx === 0 ? "Not specified" : ""}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-400">No availability specified</div>
      )}
    </div>
  );
};

export default AvailabilitySection;
