import React from "react";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export type NotesSectionProps = {
  notes: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  limit: number;
};

const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  onChange,
  limit,
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
      <ChatBubbleLeftRightIcon
        className="h-6 w-6 text-blue-600"
        aria-hidden="true"
      />
      <span>Notes for Provider</span>
    </h3>
    <textarea
      placeholder="e.g., Beware of the dog, please bring a ladder, etc."
      value={notes}
      onChange={onChange}
      rows={4}
      maxLength={limit}
      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-base text-gray-900 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    />
  </div>
);

export default NotesSection;
