import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";

export interface SelectedFile {
  file: File;
  previewUrl: string;
  id: string;
}

export interface ChatAttachmentTriggerHandle {
  open: () => void;
}

interface ChatAttachmentTriggerProps {
  onFilesPicked: (files: SelectedFile[]) => void;
  onError?: (error: string | null) => void;
  disabled?: boolean;
  maxFiles?: number;
  currentCount?: number;
}

const MAX_CHAT_FILES = 5;

export const ChatAttachmentTrigger = forwardRef<
  ChatAttachmentTriggerHandle,
  ChatAttachmentTriggerProps
>(function ChatAttachmentTrigger(
  {
    onFilesPicked,
    onError,
    disabled,
    maxFiles = MAX_CHAT_FILES,
    currentCount = 0,
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => inputRef.current?.click(),
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onError?.(null);
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;

    const invalid = picked.find((f) => !f.type.startsWith("image/"));
    if (invalid) {
      onError?.("Only images are supported right now.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const combined = currentCount + picked.length;
    if (combined > maxFiles) {
      onError?.(`You can attach up to ${maxFiles} images per message.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const next: SelectedFile[] = picked.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }));

    onFilesPicked(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      onChange={handleChange}
      className="hidden"
      disabled={disabled || currentCount >= maxFiles}
    />
  );
});

interface ChatAttachmentStripProps {
  selectedFiles: SelectedFile[];
  onRemove: (id: string) => void;
  onAddClick: () => void;
  disabled?: boolean;
  maxFiles?: number;
  error?: string | null;
}

export function ChatAttachmentStrip({
  selectedFiles,
  onRemove,
  onAddClick,
  disabled,
  maxFiles = MAX_CHAT_FILES,
  error,
}: ChatAttachmentStripProps) {
  if (selectedFiles.length === 0 && !error) return null;

  const atMax = selectedFiles.length >= maxFiles;

  return (
    <div className="px-1 pt-1.5 pb-1.5">
      {selectedFiles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-1.5 pt-1.5">
          {selectedFiles.map((sf) => (
            <div key={sf.id} className="group relative shrink-0">
              <img
                src={sf.previewUrl}
                alt={sf.file.name}
                className="h-16 w-16 rounded-xl border border-gray-200 object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={() => onRemove(sf.id)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900/80 text-white shadow-sm transition-colors hover:bg-red-600"
                aria-label={`Remove ${sf.file.name}`}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
          {!atMax && (
            <button
              type="button"
              onClick={onAddClick}
              disabled={disabled}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500 disabled:opacity-40"
              aria-label="Add another image"
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
      {error && <div className="mt-1 text-[11px] text-red-600">{error}</div>}
    </div>
  );
}
