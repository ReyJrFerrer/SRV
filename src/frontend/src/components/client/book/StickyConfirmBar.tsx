import React from "react";

export type StickyConfirmBarProps = {
  formError: string | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  isValid?: boolean;
  highlight?: boolean;
};

const StickyConfirmBar: React.FC<StickyConfirmBarProps> = ({
  formError,
  isSubmitting,
  onConfirm,
  isValid = true,
}) => (
  <div className="mx-auto max-w-md">
    {formError && (
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-base text-red-700 shadow-sm">
        {formError}
      </div>
    )}
    <button
      onClick={onConfirm}
      className="hover: disabled:-none flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3.5 text-lg font-bold tracking-wide text-white shadow-sm transition-all duration-200 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
      disabled={isSubmitting || !isValid}
    >
      {isSubmitting ? (
        <>
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
          Submitting...
        </>
      ) : !isValid ? (
        "Fill Required Fields"
      ) : (
        "Confirm Booking"
      )}
    </button>
  </div>
);

export default StickyConfirmBar;
