import React from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface ImageAttachmentModalProps {
  src: string;
  onClose: () => void;
}

export const ImageAttachmentModal: React.FC<ImageAttachmentModalProps> = ({
  src,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    onClick={onClose}
  >
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <img
        src={src}
        alt="Ticket Attachment Full Size"
        className="max-h-[80vh] max-w-[90vw] rounded-2xl border-4 border-white bg-white shadow-2xl"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/default-provider.svg";
        }}
      />
      <button
        className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
        onClick={onClose}
        aria-label="Close"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>
    </div>
  </div>
);
