import React from "react";
import {
  CurrencyDollarIcon,
  XCircleIcon,
  CheckCircleIcon,
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
  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg">
      <h3 className="text-md mb-3 font-bold text-blue-700 lg:text-lg">
        Wallet & Commission Information
      </h3>
      {commissionValidation.loading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span>Calculating commission...</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <h4 className="mb-2 text-sm font-semibold text-blue-800">
              Wallet Balance Breakdown
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Total Balance:</span>
                <span className="font-semibold text-gray-900">
                  ₱{(commissionValidation.totalBalance || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Held (Reserved):</span>
                <span className="font-semibold text-yellow-700">
                  -₱{(commissionValidation.heldBalance || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-blue-200 pt-1">
                <span className="font-medium text-blue-900">
                  Available Balance:
                </span>
                <span className="font-bold text-blue-900">
                  ₱{(commissionValidation.availableBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {commissionValidation.estimatedCommission > 0 && (
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-gray-700">
                Required Commission:{" "}
                <span className="font-semibold text-red-600">
                  ₱{commissionValidation.estimatedCommission.toFixed(2)}
                </span>
              </span>
            </div>
          )}

          {commissionValidation.hasInsufficientBalance ? (
            <div className="rounded-lg bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <XCircleIcon className="mt-0.5 h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">
                    Insufficient Available Balance
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    {commissionValidation.commissionValidationMessage}
                  </p>
                  <p className="mt-2 text-sm text-red-600">
                    You need ₱
                    {commissionValidation.estimatedCommission.toFixed(2)} but
                    only have ₱
                    {(commissionValidation.availableBalance || 0).toFixed(2)}{" "}
                    available.
                  </p>
                  <Link
                    to="/provider/wallet"
                    className="mt-2 inline-flex items-center text-sm font-medium text-red-600 underline hover:text-red-800"
                  >
                    Top up your wallet →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            commissionValidation.estimatedCommission > 0 && (
              <div className="rounded-lg bg-green-50 p-3">
                <div className="flex items-start gap-2">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800">
                      Available Balance Sufficient
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      ₱{(commissionValidation.availableBalance || 0).toFixed(2)}{" "}
                      - ₱{commissionValidation.estimatedCommission.toFixed(2)} =
                      ₱
                      {(
                        (commissionValidation.availableBalance || 0) -
                        commissionValidation.estimatedCommission
                      ).toFixed(2)}{" "}
                      remaining
                    </p>
                    <p className="mt-1 text-xs text-green-600">
                      Commission will be held when you accept this booking.
                    </p>
                  </div>
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
