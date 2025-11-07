import React from "react";
import { TagIcon, StarIcon, CameraIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";

interface ServiceHeroCardProps {
  service: {
    id: string;
    title: string;
    category: string;
    status: string;
    rating?: number;
    reviewCount?: number;
  };
  heroImageUrl?: string | null;
  isLoadingImages: boolean;
}

export const ServiceHeroCard: React.FC<ServiceHeroCardProps> = ({
  service,
  heroImageUrl,
  isLoadingImages,
}) => {
  const navigate = useNavigate();

  return (
    <section className="relative mt-8 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-100 via-white to-gray-50 shadow-xl">
      {/* Hero Image */}
      <div className="relative flex h-56 w-full items-center justify-center bg-gradient-to-r from-blue-200 via-blue-100 to-white">
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt="Service Hero"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-blue-200 via-blue-100 to-white">
            <CameraIcon className="h-16 w-16 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent"></div>
      </div>
      {/* Card Content */}
      <div className="relative z-10 flex flex-col gap-6 px-8 py-8 md:flex-row md:items-center md:gap-10 md:py-10">
        {/* Service Info */}
        <div className="min-w-0 flex-1">
          {/* Mobile: Green dot next to name */}
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
                {/* Green dot for availability */}
                {service.status === "Available" && (
                  <span
                    className="inline-block h-3 w-3 rounded-full bg-green-500"
                    title="Available"
                  ></span>
                )}
              </div>
            </div>
          </div>
          {/* Desktop: Name, availability note */}
          <div className="mb-2 hidden items-center gap-2 md:flex">
            <h2
              className="truncate text-3xl font-extrabold text-blue-900 drop-shadow-sm"
              title={service.title}
            >
              {service.title}
            </h2>
            {/* Availability note */}
            <span
              className={`ml-2 rounded-full px-3 py-1 text-xs font-semibold ${
                service.status === "Available"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
              title={
                service.status === "Available"
                  ? "Service is available"
                  : "Service is unavailable"
              }
            >
              {service.status === "Available" ? "Available" : "Unavailable"}
            </span>
          </div>
          {/* Category */}
          <div className="mt-2 flex items-center gap-2 text-lg font-medium text-blue-700">
            <TagIcon className="h-5 w-5 text-blue-400" />
            {service.category}
          </div>
        </div>
        {/* Rating on Right Side */}
        <div className="flex min-w-[180px] flex-col items-center justify-center gap-2">
          <div
            onClick={() => navigate(`/service/${service.id}/reviews`)}
            className="mt-1 cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <StarIcon className="h-5 w-5 fill-current text-yellow-400" />
                  <span className="font-semibold text-gray-800">
                    {(service.rating || 0).toFixed(1)}
                  </span>
                  <span className="text-gray-600">
                    ({service.reviewCount || 0} reviews)
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  View All Ratings and Reviews
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

