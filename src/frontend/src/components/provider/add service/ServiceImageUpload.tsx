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

const FileInput: React.FC<{
  id: string;
  accept: string;
  multiple: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  files: File[];
  previews: string[];
  buttonText: string;
  buttonClass: string;
  label: string;
  description: string;
}> = ({
  id,
  accept,
  multiple,
  onChange,
  files,
  previews,
  buttonText,
  buttonClass,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    } else {
      setSelectedFiles([]);
    }
    onChange(e);
  };

  const hasFiles =
    files.length > 0 || previews.length > 0 || selectedFiles.length > 0;
  const displayFiles = files.length > 0 ? files : selectedFiles;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium ${buttonClass}`}
        >
          {buttonText}
        </button>
        {hasFiles && (
          <span className="text-sm text-gray-600">
            {displayFiles.length} file{displayFiles.length !== 1 ? "s" : ""}{" "}
            selected
          </span>
        )}
        <input
          type="file"
          ref={fileInputRef}
          id={id}
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
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
      <div className="flex flex-col rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xl font-bold text-blue-700">
            Service Images
          </span>
          <span className="text-xs font-normal text-gray-600">(Optional)</span>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Upload images of your past work. High-quality images help attract more
          clients.
        </p>
        <FileInput
          id="serviceImages"
          accept="image/png, image/jpeg, image/gif"
          multiple={true}
          onChange={onImageFilesChange}
          files={serviceImageFiles}
          previews={imagePreviews}
          buttonText="Choose Service Images"
          buttonClass="bg-blue-100 text-blue-700 hover:bg-blue-200"
          label="Service Images"
          description="Upload images of your past work. High-quality images help attract more clients."
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
                  className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-blue-200 bg-white shadow-md transition hover:shadow-lg"
                >
                  <img
                    src={src}
                    alt={`Service Image ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-2 text-white opacity-90 shadow-md transition hover:bg-red-700 hover:opacity-100"
                    aria-label={`Remove service image ${index + 1}`}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Certifications Section */}
      <div className="flex flex-col rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-yellow-100 p-8 shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xl font-bold text-yellow-700">
            Certifications
          </span>
         <span className="text-xs font-normal text-gray-600">(Optional)</span>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Upload images of your certifications or credentials. This helps build
          trust with clients.
        </p>
        <FileInput
          id="certificationImages"
          accept="image/png, image/jpeg"
          multiple={true}
          onChange={onCertificationFilesChange}
          files={certificationFiles}
          previews={certificationPreviews}
          buttonText="Choose Certification Files"
          buttonClass="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
          label="Certifications"
          description="Upload images of your certifications or credentials. This helps build trust with clients."
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
                  className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-yellow-200 bg-white shadow-md transition hover:shadow-lg"
                >
                  {isPdf ? (
                    <iframe
                      src={src}
                      title={`Certification PDF ${index + 1}`}
                      className="h-full w-full rounded bg-gray-100"
                      style={{ minHeight: 0, minWidth: 0, border: "none" }}
                    />
                  ) : (
                    <img
                      src={src}
                      alt={`Certification ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveCertification &&
                      handleRemoveCertification(index)
                    }
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-2 text-white opacity-90 shadow-md transition hover:bg-red-700 hover:opacity-100"
                    aria-label={`Remove certification ${index + 1}`}
                  >
                    <TrashIcon className="h-5 w-5" />
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
