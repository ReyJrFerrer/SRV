import React, { useState, useEffect } from "react";
import {
  PhoneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import OtpInput from "./OtpInput";
import {
  phoneVerificationService,
  PhoneVerificationStep,
  PhoneVerificationResult,
} from "../../services/phoneVerification";

interface PhoneVerificationProps {
  onVerificationComplete: (result: PhoneVerificationResult) => void;
  initialPhoneNumber?: string;
  disabled?: boolean;
  className?: string;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  onVerificationComplete,
  initialPhoneNumber = "",
  disabled = false,
  className = "",
}) => {
  const [step, setStep] = useState<PhoneVerificationStep>({
    step: "phone-input",
  });
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Initialize the service
  useEffect(() => {
    const initService = async () => {
      const success = await phoneVerificationService.initialize();
      setIsInitialized(success);
      if (!success) {
        setStep({
          step: "error",
          error: "Phone verification service is not available",
        });
      }
    };

    initService();
  }, []);

  // Timer for resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handlePhoneSubmit = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setStep({
        step: "error",
        error: "Please enter your phone number",
      });
      return;
    }

    setIsLoading(true);
    setStep({ step: "phone-input" });

    try {
      const result = await phoneVerificationService.startVerification(
        phoneNumber,
        "recaptcha-container",
      );

      setStep(result);

      if (result.step === "otp-input" && result.timeUntilResend) {
        setResendTimer(result.timeUntilResend);
      }
    } catch (error: any) {
      setStep({
        step: "error",
        error: error.message || "Failed to send verification code",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (code: string) => {
    if (code.length !== 6) return;

    setIsLoading(true);
    setOtpCode(code);
    setOtpError(null);

    try {
      const result = await phoneVerificationService.verifyCode(code);

      if (result.success) {
        setStep({ step: "verified" });
        onVerificationComplete(result);
      } else {
        setOtpError(result.error || "Invalid verification code");
        setOtpCode("");
      }
    } catch (error: any) {
      setOtpError(error.message || "Failed to verify code");
      setOtpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setIsLoading(true);
    setOtpCode("");

    try {
      const result = await phoneVerificationService.resendCode(
        "recaptcha-container",
      );
      setStep(result);

      if (result.step === "otp-input" && result.timeUntilResend) {
        setResendTimer(result.timeUntilResend);
      }
    } catch (error: any) {
      setStep({
        step: "error",
        error: error.message || "Failed to resend verification code",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    phoneVerificationService.cancel();
    setStep({ step: "phone-input" });
    setOtpCode("");
    setOtpError(null);
    setResendTimer(0);
  };

  const formatPhoneNumber = (number: string) => {
    const digits = number.replace(/\D/g, "");
    if (digits.length >= 11 && digits.startsWith("09")) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
    }
    return number;
  };

  if (!isInitialized) {
    return (
      <div className={`text-center ${className}`}>
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500">Loading verification service...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* reCAPTCHA container - hidden */}
      <div id="recaptcha-container" className="hidden"></div>

      {step.step === "phone-input" && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09xx xxx xxxx"
                disabled={disabled || isLoading}
                className="w-full rounded-lg border border-gray-300 py-3 pr-3 pl-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                maxLength={11}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePhoneSubmit(e as any);
                  }
                }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter your Philippine mobile number
            </p>
          </div>

          <button
            type="button"
            onClick={handlePhoneSubmit}
            disabled={disabled || isLoading || !phoneNumber.trim()}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                Sending Code...
              </div>
            ) : (
              "Send Verification Code"
            )}
          </button>
        </div>
      )}

      {step.step === "otp-input" && (
        <div className="space-y-6 text-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Enter Verification Code
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              We sent a 6-digit code to{" "}
              <span className="font-medium">
                {formatPhoneNumber(step.phoneNumber || phoneNumber)}
              </span>
            </p>
          </div>

          <div className="space-y-4">
            <OtpInput
              value={otpCode}
              onChange={setOtpCode}
              onComplete={handleOtpSubmit}
              disabled={isLoading}
              error={!!otpError}
            />

            {otpError && (
              <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{otpError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={isLoading}
              className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              ← Change phone number
            </button>

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
        </div>
      )}

      {step.step === "verified" && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 p-3">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-700">
            Phone Verified!
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Your phone number has been successfully verified.
          </p>
        </div>
      )}

      {step.step === "error" && !step.phoneNumber && (
        <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{step.error}</p>
              <button
                type="button"
                onClick={() => setStep({ step: "phone-input" })}
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-900"
              >
                Try again →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneVerification;
