import React, { useEffect, useRef, useCallback } from "react";
import { useWaitlist } from "./useWaitlist";

export interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

/** Accessible waitlist modal with focus trap, ESC close, and success animation */
export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  open,
  onClose,
}) => {
  const { email, setEmail, message, isLoading, isSuccess, submit, reset } =
    useWaitlist();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFocusable = useRef<HTMLButtonElement | null>(null);
  const lastFocusable = useRef<HTMLButtonElement | null>(null);

  // Close helper
  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    if (!node) return;

    // Collect focusable elements
    const focusable = node.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length) {
      firstFocusable.current = focusable[0] as HTMLButtonElement;
      lastFocusable.current = focusable[
        focusable.length - 1
      ] as HTMLButtonElement;
      firstFocusable.current.focus();
    }

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (!firstFocusable.current || !lastFocusable.current) return;
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable.current) {
          e.preventDefault();
          lastFocusable.current.focus();
        }
      } else {
        if (document.activeElement === lastFocusable.current) {
          e.preventDefault();
          firstFocusable.current.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal waitlist-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal-content waitlist-modal-content" ref={dialogRef}>
        <button
          className="close"
          aria-label="Close waitlist modal"
          onClick={handleClose}
          ref={firstFocusable}
        >
          &times;
        </button>
        <div className="waitlist-illustration" aria-hidden="true">
          <img
            src="/images/srv characters (SVG)/plumber.svg"
            alt=""
            loading="lazy"
          />
        </div>
        <h2 id="waitlist-modal-title" style={{ fontWeight: "bold" }}>
          Join Our Waitlist
        </h2>
        <p>Be the first to know when SRV launches!</p>

        {isSuccess ? (
          <div className="waitlist-success">
            <div className="success-check">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3>You're on the list!</h3>
            <p>
              Salamat! We'll keep you updated and send early access details
              soon.
            </p>
            <div style={{ marginTop: "1.2rem" }}>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={handleClose}
                ref={lastFocusable}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            aria-describedby={message ? "waitlist-feedback" : undefined}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              aria-label="Email address"
              autoComplete="email"
            />
            <p style={{ fontSize: "0.85em", color: "#666" }}>
              By joining, you agree to receive a confirmation email and future
              updates from SRV.
            </p>
            <div className="modal-buttons">
              <button
                type="submit"
                className="modal-btn-primary"
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        animation: "loading-bounce 1.4s infinite ease-in-out",
                        animationDelay: "-0.32s",
                      }}
                    />
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        animation: "loading-bounce 1.4s infinite ease-in-out",
                        animationDelay: "-0.16s",
                      }}
                    />
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        animation: "loading-bounce 1.4s infinite ease-in-out",
                      }}
                    />
                  </div>
                ) : (
                  "Join Waitlist"
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open("https://forms.gle/tKyDX4BnHzoGV9kT7", "_blank")
                }
                className="modal-btn-secondary"
              >
                Preregister as Provider
              </button>
            </div>
            {message && (
              <div id="waitlist-feedback" className="waitlist-feedback-wrapper">
                <div
                  className={`waitlist-feedback ${isSuccess ? "success" : "error"}`}
                >
                  {message}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="sr-only"
              aria-label="Close waitlist"
              ref={lastFocusable}
              tabIndex={0}
            />
          </form>
        )}
      </div>
    </div>
  );
};

export default WaitlistModal;
