import React from "react";
import { createPortal } from "react-dom";
import { useLocationStore } from "../../../store/locationStore";
import { useEffect, useState } from "react";

interface Props {
  visible: boolean;
  onEnable: () => void;
  onSkip: () => void;
  onClose?: () => void;
}

const LocationPermissionPromptModal: React.FC<Props> = ({
  visible,
  onEnable,
  onSkip,
  onClose,
}) => {
  // If the caller marked the modal visible but the browser permission is
  // already known (allowed/denied/unsupported), don't render the prompt.
  // This prevents showing the prompt when the user has blocked location.
  const { locationStatus } = useLocationStore();
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied" | null
  >(null);

  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== "undefined" && (navigator as any).permissions) {
      try {
        (navigator as any).permissions
          .query({ name: "geolocation" })
          .then((p: any) => {
            if (!mounted) return;
            if (p && p.state) setPermissionState(p.state as any);
            // Also listen for changes so the modal reacts if the user updates
            // site permissions while the page is open.
            if (p && typeof p.onchange === "function") {
              p.onchange = () => {
                if (!mounted) return;
                setPermissionState(p.state as any);
              };
            }
          })
          .catch(() => {
            /* ignore permission API errors */
          });
      } catch {
        /* ignore */
      }
    }
    return () => {
      mounted = false;
    };
  }, []);

  if (!visible) return null;
  // If the store already knows the permission, only show when unknown
  if (locationStatus !== "not_set") return null;
  // If the Permissions API reports anything other than 'prompt', don't show
  if (permissionState && permissionState !== "prompt") return null;

  const content = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Close */}
        <button
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-gray-700 hover:bg-gray-200"
          onClick={onClose ?? onSkip}
        >
          ×
        </button>

        {/* Character / Branding (optional image kept consistent with other modal) */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <img
            src="/images/srv characters (SVG)/tech guy.svg"
            alt="SRV Character"
            className="h-20 w-20 rounded-full border-4 border-white bg-blue-100 shadow-lg"
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className="mt-12 text-center">
          <h2 className="mb-2 text-xl font-bold text-blue-800">
            Enable your location
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Please set location access to "Always" in your browser so we can
            show services near you and improve your experience.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              onClick={onEnable}
            >
              Enable location
            </button>
            <button
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              onClick={onSkip}
            >
              Not now
            </button>
          </div>
          <div className="mt-3 text-center text-xs text-gray-500">
            You can change this later in your browser settings.
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
};

export default LocationPermissionPromptModal;
