import React from "react";

export type StickyConfirmBarProps = {
  formError: string | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  highlight?: boolean;
};

const StickyConfirmBar: React.FC<StickyConfirmBarProps> = ({
  formError,
  isSubmitting,
  onConfirm,
}) => (
  <div className="mx-auto max-w-md">
    {formError && (
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-base text-red-700 shadow-sm">
        {formError}
      </div>
    )}
    <button
      onClick={onConfirm}
      className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-yellow-400 px-8 py-4 text-lg font-bold text-white shadow-lg transition-colors hover:from-yellow-400 hover:to-blue-600 disabled:bg-gray-300 disabled:text-gray-400"
    >
      {isSubmitting && (
        <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
      )}
      {isSubmitting ? "Submitting..." : "Confirm Booking"}
    </button>
  </div>
);

export default StickyConfirmBar;
