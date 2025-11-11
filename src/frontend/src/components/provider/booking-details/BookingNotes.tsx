interface Props {
  notes?: string | null;
}

export default function BookingNotes({ notes }: Props) {
  if (!notes) return null;

  return (
    <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900 shadow-sm">
      <h4 className="mb-1 font-semibold">Booking Notes</h4>
      <div className="whitespace-pre-wrap break-words">{notes}</div>
    </div>
  );
}
