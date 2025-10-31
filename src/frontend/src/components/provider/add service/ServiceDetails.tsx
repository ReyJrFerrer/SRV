import React, { useState, useRef, useEffect } from "react";
import { TrashIcon, PlusCircleIcon } from "@heroicons/react/24/solid";
import {
  ServiceCategory,
  CommissionQuote,
} from "../../../services/serviceCanisterService";
import { toast } from "sonner";

// Validation errors interface
interface ValidationErrors {
  serviceOfferingTitle?: string;
  categoryId?: string;
  servicePackages?: string;
  availabilitySchedule?: string;
  timeSlots?: string;
  locationMunicipalityCity?: string;
  general?: string;
  packageFields?: {
    [pkgId: string]: {
      name?: string;
      price?: string;
      description?: string;
    };
  };
}

interface ServiceDetailsProps {
  formData: {
    serviceOfferingTitle: string;
    categoryId: string;
    servicePackages: {
      id: string;
      name: string;
      description: string;
      price: string;
      currency: string;
      isPopular: boolean;
    }[];
  };
  categories: ServiceCategory[];
  loadingCategories: boolean;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  handlePackageChange: (
    index: number,
    field: string,
    value: string | boolean,
  ) => void;
  addPackage: () => void;
  removePackage: (id: string) => void;
  validationErrors?: ValidationErrors;
  scrollToErrorTrigger?: number;
  // Optional helper to compute commission for a given category and price
  // The project provides getCommissionQuote which returns a CommissionQuote
  // so we accept that shape and compute total locally.
  computeCommission?: (
    categoryName: string,
    price: number,
  ) => Promise<{
    commissionFee: number;
  }>;
  // Called when a commission quote is retrieved for a package so parent
  // can persist/use the result (lifting the live value to `commissionQuotes`).
  onCommissionComputed?: (pkgId: string, quote: CommissionQuote) => void;
}

const ServiceDetails: React.FC<ServiceDetailsProps> = ({
  formData,
  categories,
  loadingCategories,
  handleChange,
  handlePackageChange,
  addPackage,
  removePackage,
  validationErrors = {},
  scrollToErrorTrigger,
  computeCommission,
  onCommissionComputed,
}) => {
  // Local live commission map per package id
  const [liveCommission, setLiveCommission] = useState<{
    [pkgId: string]: { commissionFee: number; total: number } | undefined;
  }>({});

  // Debounce timers per package
  const commissionTimers = useRef<{ [pkgId: string]: number | undefined }>({});

  // Loading state for per-package commission fetches
  const [commissionLoading, setCommissionLoading] = useState<{
    [pkgId: string]: boolean | undefined;
  }>({});

  // When the component mounts or when formData changes (for example after
  // restoring a draft), precompute live commission for any packages that
  // already have a price so the UI shows the commission value immediately.
  useEffect(() => {
    let mounted = true;

    const computeInitial = async () => {
      for (const pkg of formData.servicePackages) {
        const pkgId = pkg.id;
        const priceNum = Number(pkg.price) || 0;
        // Only compute when there is a price and we don't already have a value
        if (priceNum > 0 && !liveCommission[pkgId]) {
          if (!mounted) return;
          setCommissionLoading((prev) => ({ ...prev, [pkgId]: true }));
          try {
            const categoryName =
              categories.find((c) => c.id === formData.categoryId)?.name ||
              "Default Category";
            if (computeCommission) {
              const quote = await computeCommission(categoryName, priceNum);
              const fee = (quote as any).commissionFee || 0;
              if (!mounted) return;
              setLiveCommission((prev) => ({
                ...prev,
                [pkgId]: { commissionFee: fee, total: priceNum + fee },
              }));
              if (onCommissionComputed) {
                try {
                  onCommissionComputed(pkgId, quote as CommissionQuote);
                } catch (e) {
                  // ignore
                }
              }
            } else {
              const fee = Math.round(priceNum * 0.05 * 100) / 100;
              if (!mounted) return;
              setLiveCommission((prev) => ({
                ...prev,
                [pkgId]: { commissionFee: fee, total: priceNum + fee },
              }));
              if (onCommissionComputed) {
                try {
                  onCommissionComputed(pkgId, {
                    commissionFee: fee,
                  } as CommissionQuote);
                } catch (e) {}
              }
            }
          } catch (e) {
            // ignore failures here - live commission is best-effort
          } finally {
            if (!mounted) return;
            setCommissionLoading((prev) => ({ ...prev, [pkgId]: false }));
          }
        }
      }
    };

    computeInitial();

    return () => {
      mounted = false;
    };
    // Intentionally include formData.servicePackages and category so this
    // re-runs when the parent restores the draft (which updates formData).
  }, [formData.servicePackages, formData.categoryId, computeCommission]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(commissionTimers.current).forEach((t) => {
        if (t) window.clearTimeout(t);
      });
    };
  }, []);
  // Local state to control error visibility
  const [hideTitleError, setHideTitleError] = useState(false);
  const [hideCategoryError, setHideCategoryError] = useState(false);
  const [hidePackagesError, setHidePackagesError] = useState(false);
  const [hidePackageFieldError, setHidePackageFieldError] = useState<{
    [pkgId: string]: { name?: boolean; price?: boolean; description?: boolean };
  }>({});

  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const packageRefs = useRef<{ [pkgId: string]: HTMLDivElement | null }>({});

  // Scroll to first error field on mobile
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      if (
        validationErrors.packageFields &&
        Object.keys(validationErrors.packageFields).length > 0
      ) {
        const firstPkgId = Object.keys(validationErrors.packageFields)[0];
        const ref = packageRefs.current[firstPkgId];
        if (ref) {
          ref.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [validationErrors.packageFields]);

  // Scroll to first error field on trigger
  useEffect(() => {
    if (!scrollToErrorTrigger) return;

    // Reset all hide error states so errors show after Next is pressed
    setHideTitleError(false);
    setHideCategoryError(false);
    setHidePackagesError(false);
    setHidePackageFieldError({});

    // Scroll to first error field
    if (validationErrors.serviceOfferingTitle && titleRef.current) {
      titleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      titleRef.current.focus();
    } else if (validationErrors.categoryId && categoryRef.current) {
      categoryRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      categoryRef.current.focus();
    } else if (
      validationErrors.packageFields &&
      Object.keys(validationErrors.packageFields).length > 0
    ) {
      const firstPkgId = Object.keys(validationErrors.packageFields)[0];
      const ref = packageRefs.current[firstPkgId];
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
        const inputEl = ref.querySelector(
          "input,textarea",
        ) as HTMLElement | null;
        inputEl?.focus();
      }
    }
  }, [scrollToErrorTrigger, validationErrors]);

  // Reset error visibility when validation errors change
  useEffect(() => {
    if (validationErrors.serviceOfferingTitle) {
      setHideTitleError(false);
    }
    if (validationErrors.categoryId) {
      setHideCategoryError(false);
    }
    if (validationErrors.servicePackages) {
      setHidePackagesError(false);
    }
  }, [validationErrors]);

  // Handlers to clear error messages on user action
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHideTitleError(true);
    handleChange(e);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHideCategoryError(true);
    handleChange(e);
  };

  // (Custom/"Other" categories have been removed.)

  // Modify the handlePackageInputChange function
  const handlePackageInputChange = (
    index: number,
    field: string,
    value: string | boolean,
  ) => {
    const pkgId = formData.servicePackages[index].id;
    setHidePackagesError(true);
    setHidePackageFieldError((prev) => ({
      ...prev,
      [pkgId]: { ...prev[pkgId], [field]: true },
    }));
    handlePackageChange(index, field, value);
    // If the price field changed, kick off live commission calculation
    if (field === "price") {
      const pkg = formData.servicePackages[index];
      const pkgId = pkg.id;
      // clear existing timer
      if (commissionTimers.current[pkgId]) {
        window.clearTimeout(commissionTimers.current[pkgId]);
      }
      // schedule debounce
      commissionTimers.current[pkgId] = window.setTimeout(async () => {
        // indicate loading for this package
        setCommissionLoading((prev) => ({ ...prev, [pkgId]: true }));
        try {
          const priceNum = Number(String(value).replace(/[^0-9]/g, "")) || 0;
          const categoryName =
            categories.find((c) => c.id === formData.categoryId)?.name ||
            "Default Category";
          if (computeCommission) {
            const quote = await computeCommission(categoryName, priceNum);
            const fee = quote.commissionFee;
            setLiveCommission((prev) => ({
              ...prev,
              [pkgId]: { commissionFee: fee, total: priceNum + fee },
            }));
            // lift to parent if requested
            if (onCommissionComputed) {
              try {
                // treat returned shape as CommissionQuote when possible
                onCommissionComputed(
                  pkgId,
                  quote as unknown as CommissionQuote,
                );
              } catch (e) {
                // ignore lifting errors
              }
            }
          } else {
            // Fallback: simple percentage (5%)
            const fee = Math.round(priceNum * 0.05 * 100) / 100;
            setLiveCommission((prev) => ({
              ...prev,
              [pkgId]: { commissionFee: fee, total: priceNum + fee },
            }));
            if (onCommissionComputed) {
              try {
                onCommissionComputed(pkgId, {
                  commissionFee: fee,
                } as CommissionQuote);
              } catch (e) {}
            }
          }
        } catch (e) {
          // show a subtle toast on failure
          toast.error("Failed to fetch commission quote");
        }
        // clear loading flag
        setCommissionLoading((prev) => ({ ...prev, [pkgId]: false }));
      }, 400);
    }
  };

  // Modify the handlePackageInputChange function
  const handlePriceChange = (index: number, value: string) => {
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

    if (numericValue === "NaN") {
      numericValue = "";
    }
    handlePackageInputChange(index, "price", numericValue);
  };

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Service Details & Category */}
        <section className="flex flex-col justify-between rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-lg">
          <div className="space-y-8">
            {/* Service Title */}
            <section>
              <h2 className="mb-2 text-xl font-bold text-blue-700">
                Service Title <span className="text-red-500">*</span>
              </h2>
              <div className="space-y-2">
                <label
                  htmlFor="serviceOfferingTitle"
                  className="block text-sm font-medium text-blue-900"
                >
                  Place a title for your service
                </label>
                <input
                  type="text"
                  name="serviceOfferingTitle"
                  id="serviceOfferingTitle"
                  value={formData.serviceOfferingTitle}
                  onChange={handleTitleChange}
                  required
                  ref={titleRef}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 sm:text-sm ${
                    validationErrors.serviceOfferingTitle && !hideTitleError
                      ? "border-red-300 bg-red-50 focus:border-red-500"
                      : "border-gray-300 bg-gray-50 focus:border-blue-500"
                  }`}
                  placeholder="e.g., Professional Hair Styling"
                  maxLength={40}
                />
                {validationErrors.serviceOfferingTitle && !hideTitleError && (
                  <p className="text-sm text-red-600">
                    {validationErrors.serviceOfferingTitle}
                  </p>
                )}
              </div>
            </section>

            {/* Category */}
            <section>
              <h2 className="mb-2 text-xl font-bold text-blue-700">
                Category <span className="text-red-500">*</span>
              </h2>
              <div className="space-y-2">
                <label
                  htmlFor="categoryId"
                  className="block text-sm font-medium text-blue-900"
                >
                  Select Category
                </label>
                <select
                  name="categoryId"
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                  required
                  ref={categoryRef}
                  className={`block w-full rounded-lg border px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 sm:text-sm ${
                    validationErrors.categoryId && !hideCategoryError
                      ? "border-red-300 bg-red-50 focus:border-red-500"
                      : "border-gray-300 bg-gray-50 focus:border-blue-500"
                  }`}
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {loadingCategories ? (
                    <option disabled>Loading categories...</option>
                  ) : (
                    categories
                      .filter((cat) => !cat.parentId)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))
                  )}
                  {/* 'Other' custom category removed */}
                </select>
                {/* Removed optional custom category input */}
                {validationErrors.categoryId && !hideCategoryError && (
                  <p className="text-sm text-red-600">
                    {validationErrors.categoryId}
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>

        {/* Right: Service Packages */}
        <div>
          <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-blue-700">
              Service Packages <span className="text-red-500">*</span>
            </h2>
            <fieldset>
              <div className="space-y-6">
                {formData.servicePackages.map((pkg, index) => {
                  const pkgError =
                    validationErrors.packageFields &&
                    validationErrors.packageFields[pkg.id];
                  return (
                    <div
                      key={pkg.id}
                      ref={(el) => {
                        packageRefs.current[pkg.id] = el;
                      }}
                      className={`relative rounded-xl border bg-white p-6 shadow-md transition-shadow hover:shadow-lg ${
                        pkgError ? "border-red-400" : "border-gray-200"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-lg font-bold text-blue-800">
                          Package {index + 1}
                        </h4>
                        {formData.servicePackages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePackage(pkg.id)}
                            className="rounded-full bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                            title="Remove package"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`pkgName-${pkg.id}`}
                            className="block text-xs font-medium text-gray-600"
                          >
                            Name<span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id={`pkgName-${pkg.id}`}
                            value={pkg.name}
                            onChange={(e) =>
                              handlePackageInputChange(
                                index,
                                "name",
                                e.target.value,
                              )
                            }
                            required
                            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 sm:text-sm ${
                              pkgError &&
                              pkgError.name &&
                              !hidePackageFieldError[pkg.id]?.name
                                ? "border-red-400 bg-red-50 focus:border-red-500"
                                : "border-gray-300 bg-gray-50 focus:border-blue-500"
                            }`}
                            maxLength={40}
                          />
                          {pkgError &&
                            pkgError.name &&
                            !hidePackageFieldError[pkg.id]?.name && (
                              <p className="text-xs text-red-600">
                                {pkgError.name}
                              </p>
                            )}
                        </div>
                        <div>
                          <label
                            htmlFor={`pkgPrice-${pkg.id}`}
                            className="block text-xs font-medium text-gray-600"
                          >
                            Price (PHP) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text" // Changed from "number" to "text" for stricter control
                            id={`pkgPrice-${pkg.id}`}
                            value={pkg.price}
                            onChange={(e) =>
                              handlePriceChange(index, e.target.value)
                            }
                            required
                            min="0"
                            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 sm:text-sm ${
                              pkgError &&
                              pkgError.price &&
                              !hidePackageFieldError[pkg.id]?.price
                                ? "border-red-400 bg-red-50 focus:border-red-500"
                                : "border-gray-300 bg-gray-50 focus:border-blue-500"
                            }`}
                          />
                          {/* Live commission display or loading state */}
                          {commissionLoading[pkg.id] ? (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                              <span>Calculating…</span>
                            </div>
                          ) : (
                            liveCommission[pkg.id] && (
                              <div className="mt-2 text-sm text-green-600">
                                <div className="flex flex-col">
                                  <span className="mb-1">
                                    Commission: ₱
                                    {liveCommission[
                                      pkg.id
                                    ]!.commissionFee.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                  <span className="font-semibold">
                                    Total: ₱
                                    {liveCommission[
                                      pkg.id
                                    ]!.total.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                          {pkgError &&
                            pkgError.price &&
                            !hidePackageFieldError[pkg.id]?.price && (
                              <p className="text-xs text-red-600">
                                {pkgError.price}
                              </p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                          <label
                            htmlFor={`pkgDesc-${pkg.id}`}
                            className="block text-xs font-medium text-gray-600"
                          >
                            Description<span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id={`pkgDesc-${pkg.id}`}
                            value={pkg.description}
                            onChange={(e) =>
                              handlePackageInputChange(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                            rows={3}
                            required
                            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 sm:text-sm ${
                              pkgError &&
                              pkgError.description &&
                              !hidePackageFieldError[pkg.id]?.description
                                ? "border-red-400 bg-red-50 focus:border-red-500"
                                : "border-gray-300 bg-gray-50 focus:border-blue-500"
                            }`}
                            placeholder="Describe what's included in this package."
                            maxLength={100}
                          />
                          {pkgError &&
                            pkgError.description &&
                            !hidePackageFieldError[pkg.id]?.description && (
                              <p className="text-xs text-red-600">
                                {pkgError.description}
                              </p>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={
                  formData.servicePackages.length < 5 ? addPackage : undefined
                }
                disabled={formData.servicePackages.length >= 5}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-base font-semibold transition-colors ${
                  formData.servicePackages.length >= 5
                    ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500"
                    : "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                <PlusCircleIcon className="h-5 w-5" />
                {formData.servicePackages.length >= 5
                  ? "Maximum 5 packages"
                  : "Add Package"}
              </button>
              {validationErrors.servicePackages && !hidePackagesError && (
                <p className="mt-2 text-sm text-red-600">
                  {validationErrors.servicePackages}
                </p>
              )}
            </fieldset>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;
