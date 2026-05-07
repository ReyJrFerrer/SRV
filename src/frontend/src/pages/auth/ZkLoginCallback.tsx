import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type CallbackStatus = "processing" | "error";

const COMPLETE_ZKLOGIN_TIMEOUT_MS = 30000;

/**
 * zkLogin OAuth callback handler.
 *
 * This component is rendered OUTSIDE the HashRouter (in main.tsx) because
 * Google returns the id_token in the URL fragment (#id_token=...) which
 * HashRouter can't match as a route. After processing, it redirects to the
 * hash-based home route (/#/) and reloads so the normal app mounts.
 */
export default function ZkLoginCallback() {
  const { completeZkLogin } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      try {
        // Race completeZkLogin against a timeout so the user is never
        // stuck on the spinner indefinitely if the Cloud Function hangs.
        await Promise.race([
          completeZkLogin(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Sign-in is taking longer than expected. Please try again.",
                  ),
                ),
              COMPLETE_ZKLOGIN_TIMEOUT_MS,
            ),
          ),
        ]);

        // Auth state is now set — redirect to hash-based home and reload.
        // We must reload because this component lives outside HashRouter;
        // a hash change alone won't remount the normal app tree.
        window.location.hash = "#/";
        window.location.reload();
      } catch (err) {
        console.error("[ZkLoginCallback] completeZkLogin failed:", err);
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Authentication failed. Please try again.",
        );
      }
    };

    handleCallback();
  }, [completeZkLogin]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-800">
              Authentication Failed
            </h2>
            <p className="mb-6 text-gray-600">{errorMessage}</p>
            <a
              href={`${window.location.origin}/#/`}
              className="inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow transition-all hover:bg-blue-700"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-lg font-medium text-gray-700">
          Completing sign in...
        </p>
        <p className="mt-1 text-sm text-gray-500">
          This may take a moment.
        </p>
      </div>
    </div>
  );
}
