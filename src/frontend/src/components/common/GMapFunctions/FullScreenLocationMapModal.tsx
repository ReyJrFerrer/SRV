import React, { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LocationMapPicker = React.lazy(
  () => import("./LocationMapPicker"),
);

// Lightweight type compatible with LocationMapPicker's expected value
export interface StructuredLocationLike {
  lat: number;
  lng: number;
  address?: string;
  rawName?: string;
  route?: string;
  barangay?: string;
  city?: string;
  province?: string;
  formatted_address?: string;
}

interface FullScreenLocationMapModalProps {
  open: boolean;
  onClose: () => void;
  value: StructuredLocationLike | null | undefined;
  onChange: (loc: StructuredLocationLike) => void;
  label?: React.ReactNode;
  highlight?: boolean;
  persistKey?: string;
}

const FullScreenLocationMapModal: React.FC<FullScreenLocationMapModalProps> = ({
  open,
  onClose,
  value,
  onChange,
  label = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="inline h-4 w-4 text-gray-700"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  ),
  highlight = false,
  persistKey,
}) => {
  const [height, setHeight] = useState<number>(600);

  useEffect(() => {
    const compute = () => {
      if (typeof window === "undefined") return;
      const isDesktop = window.innerWidth >= 1024; // Tailwind lg
      const h = isDesktop ? window.innerHeight : Math.min(window.innerHeight - 120, 1200);
      setHeight(Math.max(480, h - (isDesktop ? 0 : 0)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  useEffect(() => {
    if (!open) return;
    // lock body scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const normalizedValue = value
    ? { ...value, address: value.address ?? "" }
    : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-auto h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl lg:fixed lg:inset-0 lg:h-screen lg:w-screen lg:max-w-none lg:rounded-none lg:shadow-none">
        <button
          type="button"
          aria-label="Close full screen map"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full border border-gray-300 bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-300"
        >
          ×
        </button>
        <div className="h-full w-full p-4 lg:p-0">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Loading map…
              </div>
            }
          >
            <LocationMapPicker
              mapHeight={height}
              value={normalizedValue as any}
              onChange={onChange as any}
              persistKey={persistKey}
              highlight={highlight}
              label={label}
            />
          </Suspense>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FullScreenLocationMapModal;
