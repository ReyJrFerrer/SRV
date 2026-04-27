import React from "react";
import {
  ClockIcon,
  CalendarDaysIcon,
  MapPinIcon,
  PhotoIcon,
  DocumentCheckIcon,
  AdjustmentsVerticalIcon,
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
  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="w-full max-w-3xl rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50 shadow-sm">
            <ClockIcon className="h-7 w-7 text-yellow-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Review &amp; Submit
          </h2>
          <p className="text-base text-gray-500">
            Please review your service details before submitting.
          </p>
        </div>

        {/* --- Main wrapper: Stacks the top row and bottom row vertically --- */}
        <div className="flex flex-col gap-8">
          {/* --- Top Row: Stacks vertically on mobile, horizontally on desktop --- */}
          <div className="flex flex-col gap-8 md:flex-row">
            {/* Service Name + Category Card */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 md:flex-1">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                  <DocumentCheckIcon className="h-4 w-4 shrink-0 text-yellow-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Service Details
                </h3>
              </div>
              <div className="space-y-1">
                <p className="break-words text-lg font-bold text-gray-900">
                  {formData.serviceOfferingTitle?.trim() ||
                    "(No title provided)"}
                </p>
                <p className="break-words text-sm text-gray-600">
                  Category:{" "}
                  <span className="font-medium text-gray-800">
                    {categories.find((cat) => cat.id === formData.categoryId)
                      ?.name || "Unknown"}
                  </span>
                </p>
              </div>
            </div>

            {/* Location Card: Takes 1/3 of the width on desktop */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 md:flex-1">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                  <MapPinIcon className="h-4 w-4 shrink-0 text-yellow-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Location
                </h3>
              </div>
              <div className="break-words font-medium text-gray-900">
                {[formData.locationMunicipalityCity, formData.locationProvince]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            </div>

            {/* Availability Card: Takes 1/3 of the width on desktop */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 md:flex-1">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                  <CalendarDaysIcon className="h-4 w-4 shrink-0 text-yellow-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Availability
                </h3>
              </div>
              <div className="font-medium text-gray-900">
                {formData.availabilitySchedule.join(", ")}
              </div>
              {formData.availabilitySchedule.length > 0 && (
                <span className="mt-1 block text-xs text-gray-500">
                  {formData.useSameTimeForAllDays
                    ? `Same hours for all days (${formData.commonTimeSlots.length} time slot${formData.commonTimeSlots.length > 1 ? "s" : ""})`
                    : "Custom hours per day"}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                <AdjustmentsVerticalIcon className="h-4 w-4 shrink-0 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-700">Packages</h3>
            </div>
            <div className="space-y-3">
              {formData.servicePackages
                .filter(
                  (pkg: any) =>
                    pkg.name.trim() && pkg.description.trim() && pkg.price,
                )
                .map((pkg: any) => {
                  return (
                    <div
                      key={pkg.id}
                      className="flex flex-col items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-start"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{pkg.name}</p>
                        <p className="mt-1 break-words text-sm text-gray-600">
                          {pkg.description}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-left md:text-right">
                        <p className="text-lg font-bold text-yellow-600">
                          ₱{Number(pkg.price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {(serviceImageFiles.length > 0 || imagePreviews.length > 0) && (
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                <PhotoIcon className="h-4 w-4 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-700">Service Images</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {serviceImageFiles.length > 0
                ? serviceImageFiles.map((file, idx) => (
                    <div
                      key={file.name + idx}
                      className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Service Image ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))
                : imagePreviews.map((previewUrl, idx) => (
                    <div
                      key={previewUrl}
                      className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <img
                        src={previewUrl}
                        alt={`Service Image ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
            </div>
          </div>
        )}

        {(certificationFiles?.length > 0 ||
          certificationPreviews?.length > 0) && (
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                <DocumentCheckIcon className="h-4 w-4 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-700">Certifications</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {certificationFiles && certificationFiles.length > 0
                ? certificationFiles.map((file, idx) => {
                    const isPdf =
                      file.type === "application/pdf" ||
                      file.name.endsWith(".pdf");
                    const src = URL.createObjectURL(file);
                    return (
                      <div
                        key={file.name + idx}
                        className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                      >
                        {isPdf ? (
                          <iframe
                            src={src}
                            title={`Certification PDF ${idx + 1}`}
                            className="h-full w-full rounded bg-gray-100"
                            style={{
                              minHeight: 0,
                              minWidth: 0,
                              border: "none",
                            }}
                          />
                        ) : (
                          <img
                            src={src}
                            alt={`Certification ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    );
                  })
                : certificationPreviews?.map((previewUrl, idx) => (
                    <div
                      key={previewUrl}
                      className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                    >
                      {previewUrl.endsWith(".pdf") ? (
                        <iframe
                          src={previewUrl}
                          title={`Certification PDF ${idx + 1}`}
                          className="h-full w-full rounded bg-gray-100"
                          style={{ minHeight: 0, minWidth: 0, border: "none" }}
                        />
                      ) : (
                        <img
                          src={previewUrl}
                          alt={`Certification ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  ))}
            </div>
          </div>
        )}

        {validationErrors.general && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{validationErrors.general}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSubmit;
