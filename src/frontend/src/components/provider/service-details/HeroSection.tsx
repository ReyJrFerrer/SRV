import React from "react";
import { ArrowLeftIcon, PencilIcon, TagIcon } from "@heroicons/react/24/solid";
import Tooltip from "./Tooltip";
import ViewReviewsButton from "../../../components/common/ViewReviewsButton";

interface Props {
  onBack: () => void;
  service: any;
  serviceImages: Array<{ dataUrl?: string | null }> | undefined;
  hasActiveBookings: boolean;
  activeBookingsCount: number;
  editTitleCategory: boolean;
  editedTitle: string;
  editedCategory: string;
  categories: Array<{ id: string; name: string }>;
  categoriesLoading: boolean;
  savingTitleCategory: boolean;
  setEditedTitle: (v: string) => void;
  setEditedCategory: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const HeroSection: React.FC<Props> = ({
  onBack,
  service,
  serviceImages,
  hasActiveBookings,
  activeBookingsCount,
  editTitleCategory,
  editedTitle,
  editedCategory,
  categories,
  categoriesLoading,
  savingTitleCategory,
  setEditedTitle,
  setEditedCategory,
  onEdit,
  onSave,
  onCancel,
}) => {
  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 shadow-md backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-8">
          <button
            onClick={onBack}
            className="rounded-full p-2 transition-colors hover:bg-blue-100"
            aria-label="Go to home"
          >
            <ArrowLeftIcon className="h-6 w-6 text-blue-600" />
          </button>
          <h1 className="text-2xl font-bold text-black">Service Details</h1>
          <div className="w-8"></div>
        </div>
      </header>

      <section className="relative mt-8 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-100 via-white to-gray-50 shadow-xl">
        <div className="relative flex h-56 w-full items-center justify-center bg-gradient-to-r from-blue-200 via-blue-100 to-white">
          {serviceImages &&
          serviceImages.length > 0 &&
          serviceImages[0].dataUrl ? (
            <img
              src={serviceImages[0].dataUrl}
              alt="Service Hero"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
            />
          ) : service.category?.slug ? (
            <img
              src={`/images/ai-sp/${service.category?.slug || "default-provider"}.svg`}
              alt={service.category.name}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
            />
          ) : (
            <img
              src={`/images/ai-sp/${service.category?.slug || "default-provider"}.svg`}
              alt={service.category?.name || "Category"}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
              onError={(e) =>
                ((e.target as HTMLImageElement).src =
                  "/images/ai-sp/default.jpg")
              }
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent"></div>
        </div>
        <div className="relative z-10 flex flex-col gap-6 px-8 py-8 md:flex-row md:items-center md:gap-10 md:py-10">
          {savingTitleCategory ? (
            // Skeleton UI when saving
            <div className="min-w-0 flex-1 animate-pulse">
              <div className="mb-4 h-8 w-3/4 rounded-lg bg-blue-200/50"></div>
              <div className="h-6 w-1/2 rounded-lg bg-blue-200/50"></div>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <div className="mb-2 block md:hidden">
              <div className="flex flex-col items-start gap-1">
                <div className="flex w-full flex-wrap items-center gap-2">
                  <h2
                    className="flex-1 break-words text-xl font-bold text-blue-900 drop-shadow-sm"
                    title={service.title}
                    style={{ wordBreak: "break-word" }}
                  >
                    {service.title}
                  </h2>
                  {service.status === "Available" && (
                    <span
                      className="inline-block h-3 w-3 rounded-full bg-green-500"
                      title="Available"
                    ></span>
                  )}
                  <Tooltip
                    content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                    disabled={hasActiveBookings}
                  >
                    <button
                      onClick={hasActiveBookings ? undefined : onEdit}
                      className={`rounded-full p-2 transition-colors hover:bg-blue-100 ${hasActiveBookings ? "cursor-not-allowed opacity-50" : ""}`}
                      aria-label="Edit title and category"
                      disabled={hasActiveBookings}
                    >
                      <PencilIcon className="h-5 w-5 text-blue-500" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
            <div className="mb-2 hidden items-center gap-2 md:flex">
              <h2
                className="truncate text-3xl font-extrabold text-blue-900 drop-shadow-sm"
                title={service.title}
              >
                {service.title}
              </h2>
              <span
                className={`ml-2 rounded-full px-3 py-1 text-xs font-semibold ${service.status === "Available" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                title={
                  service.status === "Available"
                    ? "Service is available"
                    : "Service is unavailable"
                }
              >
                {service.status === "Available" ? "Available" : "Unavailable"}
              </span>
              <Tooltip
                content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
                disabled={hasActiveBookings}
              >
                <button
                  onClick={hasActiveBookings ? undefined : onEdit}
                  className={`rounded-full p-2 transition-colors hover:bg-blue-100 ${hasActiveBookings ? "cursor-not-allowed opacity-50" : ""}`}
                  aria-label="Edit title and category"
                  disabled={hasActiveBookings}
                >
                  <PencilIcon className="h-5 w-5 text-blue-500" />
                </button>
              </Tooltip>
            </div>
            <div className="mt-2 flex items-center gap-2 text-lg font-medium text-blue-700">
              <TagIcon className="h-5 w-5 text-blue-400" />
              {service.category.name}
            </div>
            {editTitleCategory && (
              <div className="mt-4 flex flex-col gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full rounded-lg border border-blue-200 bg-white/80 px-4 py-2 text-2xl font-bold text-blue-900 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Service Title"
                />
                <select
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}
                  className="w-full rounded-lg border border-blue-200 bg-white/80 px-4 py-2 text-base text-blue-700 focus:border-blue-500 focus:ring-blue-500"
                  disabled={categoriesLoading}
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories..."
                      : "Select Category"}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={onSave}
                    className="rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Save title and category"
                    disabled={savingTitleCategory}
                  >
                    {savingTitleCategory ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      "✓"
                    )}
                  </button>
                  <button
                    onClick={onCancel}
                    className="rounded-full bg-gray-200 p-2 text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Cancel editing title and category"
                    disabled={savingTitleCategory}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            </div>
          )}
          <div className="flex min-w-[180px] flex-col items-center justify-center gap-2">
            <ViewReviewsButton
              serviceId={service.id}
              averageRating={service.averageRating!}
              totalReviews={service.totalReviews!}
              variant="card"
              className="mt-1"
            />
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
