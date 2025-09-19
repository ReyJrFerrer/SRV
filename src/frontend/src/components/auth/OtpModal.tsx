import React, { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import OtpInput from "./OtpInput";
import { phoneVerificationService } from "../../services/phoneVerification";

interface OtpModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  phoneNumber: string;
}

const OtpModal: React.FC<OtpModalProps> = ({
  open,
  onClose,
  onVerified,
  phoneNumber,
}) => {
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldShowReload, setShouldShowReload] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [isVerified, setIsVerified] = useState(false);

  // Timer for resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0 && open && !isVerified) {
      timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer, open, isVerified]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setOtpCode("");
      setError(null);
      setShouldShowReload(false);
      setResendTimer(60);
      setIsVerified(false);
    }
  }, [open]);

  const handleOtpSubmit = async (code: string) => {
    if (code.length !== 6) return;

    setIsLoading(true);
    setError(null);
    setShouldShowReload(false);

    try {
      const result = await phoneVerificationService.verifyCode(code);

      if (result.success) {
        setIsVerified(true);
        // Show success state briefly before calling onVerified
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        const errorMessage = result.error || "Invalid verification code";
        setError(errorMessage);
        
        // Check if error suggests reload
        if (errorMessage.includes("reload the page")) {
          setShouldShowReload(true);
        }
        
        // Only clear OTP if it's not a simple invalid code error
        if (!errorMessage.includes("attempts remaining")) {
          setOtpCode("");
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to verify code";
      setError(errorMessage);
      
      if (errorMessage.includes("reload the page")) {
        setShouldShowReload(true);
      }
      
      setOtpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setIsLoading(true);
    setOtpCode("");
    setError(null);
    setShouldShowReload(false);

    try {
      await phoneVerificationService.resendCode("recaptcha-container-modal");
      setResendTimer(60);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to resend verification code";
      setError(errorMessage);
      
      if (errorMessage.includes("reload the page")) {
        setShouldShowReload(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (number: string) => {
    const digits = number.replace(/\D/g, "");
    if (digits.length >= 11 && digits.startsWith("09")) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
    }
    return number;
  };

  const handleClose = () => {
    if (!isLoading && !isVerified) {
      phoneVerificationService.cancel();
      onClose();
    }
  };

  return (
    <>
      {/* Hidden reCAPTCHA container for modal */}
      <div id="recaptcha-container-modal" className="hidden"></div>

      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-2xl transition-all">
                  {/* Close button */}
                  {!isVerified && (
                    <button
                      type="button"
                      className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      onClick={handleClose}
                      disabled={isLoading}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}

                  {isVerified ? (
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <CheckCircleIcon className="h-10 w-10 text-green-600" />
                      </div>
                      <Dialog.Title
                        as="h3"
                        className="text-xl font-bold text-green-700"
                      >
                        Phone Verified!
                      </Dialog.Title>
                      <p className="mt-2 text-sm text-gray-600">
                        Your phone number has been successfully verified.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        <Dialog.Title
                          as="h3"
                          className="text-xl font-bold text-gray-900"
                        >
                          Enter Verification Code
                        </Dialog.Title>
                        <p className="mt-2 text-sm text-gray-600">
                          We sent a 6-digit code to{" "}
                          <span className="font-medium">
                            {formatPhoneNumber(phoneNumber)}
                          </span>
                        </p>
                      </div>

                      <div className="mt-6 space-y-4">
                        <OtpInput
                          value={otpCode}
                          onChange={setOtpCode}
                          onComplete={handleOtpSubmit}
                          disabled={isLoading}
                          error={!!error}
                        />

                        {error && (
                          <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-4">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm text-red-700">{error}</p>
                                {shouldShowReload && (
                                  <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="mt-2 inline-flex items-center rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                                  >
                                    Reload Page
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleResendCode}
                          disabled={isLoading || resendTimer > 0}
                          className="flex items-center text-sm text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {resendTimer > 0 ? (
                            <>
                              <ClockIcon className="mr-1 h-4 w-4" />
                              Resend in {resendTimer}s
                            </>
                          ) : (
                            <>
                              <ArrowPathIcon className="mr-1 h-4 w-4" />
                              Resend Code
                            </>
                          )}
                        </button>
                      </div>

                      {isLoading && (
                        <div className="mt-4 flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-sm text-gray-600">
                            Verifying...
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default OtpModal;
