import React from "react";
import { BriefcaseIcon } from "@heroicons/react/24/solid";

interface ServicePackage {
  id: string;
  title: string;
  description: string;
  price: number;
  commissionFee?: number;
}

interface ServicePackagesProps {
  packages: ServicePackage[];
}

export const ServicePackages: React.FC<ServicePackagesProps> = ({
  packages,
}) => {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
          <BriefcaseIcon className="h-6 w-6 text-blue-400" />
          Service Packages ({packages.length})
        </h3>
      </div>
      {packages.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="group rounded-2xl border border-gray-300 bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 line-clamp-2 text-xl font-bold text-gray-900">
                    {pkg.title}
                  </h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">
                    {pkg.description}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 text-right">
                  <div className="mb-1 text-xl font-bold text-blue-600">
                    ₱{pkg.price.toFixed(2)}
                  </div>
                  <div className="mb-1 text-xs text-gray-500">
                    + ₱{(pkg.commissionFee || 0).toFixed(2)} commission
                  </div>
                  <div className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-sm font-semibold text-green-700">
                    ₱
                    {((pkg.price || 0) + (pkg.commissionFee || 0)).toFixed(2)}{" "}
                    total
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-blue-300">
          <BriefcaseIcon className="mx-auto mb-4 h-12 w-12" />
          <p>No packages available</p>
        </div>
      )}
    </section>
  );
};

