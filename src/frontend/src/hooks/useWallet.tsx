import { useState, useEffect, useCallback } from "react";
import { Principal } from "@dfinity/principal";
import { useAuth } from "../context/AuthContext";
import walletCanisterService, {
  Transaction,
} from "../services/walletCanisterService";

/**
 * Custom hook to manage wallet data, including balance, transactions, and transfers
 */
export const useWallet = () => {
  const { isAuthenticated, identity } = useAuth();

  const [balance, setBalance] = useState<number>(0);
  const [heldBalance, setHeldBalance] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);

  const TRANSACTIONS_PER_PAGE = 10;

  // Firebase functions don't require actor management

  /**
   * Fetch wallet balance
   */
  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated || !identity) {
      setBalance(0);
      setHeldBalance(0);
      setAvailableBalance(0);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const walletDetails = await walletCanisterService.getWalletDetails(
        identity.getPrincipal().toString(),
      );

      setBalance(walletDetails.balance);
      setHeldBalance(walletDetails.heldBalance);
      setAvailableBalance(walletDetails.availableBalance);
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
      setError("Could not load wallet balance.");
      setBalance(0);
      setHeldBalance(0);
      setAvailableBalance(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, identity]);

  /**
   * Fetch transaction history
   */
  const fetchTransactions = useCallback(async () => {
    if (!isAuthenticated || !identity) {
      setAllTransactions([]);
      setDisplayedTransactions([]);
      return;
    }

    try {
      setTransactionLoading(true);
      setError(null);
      const history = await walletCanisterService.getTransactionHistory(
        identity.getPrincipal().toString(),
      );
      // Sort transactions by timestamp (newest first)
      const sortedTransactions = history.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setAllTransactions(sortedTransactions);
      // Show only first 10 transactions
      setDisplayedTransactions(
        sortedTransactions.slice(0, TRANSACTIONS_PER_PAGE),
      );
      setHasMoreTransactions(sortedTransactions.length > TRANSACTIONS_PER_PAGE);
    } catch (err) {
      console.error("Failed to fetch transaction history:", err);
      setError("Could not load transaction history.");
      setAllTransactions([]);
      setDisplayedTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  }, [isAuthenticated, identity]);

  /**
   * Load more transactions
   */
  const loadMoreTransactions = useCallback(async () => {
    if (!hasMoreTransactions || loadMoreLoading) return;

    try {
      setLoadMoreLoading(true);
      const currentCount = displayedTransactions.length;
      const nextBatch = allTransactions.slice(
        currentCount,
        currentCount + TRANSACTIONS_PER_PAGE,
      );

      setDisplayedTransactions((prev) => [...prev, ...nextBatch]);
      setHasMoreTransactions(
        currentCount + TRANSACTIONS_PER_PAGE < allTransactions.length,
      );
    } catch (err) {
      console.error("Failed to load more transactions:", err);
      setError("Could not load more transactions.");
    } finally {
      setLoadMoreLoading(false);
    }
  }, [
    hasMoreTransactions,
    loadMoreLoading,
    displayedTransactions.length,
    allTransactions,
  ]);

  /**
   * Get balance for a specific principal
   */
  const getBalanceOf = useCallback(
    async (principal: Principal): Promise<number> => {
      try {
        return await walletCanisterService.getBalanceOf(principal.toString());
      } catch (err) {
        console.error("Failed to fetch balance for principal:", err);
        throw new Error("Could not load balance for the specified user.");
      }
    },
    [],
  );

  /**
   * Transfer funds to another user
   */
  const transfer = useCallback(
    async (to: Principal, amount: number): Promise<string | null> => {
      if (!isAuthenticated || !identity) {
        throw new Error("Authentication required for transfers");
      }

      if (amount <= 0) {
        throw new Error("Transfer amount must be greater than 0");
      }

      if (amount > balance) {
        throw new Error("Insufficient balance for transfer");
      }

      try {
        setTransferLoading(true);
        setError(null);

        const transactionId = await walletCanisterService.transfer(
          identity.getPrincipal().toString(),
          to.toString(),
          amount,
        );

        // Refresh balance and transactions after successful transfer
        await Promise.all([fetchBalance(), fetchTransactions()]);

        return transactionId;
      } catch (err) {
        console.error("Failed to transfer funds:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Transfer failed";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setTransferLoading(false);
      }
    },
    [isAuthenticated, identity, balance, fetchBalance, fetchTransactions],
  );

  /**
   * Credit funds to a user's wallet
   * This function calls the wallet canister's credit function
   */
  const creditWallet = useCallback(
    async (
      principal: Principal,
      amount: number,
      paymentChannel?: string,
      description?: string,
    ): Promise<number> => {
      if (!isAuthenticated || !identity) {
        throw new Error("Authentication required for crediting wallet");
      }

      if (amount <= 0) {
        throw new Error("Credit amount must be greater than 0");
      }

      try {
        setTransferLoading(true);
        setError(null);

        /**
         *
         */
        const result = await walletCanisterService.creditWallet(
          principal.toString(),
          amount,
          paymentChannel,
          description,
        );

        // Refresh balance and transactions after successful credit
        await Promise.all([fetchBalance(), fetchTransactions()]);

        return result;
      } catch (err) {
        console.error("Failed to credit wallet:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to credit wallet";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setTransferLoading(false);
      }
    },
    [isAuthenticated, identity, fetchBalance, fetchTransactions],
  );

  /**
   * Refresh all wallet data
   */
  const refreshWalletData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBalance(), fetchTransactions()]);
  }, [fetchBalance, fetchTransactions]);

  /**
   * Format currency amount for display
   */
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  /**
   * Get transaction type display text with color
   */
  const getTransactionDisplay = useCallback(
    (transaction: Transaction) => {
      const userPrincipal = identity?.getPrincipal().toString();

      if (!userPrincipal)
        return { type: "Unknown", color: "text-gray-500", sign: "" };

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
          const isOutgoing = transaction.from?.toString() === userPrincipal;
          return {
            type: isOutgoing ? "Sent" : "Received",
            color: isOutgoing ? "text-red-600" : "text-green-600",
            sign: isOutgoing ? "-" : "+",
          };
        default:
          return { type: "Unknown", color: "text-gray-500", sign: "" };
      }
    },
    [identity],
  );

  /**
   * Check if user has sufficient balance for a transaction
   */
  const hasSufficientBalance = useCallback(
    (amount: number): boolean => {
      return availableBalance >= amount;
    },
    [availableBalance],
  );

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated && identity) {
      refreshWalletData();
    } else {
      setBalance(0);
      setHeldBalance(0);
      setAvailableBalance(0);
      setAllTransactions([]);
      setDisplayedTransactions([]);
      setLoading(false);
    }
  }, [isAuthenticated, identity, refreshWalletData]);

  return {
    // State
    balance,
    heldBalance,
    availableBalance,
    transactions: displayedTransactions,
    loading,
    error,
    transferLoading,
    transactionLoading,
    loadMoreLoading,
    hasMoreTransactions,

    // Actions
    fetchBalance,
    fetchTransactions,
    getBalanceOf,
    transfer,
    creditWallet,
    refreshWalletData,
    loadMoreTransactions,

    // Utilities
    formatCurrency,
    getTransactionDisplay,
    hasSufficientBalance,

    // Status
    isAuthenticated,
  };
};

export default useWallet;
