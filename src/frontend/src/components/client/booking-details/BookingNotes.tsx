import React from "react";
import { DocumentTextIcon } from "@heroicons/react/24/solid";

const BookingNotes: React.FC<{ notes?: string }> = ({ notes }) => {
  if (!notes) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <DocumentTextIcon className="h-5 w-5 text-yellow-500" />
        <h3 className="text-base font-bold text-gray-900">Booking Notes</h3>
      </div>
      <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 text-sm text-yellow-900">
        <div className="whitespace-pre-wrap">{notes}</div>
      </div>
    </div>
  );
};

export default BookingNotes;
