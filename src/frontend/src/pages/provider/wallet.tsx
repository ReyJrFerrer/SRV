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
import BottomNavigation from "../../components/provider/NavigationBar";
import { useWallet } from "../../hooks/useWallet";
import { Transaction } from "../../services/walletCanisterService";
import { Toaster, toast } from "sonner";
import {
  createTopupInvoice,
  TopupInvoiceRequest,
  checkInvoiceStatus,
} from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import authCanisterService from "../../services/authCanisterService";

const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { identity } = useAuth();
  const {
    balance,
    transactions,
    loading,
    error,
    transactionLoading,
    loadMoreLoading,
    hasMoreTransactions,
    formatCurrency,
    getTransactionDisplay,
    refreshWalletData,
    loadMoreTransactions,
    isAuthenticated,
  } = useWallet();

  // Top-up modal state
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Commission info modal state
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  // Onboarding modal state
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Running balance toggle state
  const [showRunningBalance, setShowRunningBalance] = useState(false);

  // Track active invoices for payment completion checking
  const [activeInvoices, setActiveInvoices] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("activeTopupInvoices");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Persist active invoices to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "activeTopupInvoices",
        JSON.stringify([...activeInvoices]),
      );
    }
  }, [activeInvoices]);

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

  // Check if user needs onboarding
  useEffect(() => {
    if (!isAuthenticated || !identity) return;

    const checkOnboardingStatus = async () => {
      try {
        const profile = await authCanisterService.getMyProfile();
        console.log("Profile onboarding check", profile);
        if (profile && !profile.isOnboarded) {
          setShowOnboardingModal(true);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, identity]);

  // Periodically check for completed payments
  useEffect(() => {
    if (activeInvoices.size === 0) return;

    const interval = setInterval(() => {
      checkAndCreditCompletedPayments();
    }, 15000); // Check every 15 seconds

    // Check immediately
    checkAndCreditCompletedPayments();

    return () => clearInterval(interval);
  }, [activeInvoices.size]);

  const handleTopUpClick = () => {
    setShowTopUpModal(true);
  };

  // Function to check for completed payments and update UI
  const checkAndCreditCompletedPayments = async () => {
    if (!identity || activeInvoices.size === 0) return;

    const completedInvoices = new Set<string>();

    for (const invoiceId of activeInvoices) {
      try {
        const statusResponse = await checkInvoiceStatus(invoiceId);

        if (statusResponse.success) {
          if (
            statusResponse.status === "PAID" ||
            statusResponse.status === "SETTLED"
          ) {
            // Payment completed - the backend has already credited the wallet
            if (statusResponse.credited) {
              const amount = statusResponse.paidAmount || 0;

              if (statusResponse.alreadyCredited) {
                // Already credited in a previous check
                toast.info(
                  `Payment already processed for ₱${amount.toLocaleString()}`,
                );
              } else {
                // Just credited by the backend
                toast.success(
                  `Wallet credited with ₱${amount.toLocaleString()}`,
                );
              }

              completedInvoices.add(invoiceId);

              // Refresh wallet data to show updated balance
              await refreshWalletData();
            } else if (statusResponse.creditError) {
              // Credit failed on backend
              toast.error(
                `Payment received but failed to credit wallet: ${statusResponse.creditError}. Please contact support.`,
              );
              completedInvoices.add(invoiceId);
            }
          } else if (statusResponse.status === "EXPIRED") {
            // Invoice expired, remove from tracking
            completedInvoices.add(invoiceId);
            toast.warning(
              "A top-up payment has expired. Please create a new top-up if needed.",
            );
          }
        }
      } catch (error) {
        console.error(`Error checking invoice ${invoiceId}:`, error);
      }
    }

    // Remove completed/expired invoices from tracking
    if (completedInvoices.size > 0) {
      setActiveInvoices((prev) => {
        const newSet = new Set(prev);
        completedInvoices.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleTopUpSubmit = async () => {
    if (!identity) {
      toast.error("Please authenticate first");
      return;
    }

    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 100) {
      toast.error("Minimum top-up amount is ₱100");
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
        // Extract invoice ID from the response
        const invoiceId = response.invoiceId;

        if (invoiceId) {
          // Add to active invoices for payment monitoring
          setActiveInvoices((prev) => new Set(prev).add(invoiceId));
          toast.success(
            "Redirecting to payment. We'll credit your wallet automatically when payment is completed.",
          );
        } else {
          toast.success("Redirecting to payment...");
        }

        // Open payment URL in new tab/window
        window.open(response.invoiceUrl, "_blank");
        setShowTopUpModal(false);
        setTopUpAmount("");
      } else {
        throw new Error(
          "Failed to create top-up invoice, create an account through the payout settings",
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate top-up");
    } finally {
      setTopUpLoading(false);
    }
  };

  const handlePredefinedAmount = (amount: number) => {
    setTopUpAmount(amount.toString());
  };

  const handleAmountInputChange = (value: string) => {
    // Allow only numbers by stripping non-digit characters
    let numericValue = value.replace(/[^0-9]/g, "");

    // Prevent leading zeros, unless the value is "0" itself
    if (numericValue.length > 1 && numericValue.startsWith("0")) {
      numericValue = parseInt(numericValue, 10).toString();
    }

    // Prevent exceeding 50,000
    if (parseInt(numericValue, 10) > 50000) {
      numericValue = "50000";
    }

    // Handle empty or invalid parsing
    if (numericValue === "NaN") {
      numericValue = "";
    }

    setTopUpAmount(numericValue);
  };

  const handleRefresh = async () => {
    try {
      // Check for any completed payments first
      await checkAndCreditCompletedPayments();

      // Then refresh wallet data
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
    switch (transaction.transaction_type) {
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

  // Group transactions by date
  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      const date = new Date(transaction.timestamp);
      const dateKey = date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
    });

    return groups;
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  const transactionGroups = groupTransactionsByDate(transactions);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white shadow-sm">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex w-full items-center justify-center px-4 py-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-black">
              My Wallet
            </h1>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="absolute right-4 rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-md px-4 py-6">
        {/* Wallet Balance Card - Sticky */}
        <div className="sticky top-0 z-10 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
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

          {/* Commission Info Button */}
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => setShowCommissionModal(true)}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/80 backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
              Commission Info
            </button>
          </div>
        </div>

        {/* Active Payments Monitoring */}
        {activeInvoices.size > 0 && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <ClockIcon className="mt-0.5 h-5 w-5 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">
                  Monitoring {activeInvoices.size} payment
                  {activeInvoices.size > 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-blue-700">
                  We're checking for payment completion and will automatically
                  credit your wallet.
                </p>
              </div>
            </div>
          </div>
        )}

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
        <div className="space-y-4">
          {loading && transactions.length === 0 ? (
            // Loading skeleton
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Transaction History
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, index) => (
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
                ))}
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Transaction History
                </h2>
              </div>
              <div className="px-6 py-12 text-center">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">No transactions yet</p>
                <p className="text-sm text-gray-400">
                  Your transaction history will appear here
                </p>
              </div>
            </div>
          ) : (
            Object.entries(transactionGroups).map(
              ([dateKey, dayTransactions]) => (
                <div key={dateKey} className="rounded-2xl bg-white shadow-sm">
                  {/* Date Header */}
                  <div className="border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {dateKey}
                      </h3>
                      <div className="flex items-center gap-3">
                        {/* Running Balance Toggle */}
                        <button
                          onClick={() =>
                            setShowRunningBalance(!showRunningBalance)
                          }
                          className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          <span>Show Running Balance</span>
                          <span
                            className={`transform transition-transform ${showRunningBalance ? "rotate-180" : ""}`}
                          >
                            ▼
                          </span>
                        </button>
                        {transactionLoading && (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transactions for this date */}
                  <div className="divide-y divide-gray-100">
                    {dayTransactions.map((transaction) => {
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
                                {transaction.transaction_type ===
                                  "Transfer" && (
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
                              {showRunningBalance && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Balance:{" "}
                                  {formatCurrency(transaction.running_balance)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )
          )}
        </div>

        {/* Load More Button */}
        {transactions.length > 0 && hasMoreTransactions && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMoreTransactions}
              disabled={loadMoreLoading}
              className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-blue-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {loadMoreLoading ? "Loading..." : "Load More Transactions"}
            </button>
          </div>
        )}

        {/* Refresh Button */}
        {/* {transactions.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={handleRefresh}
              disabled={transactionLoading}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {transactionLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        )} */}
      </div>

      {/* Top-Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Top Up Wallet
              </h3>
              <button
                onClick={() => {
                  setShowTopUpModal(false);
                  setTopUpAmount("");
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100/50 hover:text-gray-600"
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
                      type="text"
                      value={topUpAmount}
                      onChange={(e) => handleAmountInputChange(e.target.value)}
                      placeholder="Enter amount"
                      min="100"
                      className="w-full rounded-lg border border-gray-300 bg-white/80 py-2 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum: ₱100 • Maximum: ₱50,000
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
                  className="flex-1 rounded-lg border border-gray-300 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50/80"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTopUpSubmit}
                  disabled={
                    topUpLoading ||
                    !topUpAmount ||
                    parseFloat(topUpAmount) < 100
                  }
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {topUpLoading ? "Processing..." : "Continue to Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-xl backdrop-blur-md">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <BanknotesIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Complete Your Onboarding
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Before you can use your wallet and topup, you need to complete
                your provider onboarding by setting up your payout information.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200/80 bg-blue-50/80 p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">
                      What you'll set up:
                    </p>
                    <ul className="mt-2 space-y-1 text-blue-700">
                      <li>• GCash account for receiving payments</li>
                      <li>• Business information</li>
                      <li>• Contact details</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowOnboardingModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white/80 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50/80"
                >
                  Later
                </button>
                <button
                  onClick={() => navigate("/provider/payout-settings")}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Info Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Commission Information
              </h3>
              <button
                onClick={() => setShowCommissionModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100/50 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-200/80 bg-yellow-50/80 p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-yellow-600" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">
                      Automatic Commission Deduction
                    </p>
                    <p className="mt-2 text-yellow-700">
                      Service commissions are automatically deducted from your
                      wallet upon job completion. This ensures transparent and
                      accurate commission processing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Important Notes:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-blue-500">•</span>
                    <span>
                      Ensure sufficient balance before accepting cash bookings
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-blue-500">•</span>
                    <span>
                      Commission rates vary by service category and booking
                      value
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-blue-500">•</span>
                    <span>
                      You can top up your wallet anytime to maintain adequate
                      balance
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-blue-500">•</span>
                    <span>
                      Digital payments (GCash) are processed differently without
                      requiring pre-deduction
                    </span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowCommissionModal(false)}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Got it
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
