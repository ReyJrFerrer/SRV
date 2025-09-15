import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { CurrencyDollarIcon, XCircleIcon } from "@heroicons/react/24/solid";
import BottomNavigation from "../../components/provider/BottomNavigation";
import { useWallet } from "../../hooks/useWallet";
import { Transaction } from "../../services/walletCanisterService";
import { Toaster, toast } from "sonner";
import { createTopupInvoice, TopupInvoiceRequest } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { identity } = useAuth();
  const {
    balance,
    transactions,
    loading,
    error,
    transactionLoading,
    formatCurrency,
    getTransactionDisplay,
    refreshWalletData,
    isAuthenticated,
  } = useWallet();

  // Top-up modal state
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Predefined top-up amounts
  const predefinedAmounts = [100, 250, 500, 1000, 2500, 5000];

  useEffect(() => {
    document.title = "My Wallet | SRV Provider";
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  const handleTopUpClick = () => {
    setShowTopUpModal(true);
  };

  const handleTopUpSubmit = async () => {
    if (!identity) {
      toast.error("Please authenticate first");
      return;
    }

    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 50) {
      toast.error("Minimum top-up amount is ₱50");
      return;
    }

    if (amount > 50000) {
      toast.error("Maximum top-up amount is ₱50,000");
      return;
    }

    setTopUpLoading(true);
    try {
      const providerId = identity.getPrincipal().toString();
      const request: TopupInvoiceRequest = {
        providerId,
        amount,
      };

      const response = await createTopupInvoice(request);

      if (response.success && response.invoiceUrl) {
        toast.success("Redirecting to payment...");
        // Open payment URL in new tab/window
        window.open(response.invoiceUrl, "_blank");
        setShowTopUpModal(false);
        setTopUpAmount("");
      } else {
        throw new Error(response.error || "Failed to create top-up invoice");
      }
    } catch (error: any) {
      console.error("Top-up error:", error);
      toast.error(error.message || "Failed to initiate top-up");
    } finally {
      setTopUpLoading(false);
    }
  };

  const handlePredefinedAmount = (amount: number) => {
    setTopUpAmount(amount.toString());
  };

  const handleRefresh = async () => {
    try {
      await refreshWalletData();
      toast.success("Wallet data refreshed");
    } catch (err) {
      toast.error("Failed to refresh wallet data");
    }
  };

  const formatTransactionDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      // Less than a week
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.transactionType) {
      case "Credit":
        return <ArrowDownIcon className="h-5 w-5 text-green-600" />;
      case "Debit":
        return <ArrowUpIcon className="h-5 w-5 text-red-600" />;
      case "Transfer":
        return <ArrowRightIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-md px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-6">
        {/* Wallet Balance Card */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Available Balance</p>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">
                  {loading ? "..." : formatCurrency(balance)}
                </span>
              </div>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <BanknotesIcon className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleTopUpClick}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/20 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"
            >
              <PlusIcon className="h-4 w-4" />
              Top Up
            </button>
            <button
              onClick={() => navigate("/provider/bookings")}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/20 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"
            >
              <CurrencyDollarIcon className="h-4 w-4" />
              Earnings
            </button>
          </div>
        </div>

        {/* Commission Notice */}
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-yellow-600" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">
                Commission Deduction
              </p>
              <p className="mt-1 text-yellow-700">
                Service commissions are automatically deducted from your wallet
                upon job completion. Ensure sufficient balance before accepting
                cash bookings.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <XCircleIcon className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Transaction History
              </h2>
              {transactionLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {loading && transactions.length === 0 ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
                      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
                    </div>
                    <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
                  </div>
                </div>
              ))
            ) : transactions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">No transactions yet</p>
                <p className="text-sm text-gray-400">
                  Your transaction history will appear here
                </p>
              </div>
            ) : (
              transactions.map((transaction) => {
                const display = getTransactionDisplay(transaction);
                return (
                  <div key={transaction.id} className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        {getTransactionIcon(transaction)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {display.type}
                          </span>
                          {transaction.transactionType === "Transfer" && (
                            <span className="text-xs text-gray-500">
                              • Transfer
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatTransactionDate(transaction.timestamp)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`font-medium ${display.color}`}>
                          {display.sign}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Load More Button (if needed) */}
        {transactions.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={handleRefresh}
              disabled={transactionLoading}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {transactionLoading ? "Loading..." : "Refresh Transactions"}
            </button>
          </div>
        )}
      </div>

      {/* Top-Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Top Up Wallet
              </h3>
              <button
                onClick={() => {
                  setShowTopUpModal(false);
                  setTopUpAmount("");
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Predefined amounts */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Quick amounts
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {predefinedAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handlePredefinedAmount(amount)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        topUpAmount === amount.toString()
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
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
                  htmlFor="topup-amount"
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
                      id="topup-amount"
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="0.00"
                      min="50"
                      max="50000"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum: ₱50 • Maximum: ₱50,000
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowTopUpModal(false);
                    setTopUpAmount("");
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTopUpSubmit}
                  disabled={topUpLoading || !topUpAmount || parseFloat(topUpAmount) < 50}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {topUpLoading ? "Processing..." : "Continue to Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default WalletPage;
