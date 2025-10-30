import React from "react";

const BookingNotes: React.FC<{ notes?: string }> = ({ notes }) => {
  if (!notes) return null;
  return (
    <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
      <strong>Booking Notes:</strong>
      <div className="mt-2 whitespace-pre-wrap">{notes}</div>
    </div>
  );
};

export default BookingNotes;
