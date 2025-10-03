import React from "react";
import { FingerPrintIcon } from "@heroicons/react/24/solid";
export interface JoinWaitlistButtonProps {
  onClick: () => void;
  loading?: boolean;
  className?: string;
  variant?: "desktop" | "mobile";
  autoFocus?: boolean;
  fullWidth?: boolean; // especially for mobile drawer
  afterClick?: () => void; // optional hook for wrappers needing to close menus
}

/**
 * Reusable button used to trigger the Waitlist modal across the site headers & sections.
 * Keeps loading spinner & label logic consistent.
 */
export const JoinWaitlistButton: React.FC<JoinWaitlistButtonProps> = ({
  onClick,
  loading = false,
  className = "",
  variant = "desktop",
  autoFocus = false,
  fullWidth = false,
  afterClick,
}) => {
  const base = variant === "mobile" ? "mobile-join-btn" : "btn-primary";
  const widthClass = fullWidth ? "w-full" : "";

  const handleClick = () => {
    onClick();
    afterClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={[base, widthClass, className].filter(Boolean).join(" ")}
      autoFocus={autoFocus}
      aria-label={loading ? "Processing" : "Join the Waitlist"}
    >
      {loading ? (
        variant === "desktop" ? (
          <>
            <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-slate-800" />
            <span>Connecting...</span>
          </>
        ) : (
          "Loading..."
        )
      ) : (
          <>
            <FingerPrintIcon className="mr-3 h-6 w-6" />
            <span>Login / Sign Up</span>
          </>
      )}
    </button>
  );
};
