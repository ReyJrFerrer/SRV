import React from "react";
import { BanknotesIcon, PlusIcon } from "@heroicons/react/24/outline";

interface WalletBalanceCardProps {
  balance: number;
  loading: boolean;
  onUpdateClick: () => void;
  formatCurrency: (amount: number) => string;
}

const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({
  balance,
  loading,
  onUpdateClick,
  formatCurrency,
}) => {
  return (
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
          onClick={onUpdateClick}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/20 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"
        >
          <PlusIcon className="h-4 w-4" />
          Update Wallet Balance
        </button>
      </div>
    </div>
  );
};

export default WalletBalanceCard;
