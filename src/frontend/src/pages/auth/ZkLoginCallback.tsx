import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type CallbackStatus = "processing" | "error";

/**
 * zkLogin OAuth callback handler.
 *
 * This component is rendered OUTSIDE the HashRouter (in main.tsx) because
 * Google redirects to a path-based URL (/auth/callback?id_token=...) which
 * HashRouter can't match. After processing, it redirects to the hash-based
 * home route (/#/) where the normal app takes over.
 */
export default function ZkLoginCallback() {
  const { completeZkLogin } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        await completeZkLogin();
        if (!cancelled) {
          // Auth state is now set — redirect to hash-based home.
          // The LandingPage in App.tsx will handle profile-check / redirect.
          window.location.href = `${window.location.origin}/#/`;
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Authentication failed. Please try again.",
          );
        }
      }
    };

    handleCallback();

    return () => {
      cancelled = true;
    };
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
