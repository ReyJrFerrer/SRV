import { useEffect, useState } from "react";
import {
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";

export interface ChatAttachmentItem {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  mediaId?: string | null;
}

interface ChatAttachmentPreviewProps {
  attachments?: ChatAttachmentItem[];
  caption?: string;
  isMine?: boolean;
}

export function ChatAttachmentPreview({
  attachments,
  caption,
  isMine,
}: ChatAttachmentPreviewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex]);

  if (!attachments || attachments.length === 0) {
    if (!caption) return null;
    return <p className="whitespace-pre-wrap break-words text-sm">{caption}</p>;
  }

  const images = attachments.filter((a) => a.fileType.startsWith("image/"));
  const videos = attachments.filter((a) => a.fileType.startsWith("video/"));
  const others = attachments.filter(
    (a) => !a.fileType.startsWith("image/") && !a.fileType.startsWith("video/"),
  );

  const mediaCount = images.length + videos.length;
  const gridClass =
    mediaCount === 1
      ? "grid grid-cols-1 gap-1"
      : mediaCount === 2
        ? "grid grid-cols-2 gap-1"
        : "grid grid-cols-2 gap-1";

  return (
    <div className="space-y-1">
      {images.length > 0 && (
        <div className={gridClass}>
          {images.map((att, idx) => {
            const globalIdx = attachments.indexOf(att);
            return (
              <button
                key={`${att.fileUrl}-${idx}`}
                type="button"
                onClick={() => setLightboxIndex(globalIdx)}
                className="group relative block overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
              >
                <img
                  src={att.thumbnailUrl || att.fileUrl}
                  alt={att.fileName}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className={`w-full cursor-zoom-in object-cover transition-opacity group-hover:opacity-90 ${
                    mediaCount === 1 ? "max-h-64 rounded-lg" : "aspect-square"
                  }`}
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.src !== att.fileUrl) {
                      el.src = att.fileUrl;
                    }
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {videos.length > 0 && (
        <div className={gridClass}>
          {videos.map((att, idx) => {
            const globalIdx = attachments.indexOf(att);
            return (
              <button
                key={`${att.fileUrl}-${idx}`}
                type="button"
                onClick={() => setLightboxIndex(globalIdx)}
                className="group relative block overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
              >
                <video
                  src={att.fileUrl}
                  preload="metadata"
                  muted
                  playsInline
                  className={`w-full cursor-pointer object-cover transition-opacity group-hover:opacity-90 ${
                    mediaCount === 1 ? "max-h-64 rounded-lg" : "aspect-square"
                  }`}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                  <PlayIcon className="h-8 w-8 text-white/90" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-1">
          {others.map((att, idx) => (
            <a
              key={`${att.fileUrl}-${idx}`}
              href={att.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                isMine
                  ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                  : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100"
              }`}
            >
              <DocumentIcon className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-0 flex-1 truncate">{att.fileName}</span>
              <span className={isMine ? "text-white/70" : "text-gray-500"}>
                {formatSize(att.fileSize)}
              </span>
            </a>
          ))}
        </div>
      )}

      {caption && (
        <p className="whitespace-pre-wrap break-words text-sm">{caption}</p>
      )}

      {lightboxIndex !== null && attachments[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          {attachments[lightboxIndex].fileType.startsWith("video/") ? (
            <video
              src={attachments[lightboxIndex].fileUrl}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={attachments[lightboxIndex].fileUrl}
              alt={attachments[lightboxIndex].fileName}
              referrerPolicy="no-referrer"
              className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function attachmentPreviewText(
  attachments?: ChatAttachmentItem[],
): React.ReactNode {
  if (!attachments || attachments.length === 0) return "";
  const first = attachments[0];
  if (first.fileType.startsWith("image/")) {
    return (
      <span className="inline-flex items-center gap-1">
        <PhotoIcon className="h-3.5 w-3.5" />
        Photo
      </span>
    );
  }
  if (first.fileType.startsWith("video/")) {
    return (
      <span className="inline-flex items-center gap-1">
        <VideoCameraIcon className="h-3.5 w-3.5" />
        Video
      </span>
    );
  }
  if (first.fileType === "application/pdf") {
    return (
      <span className="inline-flex items-center gap-1">
        <DocumentIcon className="h-3.5 w-3.5" />
        PDF
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <DocumentIcon className="h-3.5 w-3.5" />
      {first.fileName || "Attachment"}
    </span>
  );
}
