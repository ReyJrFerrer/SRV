import React, { useRef } from "react";
import { PaperClipIcon, PhotoIcon } from "@heroicons/react/24/outline";

type ProblemMediaSectionProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  required?: boolean;
  highlight?: boolean;
  maxFiles?: number;
};

const ACCEPT_TYPES = "image/*";

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
      className={`rounded-2xl border ${highlight ? "border-red-400 ring-2 ring-red-200" : "border-gray-200"} bg-white p-5 shadow-sm`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span className="h-4 w-1 rounded bg-blue-600" aria-hidden="true" />
          <PhotoIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <span>Attach Proof</span>
          {required && (
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </h2>
        <span className="text-xs text-gray-500">
          Up to {maxFiles} attachments
        </span>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Add clear photos showing the issue. This helps the provider prepare
        tools and parts.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:w-auto"
        >
          <PaperClipIcon className="h-4 w-4" aria-hidden="true" />
          Add Attachments
        </button>
        <span className="text-xs text-gray-500">
          Accepted: images (JPG/PNG/HEIC)
        </span>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
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
