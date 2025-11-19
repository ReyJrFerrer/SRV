import React, { useState } from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { CurrencyDollarIcon } from "@heroicons/react/24/solid";
import { Transaction } from "../../../../frontend/src/services/walletCanisterService";
import {
  getTransactionDisplay,
  formatTransactionDate,
  groupTransactionsByDate,
} from "../../utils/transactionHistoryUtils";

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading: boolean;
  transactionLoading: boolean;
  hasMoreTransactions: boolean;
  loadMoreLoading: boolean;
  onLoadMore: () => void;
  formatCurrency: (amount: number) => string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  loading,
  transactionLoading,
  hasMoreTransactions,
  loadMoreLoading,
  onLoadMore,
  formatCurrency,
}) => {
  const [showRunningBalance, setShowRunningBalance] = useState(false);

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

  const transactionGroups = groupTransactionsByDate(transactions);

  return (
    <>
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
                              {transaction.transaction_type === "Transfer" && (
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
            onClick={onLoadMore}
            disabled={loadMoreLoading}
            className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-blue-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {loadMoreLoading ? "Loading..." : "Load More Transactions"}
          </button>
        </div>
      )}
    </>
  );
};

export default TransactionHistory;
