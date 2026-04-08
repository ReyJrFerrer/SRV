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
      <div className="w-full max-w-3xl rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-10 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 shadow">
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="mb-2 text-3xl font-extrabold text-blue-900">
            Review &amp; Submit
          </h2>
          <p className="text-lg text-gray-600">
            Please review your service details before submitting.
          </p>
        </div>

        {/* --- Main wrapper: Stacks the top row and bottom row vertically --- */}
        <div className="flex flex-col gap-8">
          {/* --- Top Row: Stacks vertically on mobile, horizontally on desktop --- */}
          <div className="flex flex-col gap-8 md:flex-row">
            {/* Service Name + Category Card */}
            <div className="rounded-lg bg-white p-5 shadow-sm md:flex-1">
              <div className="mb-2 flex items-start gap-2">
                <DocumentCheckIcon className="h-5 w-5 shrink-0 text-blue-400" />
                <h3 className="font-semibold text-gray-800">
                  Service Name & Category
                </h3>
              </div>
              <div className="space-y-1">
                <p className="break-words text-xl font-bold text-blue-900">
                  {formData.serviceOfferingTitle?.trim() ||
                    "(No title provided)"}
                </p>
                <p className="break-words text-sm text-gray-700">
                  Category:{" "}
                  <span className="font-semibold text-blue-800">
                    {categories.find((cat) => cat.id === formData.categoryId)
                      ?.name || "Unknown"}
                  </span>
                </p>
              </div>
            </div>

            {/* Location Card: Takes 1/3 of the width on desktop */}
            <div className="rounded-lg bg-white p-5 shadow-sm md:flex-1">
              <div className="mb-4 flex items-start gap-2">
                <MapPinIcon className="h-5 w-5 shrink-0 text-blue-400" />
                <h3 className="font-semibold text-gray-800">Location</h3>
              </div>
              <div className="break-words font-medium text-blue-900">
                {[formData.locationMunicipalityCity, formData.locationProvince]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            </div>

            {/* Availability Card: Takes 1/3 of the width on desktop */}
            <div className="rounded-lg bg-white p-5 shadow-sm md:flex-1">
              <div className="mb-4 flex items-start gap-2">
                <CalendarDaysIcon className="h-5 w-5 shrink-0 text-blue-400" />
                <h3 className="font-semibold text-gray-800">Availability</h3>
              </div>
              <div className="font-medium text-blue-900">
                {formData.availabilitySchedule.join(", ")}
              </div>
              {formData.availabilitySchedule.length > 0 && (
                <span className="mt-1 block text-sm text-gray-500">
                  {formData.useSameTimeForAllDays
                    ? `Same hours for all days (${formData.commonTimeSlots.length} time slot${formData.commonTimeSlots.length > 1 ? "s" : ""})`
                    : "Custom hours per day"}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-2">
              <CalendarDaysIcon className="h-5 w-5 shrink-0 text-blue-400" />
              <h3 className="font-semibold text-gray-800">Packages</h3>
            </div>
            <div className="space-y-2">
              {formData.servicePackages
                .filter(
                  (pkg: any) =>
                    pkg.name.trim() && pkg.description.trim() && pkg.price,
                )
                .map((pkg: any) => {
                  return (
                    <div
                      key={pkg.id}
                      className="flex flex-col items-start justify-between gap-2 rounded border border-blue-400 bg-blue-50 p-3 md:flex-row md:items-start md:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-blue-900">{pkg.name}</p>
                        <p className="break-words text-sm text-gray-600">
                          {pkg.description}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-left md:text-right">
                        <p className="text-lg font-semibold text-green-600">
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
          <div className="mt-10">
            <div className="mb-2 flex items-center gap-2">
              <PhotoIcon className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-gray-800">Service Images</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {serviceImageFiles.length > 0
                ? serviceImageFiles.map((file, idx) => (
                    <div
                      key={file.name + idx}
                      className="flex aspect-square items-center justify-center overflow-hidden rounded border border-gray-200 bg-white"
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
                      className="flex aspect-square items-center justify-center overflow-hidden rounded border border-gray-200 bg-white"
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
          <div className="mt-10">
            <div className="mb-2 flex items-center gap-2">
              <AdjustmentsVerticalIcon className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-yellow-700">Certifications</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {certificationFiles && certificationFiles.length > 0
                ? certificationFiles.map((file, idx) => {
                    const isPdf =
                      file.type === "application/pdf" ||
                      file.name.endsWith(".pdf");
                    const src = URL.createObjectURL(file);
                    return (
                      <div
                        key={file.name + idx}
                        className="flex aspect-square items-center justify-center overflow-hidden rounded border border-yellow-200 bg-white"
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
                      className="flex aspect-square items-center justify-center overflow-hidden rounded border border-yellow-200 bg-white"
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
