import React from "react";
import {
  ClockIcon,
  MapPinIcon,
  PhotoIcon,
  DocumentCheckIcon,
  AdjustmentsVerticalIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";

interface Props {
  formData: any;
  categories: any[];
  serviceImageFiles: File[];
  imagePreviews: string[];
  certificationFiles: File[];
  certificationPreviews: string[];
  validationErrors: any;
}

const ReviewSubmit: React.FC<Props> = ({
  formData,
  categories,
  serviceImageFiles,
  imagePreviews,
  certificationFiles,
  certificationPreviews,
  validationErrors,
}) => {
  const selectedCategory = categories.find(
    (cat) => cat.id === formData.categoryId,
  );

  const validPackages = formData.servicePackages.filter(
    (pkg: any) => pkg.name.trim() && pkg.description.trim() && pkg.price,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 shadow-md">
          <ClockIcon className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>
        <p className="mt-1 text-gray-500">
          Check your details before publishing
        </p>
      </div>

      {/* Service Overview Card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-200">
        <div className="bg-yellow-50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <DocumentCheckIcon className="h-5 w-5 text-yellow-600" />
            Service Overview
          </h3>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <p className="text-2xl font-bold text-gray-900">
              {formData.serviceOfferingTitle?.trim() || "(No title provided)"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Category:{" "}
              <span className="font-medium text-gray-700">
                {selectedCategory?.name || "Unknown"}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <MapPinIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Location
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {[
                    formData.locationMunicipalityCity,
                    formData.locationProvince,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not set"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <CalendarDaysIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Availability
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {formData.availabilitySchedule.length > 0
                    ? formData.availabilitySchedule.join(", ")
                    : "None selected"}
                </p>
                {formData.availabilitySchedule.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {formData.useSameTimeForAllDays
                      ? `${formData.commonTimeSlots.length} time slot${formData.commonTimeSlots.length > 1 ? "s" : ""}`
                      : "Custom hours"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <AdjustmentsVerticalIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Packages
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {validPackages.length} package
                  {validPackages.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-500">
                  From ₱
                  {Math.min(
                    ...validPackages.map((p: any) => Number(p.price) || 0),
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Packages Card */}
      {validPackages.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-200">
          <div className="bg-yellow-50 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <AdjustmentsVerticalIcon className="h-5 w-5 text-yellow-600" />
              Packages
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {validPackages.map((pkg: any) => (
              <div
                key={pkg.id}
                className="flex items-start justify-between p-6"
              >
                <div className="flex-1 pr-4">
                  <p className="text-base font-semibold text-gray-900">
                    {pkg.name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {pkg.description}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xl font-bold text-yellow-600">
                    ₱{Number(pkg.price).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Images */}
      {(serviceImageFiles.length > 0 || imagePreviews.length > 0) && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-200">
          <div className="bg-yellow-50 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <PhotoIcon className="h-5 w-5 text-yellow-600" />
              Service Images
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {(serviceImageFiles.length > 0
                ? serviceImageFiles
                : imagePreviews
              ).map((item, idx) => {
                const src =
                  typeof item === "string"
                    ? item
                    : URL.createObjectURL(item as File);
                return (
                  <div
                    key={idx}
                    className="aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200"
                  >
                    <img
                      src={src}
                      alt={`Service Image ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Certifications */}
      {(certificationFiles?.length > 0 ||
        certificationPreviews?.length > 0) && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-200">
          <div className="bg-yellow-50 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <DocumentCheckIcon className="h-5 w-5 text-yellow-600" />
              Certifications
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {(certificationFiles?.length > 0
                ? certificationFiles
                : certificationPreviews || []
              ).map((item, idx) => {
                const isPdf =
                  typeof item === "string"
                    ? item.endsWith(".pdf")
                    : (item as File).name.endsWith(".pdf");
                const src =
                  typeof item === "string"
                    ? item
                    : URL.createObjectURL(item as File);
                return (
                  <div
                    key={idx}
                    className="aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200"
                  >
                    {isPdf ? (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100">
                        <svg
                          className="h-12 w-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <img
                        src={src}
                        alt={`Certification ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {validationErrors.general && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{validationErrors.general}</p>
        </div>
      )}
    </div>
  );
};

export default ReviewSubmit;
