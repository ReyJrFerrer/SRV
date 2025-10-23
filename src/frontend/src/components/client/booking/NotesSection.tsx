import React from "react";

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
  <div className="glass-card rounded-2xl border border-blue-100 bg-white/70 p-6 shadow-xl backdrop-blur-md">
    <h3 className="mb-4 flex items-center text-xl font-bold text-blue-900">
      <span className="mr-2 inline-block h-6 w-2 rounded-full bg-blue-400"></span>
      Notes for Provider{" "}
      <span className="text-base font-normal text-gray-400">(Optional)</span>
    </h3>
    <textarea
      placeholder="e.g., Beware of the dog, please bring a ladder, etc. (max 30 characters)"
      value={notes}
      onChange={onChange}
      rows={4}
      maxLength={limit}
      className="w-full resize-none rounded-xl border border-gray-200 bg-white/80 p-3 text-base shadow-sm focus:border-blue-500 focus:ring-blue-500"
    />
  </div>
);

export default NotesSection;
