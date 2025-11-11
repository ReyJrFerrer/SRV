import { Transaction } from "../../../frontend/src/services/walletCanisterService";

export interface TransactionDisplay {
  type: string;
  color: string;
  sign: string;
}

/**
 * Get transaction display information
 */
export const getTransactionDisplay = (
  transaction: Transaction,
): TransactionDisplay => {
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

/**
 * Format transaction date based on how recent it is
 */
export const formatTransactionDate = (timestamp: string): string => {
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

/**
 * Group transactions by date
 */
export const groupTransactionsByDate = (
  transactions: Transaction[],
): { [key: string]: Transaction[] } => {
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
