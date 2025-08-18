import React, { useState } from "react";
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
  onRequestCategory: (categoryName: string) => void;
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
}) => {
  // Local state to control error visibility
  const [hideTitleError, setHideTitleError] = useState(false);
  const [hideCategoryError, setHideCategoryError] = useState(false);
  const [hidePackagesError, setHidePackagesError] = useState(false);

  // Handlers to clear error messages on user action
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHideTitleError(true);
    handleChange(e);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHideCategoryError(true);
    handleChange(e);
  };

  const handlePackageInputChange = (
    index: number,
    field: string,
    value: string | boolean,
  ) => {
    setHidePackagesError(true);
    handlePackageChange(index, field, value);
  };

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Service Details & Category */}
        <section className="flex flex-col justify-between rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-lg">
          <div className="space-y-8">
            {/* Service Title */}
            <section>
              <h2 className="mb-4 text-2xl font-extrabold text-blue-700">
                Service Details <span className="text-red-500">*</span>
              </h2>
              <div className="space-y-2">
                <label
                  htmlFor="serviceOfferingTitle"
                  className="block text-sm font-medium text-blue-900"
                >
                  Service Title
                </label>
                <input
                  type="text"
                  name="serviceOfferingTitle"
                  id="serviceOfferingTitle"
                  value={formData.serviceOfferingTitle}
                  onChange={handleTitleChange}
                  required
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 sm:text-sm ${
                    validationErrors.serviceOfferingTitle && !hideTitleError
                      ? "border-red-300 bg-red-50 focus:border-red-500"
                      : "border-gray-300 bg-gray-50 focus:border-blue-500"
                  }`}
                  placeholder="e.g., Professional Hair Styling"
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
              <h2 className="mb-2 text-lg font-bold text-blue-700">
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
                </select>
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
                {formData.servicePackages.map((pkg, index) => (
                  <div
                    key={pkg.id}
                    className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
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
                          Package Name<span className="text-red-500">*</span>
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
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`pkgPrice-${pkg.id}`}
                          className="block text-xs font-medium text-gray-600"
                        >
                          Price (PHP)<span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id={`pkgPrice-${pkg.id}`}
                          value={pkg.price}
                          onChange={(e) =>
                            handlePackageInputChange(
                              index,
                              "price",
                              e.target.value,
                            )
                          }
                          required
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
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
                          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="Describe what's included in this package."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addPackage}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-blue-500 bg-blue-50 px-4 py-3 text-base font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <PlusCircleIcon className="h-5 w-5" />
                Add Package
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
