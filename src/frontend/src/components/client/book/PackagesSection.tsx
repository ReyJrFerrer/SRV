import React from "react";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

type Package = {
  id: string;
  title: string;
  description: string;
  price: number;
  commissionFee?: number;
  checked: boolean;
};

export type PackagesSectionProps = {
  packages: Package[];
  onToggle: (id: string) => void;
  highlight?: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
};

const PackagesSection: React.FC<PackagesSectionProps> = ({
  packages,
  onToggle,
  highlight = false,
  innerRef,
}) => (
  <div
    ref={innerRef}
    className={`scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${
      highlight ? "border-2 border-red-500 ring-2 ring-red-200" : ""
    }`}
  >
    <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
      <ClipboardDocumentListIcon
        className="h-6 w-6 text-blue-600"
        aria-hidden="true"
      />
      <span>
        Select Package(s) <span className="text-red-500">*</span>
      </span>
    </h3>

    {packages.map((pkg) => (
      <label
        key={pkg.id}
        className="mb-3 flex cursor-pointer items-start space-x-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100"
      >
        <input
          type="checkbox"
          checked={pkg.checked}
          onChange={() => onToggle(pkg.id)}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
        />
        <div className="min-w-0 flex-1">
          <div className="break-words text-lg font-semibold text-gray-900">
            {pkg.title}
          </div>
          <div className="mb-1 break-words text-sm text-gray-600">
            {pkg.description}
          </div>
          <div className="text-base font-bold text-blue-600">
            ₱
            {(pkg.price + (pkg.commissionFee || 0)).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </label>
    ))}
  </div>
);

export default PackagesSection;
