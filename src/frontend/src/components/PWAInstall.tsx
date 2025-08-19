import { useState } from "react";
import { usePWA } from "../hooks/usePWA";

interface PWAInstallProps {
  className?: string;
  onInstall?: (result: "accepted" | "dismissed" | "not-available") => void;
}

export const PWAInstall: React.FC<PWAInstallProps> = ({
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
        console.log("PWA installation accepted");
      } else if (result === "dismissed") {
        console.log("PWA installation dismissed");
      } else {
        console.log("PWA installation not available");
      }
    } finally {
      setInstalling(false);
    }
  };

  // Don't show if already installed or not installable
  if (pwaState.isPWA || !pwaState.isInstallable) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 ${className}`}
    >
      <div className="flex-1">
        <h3 className="font-semibold text-blue-900">Install SRV App</h3>
        <p className="text-sm text-blue-700">
          Install SRV on your device for faster access and push notifications.
        </p>
      </div>
      <button
        onClick={handleInstall}
        disabled={installing}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {installing ? "Installing..." : "Install"}
      </button>
    </div>
  );
};

export default PWAInstall;
