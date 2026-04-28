import React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
  onDiscard: () => void;
  // customizable texts
  title?: string;
  message?: string;
  restoreLabel?: string;
  discardLabel?: string;
  closeLabel?: string;
}

const BookingDrafts: React.FC<Props> = ({
  isOpen,
  onClose,
  onRestore,
  onDiscard,
  title = "Restore draft?",
  message = "We found a saved draft. Would you like to restore your inputs now?",
  restoreLabel = "Restore draft",
  discardLabel = "Discard",
  closeLabel = "Not now",
}) => {
  if (!isOpen) return null;

  const handleRestore = () => {
    try {
      onRestore();
      toast.success("Draft restored");
    } catch (e) {
      toast.error("Failed to restore draft");
    }
  };

  const handleDiscard = () => {
    try {
      onDiscard();
      toast.success("Draft discarded");
    } catch (e) {
      toast.error("Failed to discard draft");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-bold">{title}</h2>
        <p className="mb-4 text-sm text-gray-600">{message}</p>
        <div className="flex justify-center gap-2">
          <button
            onClick={onClose}
            className="w-full rounded-md border px-2 py-2 text-xs text-gray-700 hover:bg-gray-50 lg:px-4 lg:py-2 lg:text-sm"
          >
            {closeLabel}
          </button>
          <button
            onClick={handleDiscard}
            className="w-full rounded-md border px-2 py-2 text-xs text-red-600 hover:bg-red-50 lg:px-4 lg:py-2 lg:text-sm"
          >
            {discardLabel}
          </button>
          <button
            onClick={handleRestore}
            className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-xs font-black text-white shadow-sm transition-all duration-300 hover:bg-blue-700 active:scale-95 lg:px-5 lg:py-3.5 lg:text-sm"
          >
            {restoreLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BookingDrafts;
