import React, { useRef, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";

interface ServiceImageUploadProps {
  serviceImageFiles: File[];
  imagePreviews: string[];
  handleImageFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: (index: number) => void;
  certificationFiles?: File[];
  certificationPreviews?: string[];
  handleCertificationFilesChange?: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  handleRemoveCertification?: (index: number) => void;
}

const MAX_PDF_SIZE = 450 * 1024; // 450 KB

const UploadZone: React.FC<{
  id: string;
  accept: string;
  multiple: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  files: File[];
  previews: string[];
}> = ({ id, accept, multiple, onChange, files, previews }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const hasFiles = files.length > 0 || previews.length > 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dataTransfer = new DataTransfer();
      Array.from(e.dataTransfer.files).forEach((file) => {
        if (id.includes("service")) {
          if (file.type.startsWith("image/")) {
            dataTransfer.items.add(file);
          }
        } else {
          dataTransfer.items.add(file);
        }
      });
      const nativeInput = fileInputRef.current;
      if (nativeInput) {
        nativeInput.files = dataTransfer.files;
        nativeInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
        isDragging
          ? "border-yellow-400 bg-yellow-50"
          : hasFiles
            ? "border-gray-200 bg-gray-50"
            : "border-gray-200 bg-white hover:border-yellow-300 hover:bg-yellow-50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        id={id}
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        className="hidden"
      />
      <div className="flex flex-col items-center text-center">
        <div
          className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
            hasFiles ? "bg-gray-100" : "bg-yellow-100"
          }`}
        >
          <svg
            className={`h-6 w-6 ${hasFiles ? "text-gray-400" : "text-yellow-600"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="mb-1 text-sm font-medium text-gray-700">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-yellow-600 hover:underline"
          >
            Click to browse
          </button>{" "}
          or drag and drop
        </p>
        <p className="text-xs text-gray-400">
          {id.includes("service")
            ? "PNG, JPG, GIF up to 10MB"
            : "PNG, JPG, PDF up to 450KB"}
        </p>
      </div>
    </div>
  );
};

const ServiceImageUpload: React.FC<ServiceImageUploadProps> = ({
  serviceImageFiles,
  imagePreviews,
  handleImageFilesChange,
  handleRemoveImage,
  certificationFiles = [],
  certificationPreviews = [],
  handleCertificationFilesChange,
  handleRemoveCertification,
}) => {
  // Wrap the handlers to show toast notifications
  const onImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageFilesChange(e);
    if (e.target.files && e.target.files.length > 0) {
      toast.success(`${e.target.files.length} service image(s) selected!`);
    }
  };

  const onCertificationFilesChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      handleCertificationFilesChange?.(e);
      return;
    }

    // Validate PDF size
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        if (file.size > MAX_PDF_SIZE) {
          toast.error(
            `PDF "${file.name}" is too large. Please upload a PDF of 450 KB or less.`,
          );
          // Reset the input so user can select again
          e.target.value = "";
          return;
        }
      }
    }

    handleCertificationFilesChange?.(e);
    toast.success(`${files.length} certification file(s) selected!`);
  };

  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-8">
      {/* Service Images Section */}
      <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            Service Images
          </span>
          <span className="text-xs font-normal text-gray-500">(Optional)</span>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Upload images of your past work. High-quality images help attract more
          clients.
        </p>
        <UploadZone
          id="serviceImages"
          accept="image/png, image/jpeg, image/gif"
          multiple={true}
          onChange={onImageFilesChange}
          files={serviceImageFiles}
          previews={imagePreviews}
        />
        {(serviceImageFiles.length > 0 || imagePreviews.length > 0) && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
            {(serviceImageFiles.length > 0
              ? serviceImageFiles
              : imagePreviews
            ).map((fileOrUrl, index) => {
              const src =
                typeof fileOrUrl === "string"
                  ? fileOrUrl
                  : URL.createObjectURL(fileOrUrl as File);
              return (
                <div
                  key={
                    typeof fileOrUrl === "string"
                      ? fileOrUrl
                      : (fileOrUrl as File).name + index
                  }
                  className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200"
                >
                  <img
                    src={src}
                    alt={`Service Image ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur-sm transition hover:bg-red-500 hover:text-white"
                    aria-label={`Remove service image ${index + 1}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Certifications Section */}
      <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            Certifications
          </span>
          <span className="text-xs font-normal text-gray-500">(Optional)</span>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Upload images of your certifications or credentials. This helps build
          trust with clients.
        </p>
        <UploadZone
          id="certificationImages"
          accept="image/png, image/jpeg,application/pdf"
          multiple={true}
          onChange={onCertificationFilesChange}
          files={certificationFiles}
          previews={certificationPreviews}
        />
        {(certificationFiles.length > 0 ||
          certificationPreviews.length > 0) && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
            {(certificationFiles.length > 0
              ? certificationFiles
              : certificationPreviews
            ).map((fileOrUrl, index) => {
              const isPdf =
                typeof fileOrUrl === "string"
                  ? fileOrUrl.endsWith(".pdf")
                  : (fileOrUrl as File).type === "application/pdf" ||
                    (fileOrUrl as File).name.endsWith(".pdf");
              const src =
                typeof fileOrUrl === "string"
                  ? fileOrUrl
                  : URL.createObjectURL(fileOrUrl as File);
              return (
                <div
                  key={
                    typeof fileOrUrl === "string"
                      ? fileOrUrl
                      : (fileOrUrl as File).name + index
                  }
                  className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200"
                >
                  {isPdf ? (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100">
                      <svg
                        className="h-8 w-8 text-gray-400"
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
                      alt={`Certification ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveCertification &&
                      handleRemoveCertification(index)
                    }
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur-sm transition hover:bg-red-500 hover:text-white"
                    aria-label={`Remove certification ${index + 1}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceImageUpload;
