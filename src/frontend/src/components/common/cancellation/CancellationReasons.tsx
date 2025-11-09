interface Props {
  bookingId?: string | null;
  // optional server-provided cancellation reason (if/when backend exists)
  cancellationReason?: string | null;
  // cancellationNotes?: string | null;
  // the role of who cancelled the booking: "Client" or "Provider"
  cancelledBy?: string | null;
}

export default function CancellationReasons({
  cancellationReason,
  cancelledBy,
}: Props) {
  const displayedReason = cancellationReason;
  // const displayedNotes = cancellationNotes;

  const shouldShow = !!(cancelledBy || displayedReason);
  if (!shouldShow) return null;

  // Determine the display text based on who cancelled
  const cancellerText =
    cancelledBy === "Client"
      ? "Client cancelled this booking"
      : cancelledBy === "Provider"
        ? "Provider cancelled this booking"
        : "This booking was cancelled";

  return (
    <section className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-red-800">
            {cancellerText}
          </h3>
          <div className="mt-1 text-sm text-red-700">
            <div className="whitespace-pre-wrap">{displayedReason}</div>

            {/* {displayedNotes && (
              <div className="mt-2 text-xs text-red-700">
                Notes: {displayedNotes}
              </div>
            )} */}
          </div>
        </div>
      </div>
    </section>
  );
}
