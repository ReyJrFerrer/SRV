import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { onboardProvider } from "../../services/firebase";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import BottomNavigation from "../../components/provider/BottomNavigation";

const PayoutSettingsPage: React.FC = () => {
  const { identity } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    gcashNumber: "",
    gcashName: "",
    businessName: "",
    businessType: "INDIVIDUAL" as "INDIVIDUAL" | "CORPORATION" | "PARTNERSHIP",
    email: "",
    phoneNumber: "",
  });

  // Set document title
  useEffect(() => {
    document.title = "Complete Onboarding | SRV";
  }, []);

  // Initialize form with user data
  useEffect(() => {
    if (identity) {
      setFormData((prev) => ({
        ...prev,
        email: prev.email || "",
        phoneNumber: prev.phoneNumber || "",
      }));
    }
  }, [identity]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Format GCash number
    if (name === "gcashNumber") {
      // Remove non-digits and limit to 11 characters
      const cleanValue = value.replace(/\D/g, "").slice(0, 11);
      setFormData((prev) => ({ ...prev, [name]: cleanValue }));
    } else if (name === "phoneNumber") {
      // Format phone number with +63 prefix
      let cleanValue = value.replace(/\D/g, "");

      // If user starts typing without +63, add it automatically
      if (cleanValue.length > 0 && !cleanValue.startsWith("63")) {
        // If they start with 09, replace with 639
        if (cleanValue.startsWith("09")) {
          cleanValue = "63" + cleanValue.slice(1);
        } else if (cleanValue.startsWith("9")) {
          cleanValue = "63" + cleanValue;
        } else {
          cleanValue = "63" + cleanValue;
        }
      }

      // Limit to 12 digits (63 + 10 digits)
      cleanValue = cleanValue.slice(0, 12);
      setFormData((prev) => ({ ...prev, [name]: cleanValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.gcashNumber || !formData.gcashName || !formData.email) {
      setError("Please fill in all required fields");
      return false;
    }

    // Validate GCash number format (should be 11 digits starting with 09)
    const gcashRegex = /^09\d{9}$/;
    if (!gcashRegex.test(formData.gcashNumber)) {
      setError("Invalid GCash number. Must be 11 digits starting with 09");
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    if (!identity) {
      setError("You must be logged in to set up payout settings");
      return;
    }

    setLoading(true);

    try {
      const providerId = identity?.getPrincipal().toString();
      if (!providerId) {
        throw new Error("Unable to get provider ID");
      }

      const result = await onboardProvider({
        providerId: providerId,
        gcashNumber: formData.gcashNumber,
        gcashName: formData.gcashName,
        businessName: formData.businessName || `${formData.gcashName} Services`,
        businessType: formData.businessType,
        email: formData.email,
        phoneNumber: formData.phoneNumber
          ? `+${formData.phoneNumber}`
          : `+63${formData.gcashNumber.slice(1)}`,
      });

      if (result.success) {
        setSuccess(true);
        // Optional: Store onboarding status locally
        localStorage.setItem("provider_onboarded", "true");
      } else {
        throw new Error(
          result.message || result.error || "Failed to set up payout settings",
        );
      }
    } catch (err: any) {
      console.error("Error setting up payout:", err);
      setError(
        err.message || "Failed to set up payout settings. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatGCashNumber = (number: string) => {
    if (number.length <= 4) return number;
    if (number.length <= 7) return `${number.slice(0, 4)} ${number.slice(4)}`;
    return `${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
  };

  const formatPhoneNumber = (number: string) => {
    if (!number) return "";

    // Add +63 prefix for display
    if (number.length <= 2) return `+${number}`;
    if (number.length <= 5) return `+${number.slice(0, 2)} ${number.slice(2)}`;
    if (number.length <= 8)
      return `+${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
    return `+${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 8)} ${number.slice(8)}`;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-100">
        <header className="sticky top-0 z-20 bg-white py-4 shadow-sm">
          <div className="relative flex items-center justify-center px-4">
            <button
              onClick={() => navigate("/provider/home")}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <ArrowLeftIcon className="mr-2 h-5 w-5" />
              Back
            </button>
            <h1 className="text-xl font-extrabold text-black">
              Complete Onboarding
            </h1>
            <div className="absolute right-4 w-20" />
          </div>
        </header>

        <main className="mx-auto max-w-md p-4">
          <div className="rounded-2xl border border-green-200 bg-white p-8 text-center shadow-md">
            <CheckCircleIcon className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-2xl font-bold text-green-700">
              Welcome to SRV!
            </h2>
            <p className="mb-6 text-gray-600">
              Your provider account has been successfully set up! You can now
              Top-up your wallet and start offering your services.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/provider/home")}
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate("/provider/wallet")}
                className="w-full rounded-lg border border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                View Wallet
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-yellow-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-20 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between px-4">
          <button
            onClick={() => navigate("/provider/home")}
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeftIcon className="mr-2 h-5 w-5" />
          </button>
          <h1 className="text-xl font-extrabold text-black">
            Complete Onboarding
          </h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      <main className="mx-auto max-w-md p-4">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-md">
          <div className="p-6">
            <div className="mb-6 text-center">
              <BanknotesIcon className="mx-auto mb-3 h-12 w-12 text-blue-500" />
              <h2 className="mb-2 text-xl font-bold text-blue-900">
                Set Up Your Provider Account
              </h2>
              <p className="text-sm text-gray-600">
                Complete your onboarding by setting up your payout information.
                This enables you to top-up your wallet and accept client booking
                request to your services.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start rounded-lg border border-red-200 bg-red-50 p-3">
                <ExclamationTriangleIcon className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <span className="text-sm text-red-700">
                  {"You already have an account, proceed to wallet"}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* GCash Number */}
              <div>
                <label
                  htmlFor="gcashNumber"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  GCash Number *
                </label>
                <input
                  type="tel"
                  id="gcashNumber"
                  name="gcashNumber"
                  value={formatGCashNumber(formData.gcashNumber)}
                  onChange={handleInputChange}
                  placeholder="0917 123 4567"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter your 11-digit GCash number starting with 09
                </p>
              </div>

              {/* GCash Account Name */}
              <div>
                <label
                  htmlFor="gcashName"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  GCash Account Name *
                </label>
                <input
                  type="text"
                  id="gcashName"
                  name="gcashName"
                  value={formData.gcashName}
                  onChange={handleInputChange}
                  placeholder="Juan Dela Cruz"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must match the name on your GCash account
                </p>
              </div>

              {/* Business Name */}
              <div>
                <label
                  htmlFor="businessName"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Business Name (Optional)
                </label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="Your Service Business Name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Business Type */}
              <div>
                <label
                  htmlFor="businessType"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Business Type
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="CORPORATION">Corporation</option>
                  <option value="PARTNERSHIP">Partnership</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="phoneNumber"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formatPhoneNumber(formData.phoneNumber)}
                  onChange={handleInputChange}
                  placeholder="+63 917 123 4567"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Philippines mobile number with +63 prefix
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Completing Onboarding..." : "Complete Onboarding"}
              </button>
            </form>

            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                <strong>Secure & Private:</strong> Your information is encrypted
                and stored securely. We use Xendit's secure payment platform to
                process transactions. This is a one-time setup to activate your
                provider account.
              </p>
            </div>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default PayoutSettingsPage;
