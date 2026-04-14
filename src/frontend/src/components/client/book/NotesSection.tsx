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
  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-900 md:text-xl">
      <span className="mr-2 inline-block h-6 w-2 rounded-full bg-blue-400"></span>
      <ChatBubbleLeftRightIcon
        className="h-5 w-5 text-blue-600"
        aria-hidden="true"
      />
      <span>Notes for Provider</span>
    </h3>
    <textarea
      placeholder="e.g., Beware of the dog, please bring a ladder, etc. (max 30 characters)"
      value={notes}
      onChange={onChange}
      rows={4}
      maxLength={limit}
      className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-base shadow-sm focus:border-blue-500 focus:ring-blue-500"
    />
  </div>
);

export default NotesSection;
