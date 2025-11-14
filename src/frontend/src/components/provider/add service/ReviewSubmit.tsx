import React from "react";

interface Props {
  formData: any;
  categories: any[];
  commissionQuotes: Record<string, any>;
  loadingCommissions: boolean;
  serviceImageFiles: File[];
  imagePreviews: string[];
  certificationFiles: File[];
  certificationPreviews: string[];
  validationErrors: any;
}

const ReviewSubmit: React.FC<Props> = ({
  formData,
  categories,
  commissionQuotes,
  loadingCommissions,
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
            <svg
              className="h-8 w-8 text-blue-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-3xl font-extrabold text-blue-900">
            Review &amp; Submit
          </h2>
          <p className="text-lg text-gray-600">
            Please review your service details before submitting.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M8 9h8M8 13h6" strokeLinecap="round" />
              </svg>
              <h3 className="font-semibold text-gray-800">Service Title</h3>
            </div>
            <p className="break-words text-lg font-semibold text-blue-800">
              {formData.serviceOfferingTitle}
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M7 7a2 2 0 114 0 2 2 0 01-4 0z" />
                <path d="M3 11V7a2 2 0 012-2h4l10 10a2 2 0 010 2.83l-4.17 4.17a2 2 0 01-2.83 0L3 11z" />
              </svg>
              <h3 className="font-semibold text-gray-800">Category</h3>
            </div>
            <p className="break-words text-lg font-semibold text-blue-800">
              {categories.find((cat) => cat.id === formData.categoryId)?.name ||
                "Unknown"}
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M16 3v4M8 3v4M3 7h18" />
              </svg>
              <h3 className="font-semibold text-gray-800">Packages</h3>
            </div>
            <div className="space-y-2">
              {formData.servicePackages
                .filter(
                  (pkg: any) =>
                    pkg.name.trim() && pkg.description.trim() && pkg.price,
                )
                .map((pkg: any) => {
                  const commissionQuote = commissionQuotes[pkg.id];
                  return (
                    <div
                      key={pkg.id}
                      className="flex flex-col break-words rounded border border-gray-400 bg-gray-50 p-3 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-blue-900">{pkg.name}</p>
                        <p className="break-words text-sm text-gray-600">
                          {pkg.description}
                        </p>
                      </div>
                      <div className="mt-2 text-right md:mt-0">
                        <p className="text-lg font-semibold text-green-600">
                          ₱{Number(pkg.price).toLocaleString()}
                        </p>
                        {loadingCommissions && (
                          <p className="text-xs text-gray-500">
                            Loading commission...
                          </p>
                        )}
                        {commissionQuote && (
                          <div className="mt-1 text-base text-gray-600">
                            <p>
                              Commission: ₱
                              {commissionQuote.commissionFee.toLocaleString()}
                            </p>
                            <p className="font-medium text-blue-600">
                              Total: ₱
                              {(
                                Number(pkg.price) +
                                commissionQuote.commissionFee
                              ).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v2M8 3v2M3 9h18" />
              </svg>
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
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 21c-4.418 0-8-4.03-8-9a8 8 0 1116 0c0 4.97-3.582 9-8 9z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <h3 className="font-semibold text-gray-800">Location</h3>
            </div>
            <div className="break-words font-medium text-blue-900">
              {[formData.locationMunicipalityCity, formData.locationProvince]
                .filter(Boolean)
                .join(", ")}
            </div>
          </div>
        </div>

        {(serviceImageFiles.length > 0 || imagePreviews.length > 0) && (
          <div className="mt-10">
            <div className="mb-2 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="12.5" r="1.5" />
                <path d="M21 19l-5.5-7-4.5 6-3-4-4 5" />
              </svg>
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
              <svg
                className="h-5 w-5 text-yellow-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M8.21 13.89l-2.39 2.39a2 2 0 002.83 2.83l2.39-2.39m2.36-2.36l2.39 2.39a2 2 0 002.83-2.83l-2.39-2.39" />
              </svg>
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
