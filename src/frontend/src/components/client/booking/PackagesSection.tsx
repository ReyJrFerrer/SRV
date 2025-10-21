import React from "react";

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
    className={`glass-card rounded-2xl border bg-white/70 p-6 shadow-xl backdrop-blur-md ${
      highlight
        ? "border-2 border-red-500 ring-2 ring-red-200"
        : "border-blue-100"
    }`}
  >
    <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-blue-900">
      <span className="mr-2 inline-block h-6 w-2 rounded-full bg-blue-400"></span>
      Select Package(s) <span className="text-red-500">*</span>
    </h3>

    {packages.map((pkg) => (
      <label
        key={pkg.id}
        className="mb-3 flex cursor-pointer items-start space-x-3 rounded-xl p-3 transition hover:bg-blue-50"
      >
        <input
          type="checkbox"
          checked={pkg.checked}
          onChange={() => onToggle(pkg.id)}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
        />
        <div className="flex-1">
          <div className="text-lg font-semibold text-gray-900">
            {pkg.title}
          </div>
          <div className="mb-1 text-sm text-gray-600">{pkg.description}</div>
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
