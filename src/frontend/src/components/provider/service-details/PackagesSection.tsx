import React from "react";
import { BriefcaseIcon, PlusIcon } from "@heroicons/react/24/solid";
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
              <span className="hidden lg:inline">
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
                <div className="flex justify-end gap-2">
                  <button
                    onClick={onCancelPackageEdit}
                    className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                    disabled={packageFormLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSavePackage}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    disabled={packageFormLoading}
                  >
                    {packageFormLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    )}
                    {packageFormLoading
                      ? "Saving..."
                      : currentPackageId
                        ? "Update Package"
                        : "Create Package"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-rows-2">
          {packages.length > 0 ? (
            packages.map((pkg) => (
              <div
                key={pkg.id}
                className="group rounded-2xl border border-gray-300 bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-xl"
              >
                <div className="mb-4">
                  <div className="min-w-0">
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
                      {pkg.title}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">
                      {pkg.description}
                    </p>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 text-xl font-bold text-blue-600">
                      ₱{pkg.price.toFixed(2)}
                    </div>
                    <div className="mb-1 text-xs text-gray-500">
                      + ₱{pkg.commissionFee.toFixed(2)} commission
                    </div>
                    <div className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-sm font-semibold text-green-700">
                      ₱{(pkg.price + pkg.commissionFee).toFixed(2)} total
                    </div>
                  </div>
                </div>
                <div className="my-4 border-t border-gray-100"></div>

                <div className="flex flex-col gap-4 lg:flex-row">
                  <Tooltip
                    content="Cannot edit when another package form is open."
                    showWhenDisabled={isAddingOrEditingPackage}
                    className="flex-1"
                  >
                    <button
                      onClick={() =>
                        hasActiveBookings ? undefined : onEditPackage(pkg)
                      }
                      className={`flex w-full items-center justify-center rounded-xl px-4 py-2.5 font-medium whitespace-nowrap transition-all duration-200 ${
                        hasActiveBookings || isAddingOrEditingPackage
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 active:scale-95"
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
                      className={`flex w-full items-center justify-center rounded-xl px-4 py-2.5 font-medium whitespace-nowrap transition-all duration-200 ${
                        hasActiveBookings ||
                        isAddingOrEditingPackage ||
                        packages.length <= 1
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 active:scale-95"
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
