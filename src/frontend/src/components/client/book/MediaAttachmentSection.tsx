import React, { useRef } from "react";
import { PaperClipIcon, PhotoIcon } from "@heroicons/react/24/outline";

type ProblemMediaSectionProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  required?: boolean;
  highlight?: boolean;
  maxFiles?: number;
};

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ACCEPT_TYPES = ACCEPTED_MIME_TYPES.join(",");

const ProblemMediaSection: React.FC<ProblemMediaSectionProps> = ({
  files,
  onFilesChange,
  required = false,
  highlight = false,
  maxFiles = 5,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (list.length === 0) return;
    const current = files || [];
    const remaining = Math.max(0, maxFiles - current.length);
    const next = [...current, ...list.slice(0, remaining)];
    onFilesChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    onFilesChange(next);
  };

  return (
    <section
      className={`scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${
        highlight ? "border-2 border-red-500 ring-2 ring-red-200" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <PhotoIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
          <span>
            Attach Proof {required && <span className="text-red-500">*</span>}
          </span>
        </h3>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Add clear photos showing the issue. This helps the provider prepare
        tools and parts. Up to {maxFiles} attachments.
      </p>
      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_TYPES}
          multiple
          onChange={handleSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="gapx-5 flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-3.5 text-sm font-black text-gray-600 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        >
          <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
          Click to add attachments (Images Only)
        </button>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((f, idx) => {
            const url = URL.createObjectURL(f);
            return (
              <li
                key={`${f.name}-${idx}`}
                className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
              >
                <img
                  src={url}
                  alt={f.name}
                  className="h-32 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1 text-[10px] text-white">
                  <span className="truncate" title={f.name}>
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="rounded bg-red-500 px-2 py-0.5 text-[10px] hover:bg-red-600"
                    aria-label="Remove attachment"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ProblemMediaSection;
