import React, { useState, useRef, useEffect } from "react";
import { TrashIcon, PlusCircleIcon } from "@heroicons/react/24/solid";
import { ServiceCategory } from "../../../services/serviceCanisterService";

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
}) => {
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

  // Check if selected category requires client proof images
  const requiresProofKeywords = [
    "repair",
    "technician",
    "gadget",
    "appliance",
    "automobile",
    "mechanic",
    "car",
    "motor",
  ];
  const selectedCategory = categories.find(
    (cat) => cat.id === formData.categoryId,
  );
  const categoryRequiresProof = selectedCategory
    ? requiresProofKeywords.some((keyword) =>
        selectedCategory.name.toLowerCase().includes(keyword),
      )
    : false;

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
        <section className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm">
          {/* Service Title */}
          <div className="bg-yellow-50 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">
              Service Title{" "}
              <span className="font-normal text-gray-500">(Required)</span>
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <label
                htmlFor="serviceOfferingTitle"
                className="block text-sm font-medium text-gray-600"
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
                className={`lg:text-md mt-1 block w-full rounded-xl border px-4 py-3 text-sm shadow-sm transition-all focus:ring-2 focus:ring-yellow-400 ${
                  validationErrors.serviceOfferingTitle && !hideTitleError
                    ? "border-red-300 bg-red-50 focus:border-red-500"
                    : "border-gray-200 bg-gray-50 focus:border-yellow-400"
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
          </div>

          {/* Category */}
          <div className="border-t border-gray-100">
            <div className="bg-yellow-50 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                Category{" "}
                <span className="font-normal text-gray-500">(Required)</span>
              </h2>
            </div>
            <div className="p-6 pt-4">
              <div className="space-y-2">
                <label
                  htmlFor="categoryId"
                  className="block text-sm font-medium text-gray-600"
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
                  className={`block w-full rounded-xl border px-4 py-3 shadow-sm transition-all focus:ring-2 focus:ring-yellow-400 sm:text-sm ${
                    validationErrors.categoryId && !hideCategoryError
                      ? "border-red-300 bg-red-50 focus:border-red-500"
                      : "border-gray-200 bg-gray-50 focus:border-yellow-400"
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
                {categoryRequiresProof && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p>
                      Clients booking this service will be required to upload
                      photos or a short video of the problem when they book.
                    </p>
                  </div>
                )}
                {/* Removed optional custom category input */}
                {/* Request Service Category button - opens Google Form in new tab */}
                <div className="mt-3 flex items-center justify-center">
                  <a
                    href="https://forms.gle/o3KjDDCkcr5KGE2R8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex px-3 py-2 text-sm font-medium text-gray-500 underline hover:text-yellow-600"
                    aria-label="Request Service Category"
                  >
                    Request Service Category
                  </a>
                </div>
                {validationErrors.categoryId && !hideCategoryError && (
                  <p className="text-sm text-red-600">
                    {validationErrors.categoryId}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right: Service Packages */}
        <div>
          <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="bg-yellow-50 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                Service Packages{" "}
                <span className="font-normal text-gray-500">(Required)</span>
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-4 rounded-xl bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-blue-800">
                    At least one package is required to create your service. If
                    your service doesn't have different tiers, simply create one
                    package that describes your complete offering.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
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
                      className={`relative overflow-hidden rounded-xl border-2 bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                        pkgError
                          ? "border-red-200"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                        <span className="text-base font-bold text-gray-800">
                          Package {index + 1}
                        </span>
                        {formData.servicePackages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePackage(pkg.id)}
                            className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                            title="Remove package"
                          >
                            <TrashIcon className="h-4 w-4" />
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
                            className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-all focus:ring-2 focus:ring-yellow-400 ${
                              pkgError &&
                              pkgError.name &&
                              !hidePackageFieldError[pkg.id]?.name
                                ? "border-red-300 bg-white focus:border-red-500"
                                : "border-gray-200 bg-white focus:border-yellow-400"
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
                            Price <span className="text-red-500">*</span>
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
                            className={`mt-1 block w-full rounded-lg border px-3 py-2.5 shadow-sm transition-all focus:ring-2 focus:ring-yellow-400 sm:text-sm ${
                              pkgError &&
                              pkgError.price &&
                              !hidePackageFieldError[pkg.id]?.price
                                ? "border-red-300 bg-white focus:border-red-500"
                                : "border-gray-200 bg-white focus:border-yellow-400"
                            }`}
                          />
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
                            Brief Description
                            <span className="text-red-500">*</span>
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
                            className={`mt-1 block w-full rounded-lg border px-3 py-2.5 shadow-sm transition-all focus:ring-2 focus:ring-yellow-400 sm:text-sm ${
                              pkgError &&
                              pkgError.description &&
                              !hidePackageFieldError[pkg.id]?.description
                                ? "border-red-300 bg-white focus:border-red-500"
                                : "border-gray-200 bg-white focus:border-yellow-400"
                            }`}
                            placeholder="Describe what's included in this package. 150 words maximum"
                            maxLength={150}
                          />
                          {pkgError &&
                            pkgError.description &&
                            !hidePackageFieldError[pkg.id]?.description && (
                              <p className="text-xs text-red-600">
                                {pkgError.description.replace(
                                  "Package 1: ",
                                  "",
                                )}
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
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-semibold transition-all ${
                  formData.servicePackages.length >= 5
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                    : "border-gray-200 bg-white text-gray-600 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
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
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;
