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
  const [showModal, setShowModal] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      onInstall?.(result);
      setShowModal(false);
    } finally {
      setInstalling(false);
    }
  };

  // Don't show if already installed or not installable
  if (pwaState.isPWA || !pwaState.isInstallable) {
    return null;
  }

  return (
    <>
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
          onClick={() => setShowModal(true)}
          disabled={installing}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {installing ? "Installing..." : "Install"}
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 mt-10 flex items-center justify-center bg-black/70"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <img
                src="/images/srv characters (SVG)/tech guy.svg"
                alt="SRV Install"
                className="h-20 w-20 rounded-full border-4 border-white bg-blue-100 shadow-lg"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="mt-14">
              <h2 className="mb-4 text-center text-xl font-bold text-gray-900">
                Install SRV App
              </h2>
              <p className="mb-6 text-center text-sm text-gray-700">
                Installing the SRV progressive web app provides a faster,
                app-like experience and enables push notifications.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {installing ? "Installing..." : "Install"}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstall;
