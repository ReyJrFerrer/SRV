import React, { useEffect, useMemo, useState } from "react";
import {
  getImageDataUrl,
  extractMediaIdFromUrl,
} from "../../../services/mediaService";
import { httpsCallable } from "firebase/functions";
import { initializeFirebase } from "../../../services/firebaseApp";

interface ClientAttachmentsProps {
  attachments?: string[];
  notes?: string | null;
}

const isVideoUrl = (url: string) => {
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov") ||
    lower.includes("contentType=video") // fallback hint if query contains metadata
  );
};

const ClientAttachments: React.FC<ClientAttachmentsProps> = ({
  attachments,
  notes,
}) => {
  const items = useMemo(() => {
    const list: string[] = [];
    if (attachments && Array.isArray(attachments)) {
      for (const a of attachments) if (a) list.push(a);
    }
    // Fallback: parse [PROOF_ATTACHMENTS] block from notes
    if (!list.length && notes) {
      try {
        const startTag = "[PROOF_ATTACHMENTS]";
        const endTag = "[/PROOF_ATTACHMENTS]";
        const start = notes.indexOf(startTag);
        const end = notes.indexOf(endTag);
        if (start >= 0 && end > start) {
          const block = notes.substring(start + startTag.length, end);
          for (const line of block.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (trimmed) list.push(trimmed);
          }
        }
      } catch {}
    }
    return list;
  }, [attachments, notes]);

  const [resolved, setResolved] = useState<
    Record<number, { url: string; error?: string }>
  >({});

  const [lightbox, setLightbox] = useState<{
    open: boolean;
    index: number;
    url: string;
    isVideo: boolean;
  }>({ open: false, index: 0, url: "", isVideo: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox((s) => ({ ...s, open: false }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { functions } = initializeFirebase();
      const getMediaItemFn = httpsCallable<
        { mediaId: string },
        { success: boolean; data: any }
      >(functions, "getMediaItem");

      const entries = await Promise.all(
        items.map(async (src, idx) => {
          try {
            // Videos: show original URL
            if (isVideoUrl(src)) {
              return [idx, { url: src }] as const;
            }

            let candidateUrl = src;
            // Resolve bare IDs or legacy URLs
            const idFromUrl = extractMediaIdFromUrl(src);
            const looksLikeId = !/^https?:\/\//.test(src);
            const mediaId = looksLikeId ? src : idFromUrl;
            if (mediaId) {
              try {
                const result = await getMediaItemFn({ mediaId });
                if (result.data?.success && result.data?.data?.url) {
                  candidateUrl = result.data.data.url as string;
                }
              } catch {}
            }

            // Resolve to data URL (preload) to improve reliability like ServiceImageUpload
            const dataUrl = await getImageDataUrl(candidateUrl, {
              enableCache: true,
            });
            return [idx, { url: dataUrl }] as const;
          } catch (e: any) {
            // Fallback to original string
            return [
              idx,
              { url: src, error: e?.message || "Failed to resolve image" },
            ] as const;
          }
        }),
      );
      if (!cancelled) {
        const map: Record<number, { url: string; error?: string }> = {};
        for (const [k, v] of entries) map[k] = v;
        setResolved(map);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [items]);

  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Client Attachments
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((original, idx) => {
          const entry = resolved[idx];
          const loading = !entry;
          const url = entry?.url || original;
          const video = isVideoUrl(original);

          return (
            <div
              key={`${original}-${idx}`}
              className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
              onClick={() => {
                if (!loading) {
                  setLightbox({ open: true, index: idx, url, isVideo: video });
                }
              }}
            >
              {loading ? (
                <div className="flex h-40 w-full items-center justify-center text-xs text-gray-500">
                  Loading...
                </div>
              ) : video ? (
                <video
                  className="h-40 w-full object-cover"
                  src={url}
                  controls
                  preload="metadata"
                />
              ) : (
                <img
                  className="h-40 w-full object-cover"
                  src={url}
                  alt={`Attachment ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // if data URL failed, try original URL
                    if (url !== original)
                      (e.currentTarget as HTMLImageElement).src = original;
                  }}
                  loading="lazy"
                />
              )}
            </div>
          );
        })}
      </div>

      {lightbox.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLightbox((s) => ({ ...s, open: false }))}
          aria-modal
          role="dialog"
        >
          <div
            className="relative max-h-[85vh] w-full max-w-3xl rounded-xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 text-xs font-semibold text-white hover:bg-black/70"
              onClick={() => setLightbox((s) => ({ ...s, open: false }))}
              aria-label="Close"
            >
              Close
            </button>
            <div className="flex items-center justify-center">
              {lightbox.isVideo ? (
                <video
                  src={lightbox.url}
                  className="max-h-[75vh] w-full max-w-full object-contain"
                  controls
                  preload="metadata"
                />
              ) : (
                <img
                  src={lightbox.url}
                  className="max-h-[75vh] w-full max-w-full object-contain"
                  alt="Attachment preview"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientAttachments;
