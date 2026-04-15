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
    className={`scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${
      highlight ? "border-2 border-red-500 ring-2 ring-red-200" : ""
    }`}
  >
    <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
      <CreditCardIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
      <span>
        Payment Method{" "}
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      </span>
    </h3>
    <div className="space-y-3">
      <div
        onClick={() => setPaymentMethod("CashOnHand")}
        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
          paymentMethod === "CashOnHand"
            ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center">
          <CurrencyDollarIcon
            className={`mr-3 h-6 w-6 ${paymentMethod === "CashOnHand" ? "text-blue-600" : "text-green-600"}`}
          />
          <span
            className={`font-medium ${paymentMethod === "CashOnHand" ? "text-blue-900" : "text-gray-900"}`}
          >
            Cash
          </span>
        </div>
        {paymentMethod === "CashOnHand" && (
          <CheckCircleIcon className="h-6 w-6 text-blue-600" />
        )}
      </div>
      {paymentMethod === "CashOnHand" && packages.some((p) => p.checked) && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Change for how much?
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">₱</span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={amountPaid}
              onChange={handleAmountChange}
              placeholder={`${totalPrice.toFixed(2)}`}
              className={`block w-full rounded-lg border py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                paymentError
                  ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 text-gray-900 focus:border-blue-500"
              }`}
            />
          </div>
          {paymentError && amountPaid && (
            <p className="mt-2 flex items-center text-sm text-red-600">
              <ExclamationCircleIcon className="mr-1.5 h-4 w-4" />
              {paymentError}
            </p>
          )}
        </div>
      )}
      <div
        className={`flex cursor-not-allowed items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 opacity-60 transition-colors`}
      >
        <div className="flex items-center">
          <WalletIcon className="mr-3 h-6 w-6 text-blue-400" />
          <div className="flex flex-col">
            <span className="font-medium text-gray-500">
              E-Wallet{" "}
              <span className="hidden sm:inline">(GCash & PayMaya)</span>
            </span>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">
          Soon
        </span>
      </div>
      <div
        className={`flex cursor-not-allowed items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 opacity-60 transition-colors`}
      >
        <div className="flex items-center">
          <img
            src="/logo.svg"
            alt="SRV"
            width={24}
            height={24}
            className="mr-3 opacity-60 grayscale"
          />
          <span className="font-medium text-gray-500">SRV Wallet</span>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">
          Soon
        </span>
      </div>
      <div className="flex cursor-not-allowed items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 opacity-60 transition-colors">
        <div className="flex items-center">
          <CreditCardIcon className="mr-3 h-6 w-6 text-gray-400" />
          <span className="font-medium text-gray-500">Debit/Credit Card</span>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">
          Soon
        </span>
      </div>
      <div className="flex cursor-not-allowed items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 opacity-60 transition-colors">
        <div className="flex items-center">
          <GlobeAltIcon className="mr-3 h-6 w-6 text-gray-400" />
          <span className="font-medium text-gray-500">Web3 Wallet</span>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">
          Soon
        </span>
      </div>
    </div>
  </div>
);

export default PaymentSection;
