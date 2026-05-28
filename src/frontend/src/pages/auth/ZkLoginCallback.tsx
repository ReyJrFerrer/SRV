import { useEffect, useRef, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SuspensionModal from "../../components/SuspensionModal";

type CallbackStatus = "processing" | "error" | "locked";

const COMPLETE_ZKLOGIN_TIMEOUT_MS = 30000;

export default function ZkLoginCallback() {
  const { completeZkLogin } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [suspensionEndDate, setSuspensionEndDate] = useState<
    Date | null | undefined
  >(undefined);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      try {
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

        window.location.hash = "#/";
        window.location.reload();
      } catch (err) {
        console.error("[ZkLoginCallback] completeZkLogin failed:", err);

        const firebaseError = err as {
          code?: string;
          details?: { suspensionEndDate?: string | null };
        };

        if (firebaseError.code === "functions/failed-precondition") {
          const raw = firebaseError.details?.suspensionEndDate;
          setSuspensionEndDate(
            raw === undefined ? undefined : raw === null ? null : new Date(raw),
          );
          setStatus("locked");
        } else {
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
  }, [completeZkLogin]);

  if (status === "locked") {
    return (
      <MemoryRouter>
        <SuspensionModal
          isOpen={true}
          onClose={() => {
            window.location.href = "/";
          }}
          suspensionEndDate={suspensionEndDate}
        />
      </MemoryRouter>
    );
  }

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
        <p className="mt-1 text-sm text-gray-500">This may take a moment.</p>
      </div>
    </div>
  );
}
