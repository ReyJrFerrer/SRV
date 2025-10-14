// SRV-ICP-ver2-jdMain/frontend/src/components/provider/ProviderServiceListItem.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Service } from "../../../assets/types/service/service";
import {
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  ChartBarIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface ProviderServiceListItemProps {
  service: Service;
  onToggleActive: (serviceId: string, currentStatus: boolean) => void;
  onDeleteService: (serviceId: string) => void;
}

const ProviderServiceListItem: React.FC<ProviderServiceListItemProps> = ({
  service,
  onToggleActive,
  onDeleteService,
}) => {
  const servicePrice =
    service.price ||
    (service.packages && service.packages.length > 0
      ? service.packages[0].price
      : 0);
  // Ensure servicePrice is an object with 'amount' or a number before calling toFixed
  const priceAmount =
    typeof servicePrice === "number"
      ? servicePrice
      : (servicePrice as any)?.amount || 0;
  const priceUnit =
    service.price?.unit ||
    (service.packages && service.packages.length > 0
      ? service.packages[0].duration || "/pkg"
      : "/service");
  const currencySymbol =
    service.price?.currency === "PHP" ? "₱" : service.price?.currency || "₱";
  const heroImageUrl =
    typeof service.heroImage === "string"
      ? service.heroImage
      : (service.heroImage as any)?.src;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl md:flex-row">
      <div className="relative h-48 md:h-auto md:w-1/3">
        {heroImageUrl && (
          <img
            src={heroImageUrl}
            alt={service.title || service.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <span
          className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${service.isActive ? "bg-green-500" : "bg-gray-500"}`}
        >
          {service.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 md:p-5">
        <div>
          <p className="mb-1 text-xs tracking-wider text-gray-500 uppercase">
            {service.category.name}
          </p>
          {/* MODIFICATION: Make title a link */}
          <Link
            to={`/provider/service-details/${service.id}`}
            className="transition-colors hover:text-blue-600"
            title="View service details"
          >
            <h3 className="mb-2 truncate text-lg font-bold text-gray-800 md:text-xl">
              {service.title || service.name}
            </h3>
          </Link>
          <p
            className="mb-3 line-clamp-2 text-sm text-gray-600"
            title={service.description}
          >
            {service.description}
          </p>
          <div className="mb-3 flex items-center text-sm text-gray-700">
            <span className="text-lg font-semibold text-green-600">
              {currencySymbol}
              {priceAmount.toFixed(2)}
            </span>
            <span className="ml-1 text-xs text-gray-500">{priceUnit}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-start gap-2 border-t border-gray-200 pt-4">
          <Link
            to={`/provider/services/edit/${service.id}`}
            className="flex items-center rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-600 sm:text-sm"
          >
            <PencilIcon className="mr-1.5 h-4 w-4" /> Edit
          </Link>
          <button
            onClick={() => onToggleActive(service.id, service.isActive)}
            className={`flex items-center rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
              service.isActive
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {service.isActive ? (
              <EyeSlashIcon className="mr-1.5 h-4 w-4" />
            ) : (
              <EyeIcon className="mr-1.5 h-4 w-4" />
            )}
            {service.isActive ? "Set Inactive" : "Set Active"}
          </button>
          {/* Stats link can also go to the new detail page or a dedicated stats page */}
          <Link
            to={`/provider/service-details/${service.id}?section=stats`}
            className="flex items-center rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 sm:text-sm"
          >
            <ChartBarIcon className="mr-1.5 h-4 w-4" /> Stats
          </Link>
          <button
            onClick={() => onDeleteService(service.id)}
            className="ml-auto flex items-center rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600 sm:text-sm md:ml-0"
          >
            <TrashIcon className="mr-1.5 h-4 w-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderServiceListItem;
