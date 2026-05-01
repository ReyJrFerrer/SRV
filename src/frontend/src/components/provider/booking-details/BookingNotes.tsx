interface Props {
  notes?: string | null;
}

export default function BookingNotes({ notes }: Props) {
  if (!notes) return null;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="p-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-700">Notes</h4>
        <p className="whitespace-pre-wrap break-words text-sm text-gray-600">
          {notes}
        </p>
      </div>
    </div>
  );
}
