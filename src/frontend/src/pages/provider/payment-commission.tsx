// src/components/ProviderDashboard/PaymentPage.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

const MAX_AMOUNT = 1000000;

const PaymentProviderCommission: React.FC = () => {
  const [amountPaid, setAmountPaid] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showImageToast, setShowImageToast] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [inspectImage, setInspectImage] = useState(false);

  const navigate = useNavigate();

  // Hardcoded outstanding balance for demonstration.
  const outstandingBalance = 340.0;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setReceipt(file);
      setShowImageToast(true);
      setReceiptPreview(URL.createObjectURL(file));
      setTimeout(() => setShowImageToast(false), 2500);
    }
  };

  const handleDeleteImage = () => {
    setReceipt(null);
    setReceiptPreview(null);
    setInspectImage(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!amountPaid || !receipt) {
      alert("Please enter the amount and upload a receipt.");
      return;
    }
    // ...API logic here...
    setShowSuccess(true);
    setAmountPaid("");
    setReceipt(null);
    setReceiptPreview(null);
  };

  // Limit the amount input to MAX_AMOUNT (₱1,000,000)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value || parseFloat(value) <= MAX_AMOUNT) {
      setAmountPaid(value);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 via-blue-50 to-yellow-100 px-2 py-10">
      {/* Inspectable Image Modal */}
      {inspectImage && receiptPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setInspectImage(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={receiptPreview}
              alt="Receipt Full Preview"
              className="max-h-[90vh] max-w-[90vw] rounded-xl border-4 border-white bg-white shadow-2xl"
            />
            <button
              className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              onClick={() => setInspectImage(false)}
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <button
              className="absolute top-2 left-2 rounded-full bg-red-600/80 p-2 text-white hover:bg-red-700"
              onClick={handleDeleteImage}
              aria-label="Delete"
            >
              <TrashIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative flex w-full max-w-xs flex-col items-center rounded-2xl bg-white p-6 shadow-2xl">
            <button
              className="absolute top-2 right-2 rounded-full bg-gray-100 p-1 text-gray-500 hover:bg-gray-200"
              onClick={() => setShowSuccess(false)}
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <img
              src="/images/srv characters (SVG)/girl.svg"
              alt="Success"
              className="mb-2 h-28 w-28"
            />
            <div className="mb-1 text-lg font-bold text-gray-800">
              Payment Proof Submitted!
            </div>
            <div className="mb-2 text-center text-sm text-gray-600">
              Your payment proof has been submitted.
              <br />
              Please wait for admin verification.
            </div>
            <button
              className="mt-2 rounded-full bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-yellow-400"
              onClick={() => setShowSuccess(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Toast for image upload */}
      {showImageToast && (
        <div className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
          <span className="text-sm font-medium text-green-800">
            Receipt image uploaded!
          </span>
        </div>
      )}

      <div className="w-full max-w-lg rounded-3xl border border-blue-100 bg-white p-6 shadow-2xl">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-blue-700 hover:text-blue-900 focus:outline-none"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="font-medium">Back</span>
        </button>
        <h1 className="mb-2 flex flex-col items-center gap-2 text-2xl font-extrabold text-blue-800">
          <img
            src="/images/srv characters (SVG)/girl.svg"
            alt="Pay Provider Commission"
            className="h-16 w-16"
          />
          <span className="text-center">Pay Provider Commission</span>
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Please settle your outstanding commission balance to continue enjoying
          SRV services.
        </p>

        <div className="mb-6 flex items-center gap-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          <div>
            <div className="text-lg font-bold text-yellow-700">
              Outstanding Balance
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-red-600">
              ₱{outstandingBalance.toFixed(2)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Amount Paid <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={handleAmountChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              placeholder="e.g., 340.00"
              min="0"
              max={MAX_AMOUNT}
              required
            />
            <span className="mt-1 block text-xs text-gray-400">
              Maximum: ₱{MAX_AMOUNT.toLocaleString()}
            </span>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Upload Receipt <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-yellow-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-yellow-700 hover:file:bg-yellow-100"
              required
            />
            {receipt && receiptPreview && (
              <div className="mt-4 flex flex-col items-center">
                <span className="mb-2 text-xs text-gray-600">
                  Preview of uploaded receipt:
                </span>
                <div className="relative">
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 z-10 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-700"
                    onClick={handleDeleteImage}
                    aria-label="Delete uploaded receipt"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="focus:outline-none"
                    onClick={() => setInspectImage(true)}
                    aria-label="Inspect uploaded receipt"
                  >
                    <img
                      src={receiptPreview}
                      alt="Receipt Preview"
                      className="max-h-48 cursor-zoom-in rounded-lg border border-gray-200 shadow transition hover:brightness-90"
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-yellow-500 px-6 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:outline-none"
          >
            Submit Proof of Payment
          </button>
        </form>
        <div className="mt-8 text-center text-xs text-gray-400">
          Payments are verified within 1-2 business days. For questions, contact{" "}
          <a
            href="mailto:support@srvpinoy.com"
            className="text-blue-600 underline"
          >
            support@srvpinoy.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default PaymentProviderCommission;
