import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { XCircleIcon } from "@heroicons/react/24/outline";
import {
  walletCanisterService,
  Transaction,
} from "../../../frontend/src/services/walletCanisterService";
import { Toaster, toast } from "sonner";
import WalletBalanceCard from "../components/WalletBalanceCard";
import TransactionHistory from "../components/TransactionHistory";
import UpdateWalletModal from "../components/UpdateWalletModal";
import { formatCurrency } from "../utils/formatUtils";
import { validateAmount, isValidAmount, getMaxAmount } from "../utils/walletUtils";

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

  // Update Wallet Balance modal state
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

  useEffect(() => {
    if (id) {
      refreshWalletData();
    }
  }, [id, refreshWalletData]);

  // Handle Update Wallet Balance
  const handleUpdateCommissionClick = () => {
    setUpdateMode("add");
    setCommissionAmount("");
    setShowUpdateCommissionModal(true);
  };

  const handleAmountInputChange = (value: string) => {
    setCommissionAmount(validateAmount(value));
  };

  const handleModalClose = () => {
    setShowUpdateCommissionModal(false);
    setCommissionAmount("");
  };

  // Handle wallet balance update submit
  const handleCommissionUpdateSubmit = async () => {
    if (!id) return;

    const amount = parseFloat(commissionAmount);
    if (!isValidAmount(amount)) {
      toast.error(`Please enter a valid amount (max ₱${getMaxAmount().toLocaleString()})`);
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
      console.error("Failed to update wallet balance:", error);
      toast.error(error.message || "Failed to update wallet");
    } finally {
      setUpdateLoading(false);
    }
  };

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">User ID not provided</p>
      </div>
    );
  }

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
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Wallet Balance Card */}
        <WalletBalanceCard
          balance={balance}
          loading={loading}
          onUpdateClick={handleUpdateCommissionClick}
          formatCurrency={formatCurrency}
        />

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
        <TransactionHistory
          transactions={transactions}
          loading={loading}
          transactionLoading={transactionLoading}
          hasMoreTransactions={hasMoreTransactions}
          loadMoreLoading={loadMoreLoading}
          onLoadMore={loadMoreTransactions}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Update Wallet Balance Modal */}
      <UpdateWalletModal
        isOpen={showUpdateCommissionModal}
        updateMode={updateMode}
        commissionAmount={commissionAmount}
        updateLoading={updateLoading}
        predefinedAmounts={predefinedAmounts}
        onClose={handleModalClose}
        onModeChange={setUpdateMode}
        onAmountChange={setCommissionAmount}
        onAmountInputChange={handleAmountInputChange}
        onSubmit={handleCommissionUpdateSubmit}
      />
    </div>
  );
};

export default UserWalletPage;
