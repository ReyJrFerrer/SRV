import React, { useRef, useState } from "react";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";

export interface SelectedFile {
  file: File;
  previewUrl: string;
  id: string;
}

interface ChatAttachmentPickerProps {
  selectedFiles: SelectedFile[];
  onFilesChange: (files: SelectedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

const MAX_CHAT_FILES = 5;

export function ChatAttachmentPicker({
  selectedFiles,
  onFilesChange,
  disabled,
  maxFiles = MAX_CHAT_FILES,
}: ChatAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;

    const invalid = picked.find((f) => !f.type.startsWith("image/"));
    if (invalid) {
      setError("Only images are supported right now.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const combined = selectedFiles.length + picked.length;
    if (combined > maxFiles) {
      setError(`You can attach up to ${maxFiles} images per message.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const next: SelectedFile[] = picked.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }));

    onFilesChange([...selectedFiles, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (id: string) => {
    const match = selectedFiles.find((f) => f.id === id);
    if (match) URL.revokeObjectURL(match.previewUrl);
    onFilesChange(selectedFiles.filter((f) => f.id !== id));
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePick}
        className="hidden"
        disabled={disabled || selectedFiles.length >= maxFiles}
      />
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-1">
          {selectedFiles.map((sf) => (
            <div key={sf.id} className="group relative">
              <img
                src={sf.previewUrl}
                alt={sf.file.name}
                className="h-16 w-16 rounded-lg border border-gray-200 object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={() => handleRemove(sf.id)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white shadow hover:bg-red-600"
                aria-label={`Remove ${sf.file.name}`}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="px-1 pb-1 text-[11px] text-red-600">{error}</div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || selectedFiles.length >= maxFiles}
        className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 disabled:opacity-40"
        aria-label="Attach image"
        title="Attach image"
      >
        <PaperClipIcon className="h-5 w-5" />
      </button>
    </>
  );
}
