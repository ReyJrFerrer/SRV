import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ClockIcon,
  XCircleIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { CurrencyDollarIcon } from "@heroicons/react/24/solid";
import {
  walletCanisterService,
  Transaction,
} from "../../../frontend/src/services/walletCanisterService";
import { Toaster, toast } from "sonner";

const UserWalletPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [showRunningBalance, setShowRunningBalance] = useState(false);

  // Update Commission modal state
  const [showUpdateCommissionModal, setShowUpdateCommissionModal] =
    useState(false);
  const [commissionAmount, setCommissionAmount] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMode, setUpdateMode] = useState<"add" | "deduct">("add");

  const TRANSACTIONS_PER_PAGE = 10;
  const predefinedAmounts = [100, 250, 500, 1000, 2500, 5000];

  // Fetch wallet balance
  const fetchBalance = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const balanceValue = await walletCanisterService.getBalanceOf(id);
      setBalance(balanceValue);
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
      setError("Could not load wallet balance.");
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch transaction history
  const fetchTransactions = useCallback(async () => {
    if (!id) return;
    try {
      setTransactionLoading(true);
      setError(null);
      const history = await walletCanisterService.getTransactionHistory(id);
      const sortedTransactions = history.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setTransactions(sortedTransactions.slice(0, TRANSACTIONS_PER_PAGE));
      setHasMoreTransactions(sortedTransactions.length > TRANSACTIONS_PER_PAGE);
    } catch (err) {
      console.error("Failed to fetch transaction history:", err);
      setError("Could not load transaction history.");
      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  }, [id]);

  // Load more transactions
  const loadMoreTransactions = useCallback(async () => {
    if (!id || !hasMoreTransactions || loadMoreLoading) return;
    try {
      setLoadMoreLoading(true);
      const history = await walletCanisterService.getTransactionHistory(id);
      const sortedTransactions = history.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setTransactions(sortedTransactions);
      setHasMoreTransactions(false);
    } catch (err) {
      console.error("Failed to load more transactions:", err);
    } finally {
      setLoadMoreLoading(false);
    }
  }, [id, hasMoreTransactions, loadMoreLoading]);

  // Refresh wallet data
  const refreshWalletData = useCallback(async () => {
    await Promise.all([fetchBalance(), fetchTransactions()]);
  }, [fetchBalance, fetchTransactions]);

  // Initial data fetch
  useEffect(() => {
    if (id) {
      refreshWalletData();
    }
  }, [id, refreshWalletData]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Get transaction display
  const getTransactionDisplay = (transaction: Transaction) => {
    switch (transaction.transaction_type) {
      case "Credit":
        return {
          type: "Received",
          color: "text-green-600",
          sign: "+",
        };
      case "Debit":
        return {
          type: "Deducted",
          color: "text-red-600",
          sign: "-",
        };
      case "Transfer":
        return {
          type: "Transfer",
          color: "text-blue-600",
          sign: "",
        };
      default:
        return { type: "Unknown", color: "text-gray-500", sign: "" };
    }
  };

  // Format transaction date
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

  // Get transaction icon
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

  // Handle Update Commission
  const handleUpdateCommissionClick = (mode: "add" | "deduct") => {
    setUpdateMode(mode);
    setCommissionAmount("");
    setShowUpdateCommissionModal(true);
  };

  // Handle commission amount input
  const handleAmountInputChange = (value: string) => {
    let numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue.length > 1 && numericValue.startsWith("0")) {
      numericValue = parseInt(numericValue, 10).toString();
    }
    if (parseInt(numericValue, 10) > 50000) {
      numericValue = "50000";
    }
    if (numericValue === "NaN") {
      numericValue = "";
    }
    setCommissionAmount(numericValue);
  };

  // Handle commission update submit
  const handleCommissionUpdateSubmit = async () => {
    if (!id) return;

    const amount = parseFloat(commissionAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > 50000) {
      toast.error("Maximum amount is ₱50,000");
      return;
    }

    setUpdateLoading(true);
    try {
      if (updateMode === "add") {
        // Credit wallet
        await walletCanisterService.creditWallet(
          id,
          amount,
          "ADMIN_UPDATE",
          `Admin credit: ₱${amount.toFixed(2)}`,
        );
        toast.success(`Successfully added ₱${amount.toFixed(2)} to wallet`);
      } else {
        // Debit wallet
        await walletCanisterService.debitWallet(
          id,
          amount,
          `Admin deduction: ₱${amount.toFixed(2)}`,
          "ADMIN_UPDATE",
        );
        toast.success(
          `Successfully deducted ₱${amount.toFixed(2)} from wallet`,
        );
      }

      // Refresh wallet data
      await refreshWalletData();
      setShowUpdateCommissionModal(false);
      setCommissionAmount("");
    } catch (error: any) {
      console.error("Failed to update commission:", error);
      toast.error(error.message || "Failed to update wallet");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleRefresh = async () => {
    await refreshWalletData();
    toast.success("Wallet data refreshed");
  };

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">User ID not provided</p>
      </div>
    );
  }

  const transactionGroups = groupTransactionsByDate(transactions);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  // Check if we came from analytics page
                  const fromAnalytics = location.state?.from === "analytics";
                  if (fromAnalytics) {
                    navigate("/analytics");
                  } else {
                    navigate(`/user/${id}`);
                  }
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">User Wallet</h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
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

          {/* Action Button */}
          <div className="mt-6">
            <button
              onClick={() => handleUpdateCommissionClick("add")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/20 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"
            >
              <PlusIcon className="h-4 w-4" />
              Update Commission
            </button>
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
        <div className="space-y-4">
          {loading && transactions.length === 0 ? (
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
                  Transaction history will appear here
                </p>
              </div>
            </div>
          ) : (
            Object.entries(transactionGroups).map(
              ([dateKey, dayTransactions]) => (
                <div key={dateKey} className="rounded-2xl bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {dateKey}
                      </h3>
                      <div className="flex items-center gap-3">
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
      </div>

      {/* Update Commission Modal */}
      {showUpdateCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Update Commission
              </h3>
              <button
                onClick={() => {
                  setShowUpdateCommissionModal(false);
                  setCommissionAmount("");
                }}
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
                    onClick={() => setUpdateMode("add")}
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
                    onClick={() => setUpdateMode("deduct")}
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
                      onClick={() => setCommissionAmount(amount.toString())}
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
                  htmlFor="commission-amount"
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
                      id="commission-amount"
                      type="text"
                      value={commissionAmount}
                      onChange={(e) => handleAmountInputChange(e.target.value)}
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
                  onClick={() => {
                    setShowUpdateCommissionModal(false);
                    setCommissionAmount("");
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50/80"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommissionUpdateSubmit}
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
      )}
    </div>
  );
};

export default UserWalletPage;
