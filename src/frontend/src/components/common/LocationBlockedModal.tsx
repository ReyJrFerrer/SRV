import React from "react";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const LocationBlockedModal: React.FC<Props> = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* Close button */}
        <button
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-gray-700 hover:bg-gray-200"
          onClick={onClose}
        >
          ×
        </button>
        {/* Computer guy character at the top */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <img
            src="/images/srv characters (SVG)/tech guy.svg"
            alt="SRV Computer Guy Character"
            className="h-24 w-24 rounded-full border-4 border-white bg-blue-100 shadow-lg"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="mt-14">
          <h2 className="mb-4 text-center text-xl font-bold text-red-600">
            Please enable location to use SRV
          </h2>
          <p className="mb-4 text-center text-gray-700">
            This app requires location access to show services near you.
            Features are unusable if location is not enabled.
            <br />
            <span className="mt-2 block font-medium text-blue-700">
              After changing your browser settings, please reload the
              website.
            </span>
          </p>
          <div className="mb-2 text-left text-sm text-gray-700">
            <b>How to enable location access:</b>
            <div className="mt-2">
              {/* The expanded help content is intentionally identical to the original modal */}
              <details className="mb-2">
                <summary className="cursor-pointer font-semibold text-blue-700">Brave</summary>
                <div className="mt-1 pl-4">
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Desktop</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Go to the specific website.</li>
                      <li>Click the lock icon 🔒 in the address bar.</li>
                      <li>Click Site settings.</li>
                      <li>Find Location in the permissions list and change its setting to <b>Allow</b>.</li>
                    </ul>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Mobile (Android)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Tap the three-dots menu (⋮) at the bottom-right.</li>
                      <li>Tap Settings ⚙️.</li>
                      <li>Tap Site settings. (If you don't see it, first tap Privacy and security).</li>
                      <li>Tap Location and ensure the main toggle is on to allow sites to ask for permission.</li>
                    </ul>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Mobile (iOS - iPhone/iPad)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>The primary control for location is in the main iOS Settings.</li>
                      <li>Open the Settings app on your iPhone/iPad.</li>
                      <li>Scroll down and tap on Brave.</li>
                      <li>Tap on Location.</li>
                      <li>Select <b>While Using the App</b> or <b>Ask Next Time Or When I Share</b>.</li>
                    </ul>
                  </details>
                </div>
              </details>
              <details className="mb-2">
                <summary className="cursor-pointer font-semibold text-blue-700">Chrome</summary>
                <div className="mt-1 pl-4">
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Desktop</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Go to the specific website.</li>
                      <li>Click the lock icon 🔒 in the address bar.</li>
                      <li>Click Site settings.</li>
                      <li>Find Location in the permissions list and change its setting to <b>Allow</b>.</li>
                    </ul>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Mobile (Android)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Tap the three-dots menu (⋮) at the top-right.</li>
                      <li>Tap Settings ⚙️.</li>
                      <li>Tap Site settings.</li>
                      <li>Tap Location and ensure the main toggle is on. You can also manage permissions for individual sites here.</li>
                    </ul>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Mobile (iOS - iPhone/iPad)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>The primary control for location is in the main iOS Settings.</li>
                      <li>Open the Settings app on your iPhone/iPad.</li>
                      <li>Scroll down and tap on Chrome.</li>
                      <li>Tap on Location.</li>
                      <li>Select <b>While Using the App</b> or <b>Ask Next Time Or When I Share</b>.</li>
                    </ul>
                  </details>
                </div>
              </details>
              <details className="mb-2">
                <summary className="cursor-pointer font-semibold text-blue-700">Firefox</summary>
                <div className="mt-1 pl-4">
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Desktop</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Go to the specific website.</li>
                      <li>Click the lock icon 🔒 in the address bar. A small panel will open.</li>
                      <li>Find the Location permission in the panel and use the dropdown or toggle to <b>Allow</b> access.</li>
                    </ul>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Mobile (Android)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Tap the three-dots menu (⋮) at the bottom-right.</li>
                      <li>Tap Settings ⚙️.</li>
                      <li>Scroll down and tap Site permissions.</li>
                      <li>Tap Location and choose <b>Ask to allow</b> (recommended) or manage exceptions for specific sites.</li>
                    </ul>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Mobile (iOS - iPhone/iPad)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>The primary control for location is in the main iOS Settings.</li>
                      <li>Open the Settings app on your iPhone/iPad.</li>
                      <li>Scroll down and tap on Firefox.</li>
                      <li>Tap on Location.</li>
                      <li>Select <b>While Using the App</b> or <b>Ask Next Time Or When I Share</b>.</li>
                    </ul>
                  </details>
                </div>
              </details>
              <details className="mb-2">
                <summary className="cursor-pointer font-semibold text-blue-700">Safari</summary>
                <div className="mt-1 pl-4">
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">macOS (Desktop)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>With Safari open, click Safari in the top menu bar (next to the Apple logo ).</li>
                      <li>Click Settings... (or Preferences...).</li>
                      <li>Go to the Websites tab.</li>
                      <li>Click on Location in the left-hand sidebar.</li>
                      <li>Find the website in the list on the right and change its permission to <b>Allow</b>.</li>
                    </ul>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">iOS/iPadOS (Mobile)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>The primary control for location is in the main iOS Settings.</li>
                      <li>Open the Settings app on your iPhone/iPad.</li>
                      <li>Scroll down and tap on Safari.</li>
                      <li>Scroll down again and tap on Location.</li>
                      <li>Select <b>Allow</b> or <b>Ask</b>.</li>
                    </ul>
                  </details>
                </div>
              </details>
              <details className="mb-2">
                <summary className="cursor-pointer font-semibold text-blue-700">Microsoft Edge</summary>
                <div className="mt-1 pl-4">
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Desktop</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Go to the specific website.</li>
                      <li>Click the lock icon 🔒 in the address bar.</li>
                      <li>Click Permissions for this site.</li>
                      <li>Find Location in the permissions list and change its setting to <b>Allow</b>.</li>
                    </ul>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Mobile (Android)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Tap the three-dots menu (...) at the bottom-center.</li>
                      <li>Tap Settings ⚙️.</li>
                      <li>Tap Privacy and security.</li>
                      <li>Tap Site permissions.</li>
                      <li>Tap Location and ensure the main toggle is on.</li>
                    </ul>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-blue-600">Mobile (iOS - iPhone/iPad)</summary>
                    <ul className="mt-1 list-disc pl-5">
                      <li>The primary control for location is in the main iOS Settings.</li>
                      <li>Open the Settings app on your iPhone/iPad.</li>
                      <li>Scroll down and tap on Edge.</li>
                      <li>Tap on Location.</li>
                      <li>Select <b>While Using the App</b> or <b>Ask Next Time Or When I Share</b>.</li>
                    </ul>
                  </details>
                </div>
              </details>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button className="w-full rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100" onClick={onClose}>
              Continue without location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationBlockedModal;
