import React from "react";
import {
  BriefcaseIcon,
  PlusIcon,
  BanknotesIcon,
  TagIcon,
} from "@heroicons/react/24/solid";
import Tooltip from "../../common/Tooltip";
import { ServicePackage } from "../../../services/serviceCanisterService";

interface Props {
  packages: ServicePackage[];
  isAddingOrEditingPackage: boolean;
  activeBookingsCount: number;
  hasActiveBookings: boolean;
  packageFormTitle: string;
  packageFormDescription: string;
  packageFormPrice: string;
  packageFormLoading: boolean;
  currentPackageId: string | null;
  onAddPackage: () => void;
  onCancelPackageEdit: () => void;
  onSavePackage: () => void;
  onEditPackage: (pkg: ServicePackage) => void;
  onDeletePackage: (id: string) => void;
  setPackageFormTitle: (v: string) => void;
  setPackageFormDescription: (v: string) => void;
  setPackageFormPrice: (v: string) => void;
}

const PackagesSection: React.FC<Props> = ({
  packages,
  isAddingOrEditingPackage,
  activeBookingsCount,
  hasActiveBookings,
  packageFormTitle,
  packageFormDescription,
  packageFormPrice,
  packageFormLoading,
  currentPackageId,
  onAddPackage,
  onCancelPackageEdit,
  onSavePackage,
  onEditPackage,
  onDeletePackage,
  setPackageFormTitle,
  setPackageFormDescription,
  setPackageFormPrice,
}) => {
  const handlePriceInputChange = (value: string) => {
    // Allow only numbers by stripping non-digit characters
    let numericValue = value.replace(/[^0-9]/g, "");

    // Prevent leading zeros, unless the value is "0" itself
    if (numericValue.length > 1 && numericValue.startsWith("0")) {
      numericValue = parseInt(numericValue, 10).toString();
    }

    // Prevent exceeding 1,000,000
    if (parseInt(numericValue, 10) > 1000000) {
      numericValue = "1000000";
    }

    // Handle empty or invalid parsing
    if (numericValue === "NaN") {
      numericValue = "";
    }
    setPackageFormPrice(numericValue);
  };
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-md flex items-center gap-2 font-bold text-blue-800 lg:text-xl">
          <BriefcaseIcon className="h-6 w-6 text-blue-400" />
          Service Packages ({packages.length})
        </h3>
        {!isAddingOrEditingPackage && (
          <Tooltip
            content={
              hasActiveBookings
                ? `Cannot add packages with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`
                : packages.length >= 5
                  ? "Maximum of 5 packages reached."
                  : "Add a new package"
            }
            showWhenDisabled={hasActiveBookings || packages.length >= 5}
          >
            <button
              onClick={
                hasActiveBookings || packages.length >= 5
                  ? undefined
                  : onAddPackage
              }
              className={`inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 ${
                hasActiveBookings || packages.length >= 5
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
              disabled={hasActiveBookings || packages.length >= 5}
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden xl:inline">
                {packages.length >= 5 ? "Limit Reached" : "Add Package"}
              </span>
            </button>
          </Tooltip>
        )}
      </div>

      <div className="space-y-4">
        {isAddingOrEditingPackage && (
          <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 shadow-inner">
            <h4 className="mb-3 text-lg font-semibold text-blue-800">
              {currentPackageId ? "Edit Package" : "Add New Package"}
            </h4>
            {packageFormLoading ? (
              // Skeleton UI when saving package
              <div className="animate-pulse space-y-3">
                <div className="h-10 w-full rounded-lg bg-blue-200/50"></div>
                <div className="h-24 w-full rounded-lg bg-blue-200/50"></div>
                <div className="h-10 w-full rounded-lg bg-blue-200/50"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="packageTitle"
                    className="mb-1 block text-sm font-medium text-blue-700"
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    id="packageTitle"
                    value={packageFormTitle}
                    onChange={(e) => setPackageFormTitle(e.target.value)}
                    className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., Basic Cleaning, Premium Tune-up"
                    required
                    maxLength={40}
                    disabled={packageFormLoading}
                  />
                </div>
                <div>
                  <label
                    htmlFor="packageDescription"
                    className="mb-1 block text-sm font-medium text-blue-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="packageDescription"
                    value={packageFormDescription}
                    onChange={(e) => setPackageFormDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Brief description of what's included in this package"
                    required
                    maxLength={100}
                    disabled={packageFormLoading}
                  ></textarea>
                </div>
                <div>
                  <label
                    htmlFor="packagePrice"
                    className="mb-1 block text-sm font-medium text-blue-700"
                  >
                    Price (₱)
                  </label>
                  <input
                    type="text"
                    id="packagePrice"
                    value={packageFormPrice}
                    onChange={(e) => handlePriceInputChange(e.target.value)}
                    className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., 500.00"
                    required
                    disabled={packageFormLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onCancelPackageEdit}
                    className="w-full rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                    disabled={packageFormLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSavePackage}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    disabled={packageFormLoading}
                  >
                    {packageFormLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    )}
                    {packageFormLoading
                      ? "Saving..."
                      : currentPackageId
                        ? "Update"
                        : "Create Package"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {packages.length > 0 ? (
            packages.map((pkg) => (
              <div
                key={pkg.id}
                className="group relative overflow-visible rounded-2xl border border-blue-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
              >
                {/* Header ribbon */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-blue-50 via-white to-yellow-50" />

                <div className="relative z-10 p-4 pb-3 sm:p-5">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                    <TagIcon className="h-3.5 w-3.5" /> Package
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl">
                        {pkg.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-gray-600 sm:text-sm">
                        {pkg.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <BanknotesIcon className="h-5 w-5 text-blue-500 sm:h-6 sm:w-6" />
                        <span className="text-xl font-extrabold tracking-tight text-blue-700 sm:text-2xl">
                          ₱{pkg.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-500">
                        Base price
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 sm:text-xs">
                      + ₱{pkg.commissionFee.toFixed(2)} commission
                    </span>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700 sm:text-xs">
                      ₱{(pkg.price + pkg.commissionFee).toFixed(2)} total
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                <div className="relative z-10 flex flex-col gap-2 p-3 sm:gap-3 sm:p-4 xl:flex-row">
                  <Tooltip
                    content="Cannot edit when another package form is open."
                    showWhenDisabled={isAddingOrEditingPackage}
                    className="flex-1"
                  >
                    <button
                      onClick={() =>
                        hasActiveBookings ? undefined : onEditPackage(pkg)
                      }
                      className={`flex w-full items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                        hasActiveBookings || isAddingOrEditingPackage
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95"
                      }`}
                      aria-label={`Edit ${pkg.title}`}
                      disabled={hasActiveBookings || isAddingOrEditingPackage}
                    >
                      Edit Package
                    </button>
                  </Tooltip>

                  <Tooltip
                    content="A service must have at least one package."
                    showWhenDisabled={packages.length <= 1}
                    className="flex-1"
                  >
                    <button
                      onClick={() =>
                        hasActiveBookings || packages.length <= 1
                          ? undefined
                          : onDeletePackage(pkg.id)
                      }
                      className={`flex w-full items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                        hasActiveBookings ||
                        isAddingOrEditingPackage ||
                        packages.length <= 1
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : "bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50 active:scale-95"
                      }`}
                      aria-label={`Delete ${pkg.title}`}
                      disabled={
                        hasActiveBookings ||
                        isAddingOrEditingPackage ||
                        packages.length <= 1
                      }
                    >
                      Delete
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))
          ) : !isAddingOrEditingPackage ? (
            <div className="col-span-full">
              <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                  <BriefcaseIcon className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  No packages available
                </h3>
                <p className="mx-auto max-w-md text-gray-600">
                  Packages help customers choose specific service options with
                  different pricing tiers
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default PackagesSection;
