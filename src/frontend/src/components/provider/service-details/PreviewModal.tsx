import React from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface Props {
  previewUrl: string | null;
  previewType: "image" | "pdf" | null;
  onClose: () => void;
}

const PreviewModal: React.FC<Props> = ({ previewUrl, previewType, onClose }) => {
  return (
    <Dialog open={!!previewUrl} onClose={onClose} className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 flex flex-col items-center justify-center">
        <button className="absolute right-2 top-2 z-20 rounded-full bg-white/80 p-2 text-gray-700 hover:bg-white" onClick={onClose} aria-label="Close preview">
          <XMarkIcon className="h-6 w-6" />
        </button>
        <div className="flex max-h[90vh] max-w-[90vw] flex-col items-center rounded-lg bg-white p-4 shadow-2xl">
          {previewUrl && previewType === "image" && (
            <img src={previewUrl} alt="Preview" className="max-h-[70vh] max-w-[80vw] rounded-lg object-contain" />
          )}
          {previewUrl && previewType === "pdf" && (
            <iframe src={previewUrl} title="PDF Preview" className="h-[70vh] w-[80vw] rounded-lg border" />
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default PreviewModal;
