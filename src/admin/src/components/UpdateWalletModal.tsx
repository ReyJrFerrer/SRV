import React from "react";
import { XCircleIcon, PlusIcon, MinusIcon } from "@heroicons/react/24/outline";

interface UpdateWalletModalProps {
  isOpen: boolean;
  updateMode: "add" | "deduct";
  commissionAmount: string;
  updateLoading: boolean;
  predefinedAmounts: number[];
  onClose: () => void;
  onModeChange: (mode: "add" | "deduct") => void;
  onAmountChange: (value: string) => void;
  onAmountInputChange: (value: string) => void;
  onSubmit: () => void;
}

const UpdateWalletModal: React.FC<UpdateWalletModalProps> = ({
  isOpen,
  updateMode,
  commissionAmount,
  updateLoading,
  predefinedAmounts,
  onClose,
  onModeChange,
  onAmountChange,
  onAmountInputChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Update Wallet Balance
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100/50 hover:text-gray-600"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Mode selector */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Action Type
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                onClick={() => onModeChange("add")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  updateMode === "add"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </button>
              <button
                onClick={() => onModeChange("deduct")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  updateMode === "deduct"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <MinusIcon className="h-4 w-4" />
                Deduct
              </button>
            </div>
          </div>

          {/* Predefined amounts */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Quick amounts
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {predefinedAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => onAmountChange(amount.toString())}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    commissionAmount === amount.toString()
                      ? "border-blue-500 bg-blue-50/80 text-blue-600"
                      : "border-gray-200 bg-white/80 text-gray-700 hover:bg-gray-50/80"
                  }`}
                >
                  ₱{amount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount input */}
          <div>
            <label
              htmlFor="wallet-balance-amount"
              className="text-sm font-medium text-gray-700"
            >
              Or enter custom amount
            </label>
            <div className="mt-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₱
                </span>
                <input
                  id="wallet-balance-amount"
                  type="text"
                  value={commissionAmount}
                  onChange={(e) => onAmountInputChange(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-lg border border-gray-300 bg-white/80 py-2 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Minimum: ₱1 • Maximum: ₱50,000
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50/80"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={
                updateLoading ||
                !commissionAmount ||
                parseFloat(commissionAmount) <= 0 ||
                parseFloat(commissionAmount) > 50000
              }
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
                updateMode === "add"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {updateLoading
                ? "Processing..."
                : updateMode === "add"
                  ? "Add Funds"
                  : "Deduct Funds"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateWalletModal;
