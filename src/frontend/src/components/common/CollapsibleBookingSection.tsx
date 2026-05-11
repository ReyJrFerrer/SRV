import React, { useState, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

type Variant = "default" | "muted" | "warning";

interface CollapsibleBookingSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  unreadCount?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: Variant;
  forceExpanded?: boolean;
}

const variantStyles: Record<Variant, { border: string; bg: string; header: string }> = {
  default: {
    border: "border-green-200",
    bg: "bg-green-50",
    header: "text-green-700",
  },
  muted: {
    border: "border-gray-200",
    bg: "bg-gray-50",
    header: "text-gray-500",
  },
  warning: {
    border: "border-red-200",
    bg: "bg-red-50",
    header: "text-red-600",
  },
};

const CollapsibleBookingSection: React.FC<CollapsibleBookingSectionProps> = ({
  title,
  icon,
  count,
  unreadCount = 0,
  children,
  defaultExpanded = false,
  variant = "default",
  forceExpanded,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (forceExpanded !== undefined) {
      setExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  if (count === 0) return null;

  const styles = variantStyles[variant];

  return (
    <section>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`mb-3 flex w-full items-center rounded-xl border ${styles.border} ${styles.bg} px-4 py-3 transition-colors hover:bg-gray-100`}
      >
        {icon}
        <h2 className={`text-sm font-bold tracking-wide ${styles.header}`}>
          {title}
        </h2>
        {unreadCount > 0 && (
          <span className="ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-sm ring-1 ring-white">
            {unreadCount}
          </span>
        )}
        <ChevronDownIcon
          className={`ml-auto h-5 w-5 text-gray-400 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:space-y-6">
          {children}
        </div>
      )}
    </section>
  );
};

export default CollapsibleBookingSection;
