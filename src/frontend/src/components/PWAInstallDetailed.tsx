import { useState } from "react";
import { usePWA } from "../hooks/usePWA";

interface PWAInstallDetailedProps {
  className?: string;
  onInstall?: (result: "accepted" | "dismissed" | "not-available") => void;
}

export const PWAInstallDetailed: React.FC<PWAInstallDetailedProps> = ({
  className = "",
  onInstall,
}) => {
  const { pwaState, promptInstall } = usePWA();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      onInstall?.(result);

      if (result === "accepted") {
        //console.log("PWA installation accepted");
      } else if (result === "dismissed") {
        //console.log("PWA installation dismissed");
      } else {
        //console.log("PWA installation not available");
      }
    } finally {
      setInstalling(false);
    }
  };

  if (pwaState.isPWA) {
    return (
      <div
        className={`rounded-lg border border-green-200 bg-green-50 p-4 ${className}`}
      >
        <h3 className="mb-2 font-semibold text-green-900">
          App Installed Successfully
        </h3>
        <p className="text-sm text-green-700">
          ✓ SRV is installed on your device and can be accessed from your home
          screen.
        </p>
        <div className="mt-3 space-y-1 text-xs text-green-600">
          <p>• Access SRV directly from your device's home screen</p>
          <p>• Enjoy faster loading times and offline capabilities</p>
          <p>• Receive push notifications even when the browser is closed</p>
        </div>
      </div>
    );
  }

  if (!pwaState.isInstallable) {
    return (
      <div
        className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 ${className}`}
      >
        <h3 className="mb-2 font-semibold text-yellow-900">
          App Installation Unavailable
        </h3>
        <p className="text-sm text-yellow-700">
          Your browser doesn't support app installation or you're already using
          the installed version.
        </p>
        <div className="mt-3 space-y-1 text-xs text-yellow-600">
          <p>• Try accessing SRV from your device's browser</p>
          <p>
            • Make sure you're using a supported browser (Chrome, Firefox,
            Safari)
          </p>
          <p>• Check if SRV is already installed on your home screen</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Installation Prompt */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold text-blue-900">Install SRV App</h3>
        <p className="text-sm text-blue-700">
          Install SRV on your device for a better experience with faster access,
          push notifications, and offline capabilities.
        </p>
        <div className="mt-3 space-y-1 text-xs text-blue-600">
          <p>• Native app-like experience</p>
          <p>• Works offline for basic functionality</p>
          <p>• Push notifications for booking updates</p>
          <p>• Quick access from your home screen</p>
        </div>
      </div>

      {/* Install Button */}
      <button
        onClick={handleInstall}
        disabled={installing}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {installing ? "Installing..." : "Install SRV App"}
      </button>

      {/* Additional Info */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          What happens after installation?
        </h4>
        <div className="space-y-1 text-xs text-gray-600">
          <p>1. SRV will be added to your device's home screen</p>
          <p>2. You can launch it like any other app</p>
          <p>3. Push notifications will be available</p>
          <p>4. Basic features work even without internet</p>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallDetailed;
