import React from "react";
import {
  CurrencyDollarIcon,
  XCircleIcon,
  CheckCircleIcon,
  WalletIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";

interface CommissionValidation {
  estimatedCommission: number;
  hasInsufficientBalance: boolean;
  commissionValidationMessage?: string;
  totalBalance?: number;
  heldBalance?: number;
  availableBalance?: number;
  loading: boolean;
}

interface Props {
  show: boolean;
  commissionValidation: CommissionValidation;
}

const CommissionInfo: React.FC<Props> = ({ show, commissionValidation }) => {
  if (!show) return null;
  const fmt = (n: number | undefined) => `₱${(n || 0).toFixed(2)}`;
  const remaining =
    (commissionValidation.availableBalance || 0) -
    (commissionValidation.estimatedCommission || 0);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg">
      <h3 className="text-md mb-3 flex items-center gap-2 font-bold text-blue-700 lg:text-lg">
        <WalletIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />
        <span>Wallet & Commission Information</span>
      </h3>
      {commissionValidation.loading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span>Calculating commission...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Compact wallet stats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-medium text-gray-600">
                Total Balance
              </div>
              <div className="mt-1 text-base font-semibold text-gray-900">
                {fmt(commissionValidation.totalBalance)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-medium text-gray-600">
                Held (Reserved)
              </div>
              <div className="mt-1 text-base font-semibold text-amber-700">
                -{fmt(commissionValidation.heldBalance)}
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <div className="text-xs font-medium text-blue-800">Available</div>
              <div className="mt-1 text-base font-bold text-blue-900">
                {fmt(commissionValidation.availableBalance)}
              </div>
            </div>
          </div>

          {/* Required commission row */}
          {commissionValidation.estimatedCommission > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />
              <div className="text-sm text-gray-700">
                Required Commission:{" "}
                <span className="font-semibold text-red-600">
                  {fmt(commissionValidation.estimatedCommission)}
                </span>
              </div>
            </div>
          )}

          {/* Status banner */}
          {commissionValidation.hasInsufficientBalance ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <XCircleIcon className="mt-0.5 h-5 w-5 text-rose-500" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-rose-800">
                  Insufficient Available Balance
                </p>
                {commissionValidation.commissionValidationMessage && (
                  <p className="mt-1 text-rose-700">
                    {commissionValidation.commissionValidationMessage}
                  </p>
                )}
                <p className="mt-1 text-rose-700">
                  Needed:{" "}
                  <span className="font-medium">
                    {fmt(commissionValidation.estimatedCommission)}
                  </span>{" "}
                  · Available:{" "}
                  <span className="font-medium">
                    {fmt(commissionValidation.availableBalance)}
                  </span>
                </p>
                <Link
                  to="/provider/wallet"
                  className="mt-2 inline-flex items-center rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Top up your wallet
                </Link>
              </div>
            </div>
          ) : (
            commissionValidation.estimatedCommission > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 text-green-600" />
                <div className="text-sm">
                  <p className="font-semibold text-green-800">
                    Balance Sufficient
                  </p>
                  <p className="mt-1 text-green-700">
                    Remaining after hold:{" "}
                    <span className="font-medium">{fmt(remaining)}</span>
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    Commission holds when you accept this booking.
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default CommissionInfo;
