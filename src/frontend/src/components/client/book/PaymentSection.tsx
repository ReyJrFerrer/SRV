import React from "react";
import {
  CurrencyDollarIcon,
  CreditCardIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  WalletIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

export type PaymentSectionProps = {
  paymentMethod: "CashOnHand" | "GCash" | "SRVWallet";
  setPaymentMethod: (method: "CashOnHand" | "GCash" | "SRVWallet") => void;
  packages: {
    id: string;
    title: string;
    description: string;
    price: number;
    commissionFee?: number;
    checked: boolean;
  }[];
  amountPaid: string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  paymentError: string | null;
  totalPrice: number;
  highlight?: boolean;
  isProviderOnboarded?: boolean;
};

const PaymentSection: React.FC<PaymentSectionProps> = ({
  paymentMethod,
  setPaymentMethod,
  packages,
  amountPaid,
  handleAmountChange,
  paymentError,
  totalPrice,
  highlight = false,
  // isProviderOnboarded = false,
}) => (
  <div
    className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${
      highlight
        ? "border-2 border-red-500 ring-2 ring-red-200"
        : "border border-gray-100"
    }`}
  >
    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-900 md:text-xl">
      <span className="mr-2 inline-block h-6 w-2 rounded-full bg-blue-400"></span>
      <CreditCardIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />
      <span>
        Payment Method{" "}
        <span className="ml-1 text-red-600" aria-hidden="true">
          *
        </span>
      </span>
    </h3>
    <div className="space-y-3">
      <div
        onClick={() => setPaymentMethod("CashOnHand")}
        className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
          paymentMethod === "CashOnHand"
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300"
        }`}
      >
        <div className="flex items-center">
          <CurrencyDollarIcon className="mr-3 h-6 w-6 text-green-500" />
          <span className="font-medium text-gray-800">Cash</span>
        </div>
        {paymentMethod === "CashOnHand" && (
          <CheckCircleIcon className="h-6 w-6 text-blue-500" />
        )}
      </div>
      {paymentMethod === "CashOnHand" && packages.some((p) => p.checked) && (
        <div className="pl-4 pt-0">
          <label className="text-sm font-medium text-gray-700">
            Change for how much?
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amountPaid}
            onChange={handleAmountChange}
            placeholder={`e.g., ${totalPrice.toFixed(2)}`}
            className={`mt-1 w-full rounded-md border p-2 ${
              paymentError ? "border-red-500" : "border-gray-300"
            }`}
          />
          {paymentError && amountPaid && (
            <p className="mt-1 flex items-center text-xs text-red-600">
              <ExclamationCircleIcon className="mr-1 h-4 w-4" />
              {paymentError}
            </p>
          )}
        </div>
      )}
      <div
        className={`flex cursor-not-allowed items-center justify-between rounded-lg border p-3 opacity-50`}
      >
        <div className="flex items-center">
          <WalletIcon className="mr-3 h-6 w-6 text-blue-500" />
          <div className="flex flex-col">
            <span className="font-medium text-gray-800">
              E-Wallet (GCash and PayMaya)
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-400">Soon</span>
      </div>
      <div
        className={`flex cursor-not-allowed items-center justify-between rounded-lg border p-3 opacity-50`}
      >
        <div className="flex items-center">
          <img
            src="/logo.svg"
            alt="SRV"
            width={24}
            height={24}
            className="mr-3"
          />
          <span className="font-medium text-gray-800">SRV Wallet</span>
        </div>
        <span className="text-xs text-gray-400">Soon</span>
      </div>
      <div className="flex cursor-not-allowed items-center justify-between rounded-lg border p-3 opacity-50">
        <div className="flex items-center">
          <CreditCardIcon className="mr-3 h-6 w-6 text-gray-400" />
          <span className="font-medium text-gray-500">Debit/Credit Card</span>
        </div>
        <span className="text-xs text-gray-400">Soon</span>
      </div>
      <div className="flex cursor-not-allowed items-center justify-between rounded-lg border p-3 opacity-50">
        <div className="flex items-center">
          <GlobeAltIcon className="mr-3 h-6 w-6 text-gray-400" />
          <span className="font-medium text-gray-500">Web3 Wallet</span>
        </div>
        <span className="text-xs text-gray-400">Soon</span>
      </div>
    </div>
  </div>
);

export default PaymentSection;
