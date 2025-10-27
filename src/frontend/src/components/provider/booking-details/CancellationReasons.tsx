import { useEffect, useState } from "react";

interface Props {
  bookingId?: string | null;
  // optional server-provided cancellation reason (if/when backend exists)
  cancellationReason?: string | null;
  cancellationNotes?: string | null;
  // whether the booking was cancelled by the client
  cancelledByClient?: boolean;
}

const STORAGE_KEY_PREFIX = "cancellation_reasons_v1:";

// no default reasons required for provider-side display; client UI (if any)
// may still use a list and save into localStorage under the same key.

export default function CancellationReasons({
  bookingId,
  cancellationReason,
  cancellationNotes,
  cancelledByClient,
}: Props) {
  // Prefer server-provided cancellation reason when available. If not
  // available, try to read a locally stored entry (this can simulate a
  // client-provided reason if you store it in localStorage for tests).
  const key = bookingId ? STORAGE_KEY_PREFIX + bookingId : null;
  const [localEntry, setLocalEntry] = useState<{ reason?: string; notes?: string; ts?: number } | null>(null);

  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setLocalEntry(parsed || null);
      }
    } catch {
      setLocalEntry(null);
    }
  }, [key]);

  const displayedReason = cancellationReason || localEntry?.reason || null;
  const displayedNotes = cancellationNotes || localEntry?.notes || null;

  // Only render when booking was cancelled by client OR we have a reason to show
  const shouldShow = !!(cancelledByClient || displayedReason);

  if (!shouldShow) return null;

  return (
    <section className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-red-800">Client cancelled this booking</h3>
          <div className="mt-1 text-sm text-red-700">
            {displayedReason ? (
              <div className="whitespace-pre-wrap">{displayedReason}</div>
            ) : (
              <div>No reason provided by client.</div>
            )}
            {displayedNotes && (
              <div className="mt-2 text-xs text-red-700">Notes: {displayedNotes}</div>
            )}
            {localEntry?.ts && (
              <div className="mt-2 text-xs text-red-600">Recorded {new Date(localEntry.ts).toLocaleString()}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
