import React from "react";
import { DocumentIcon } from "@heroicons/react/24/solid";

interface CertificateSectionProps {
  title: string;
  description: string;
  badge?: {
    text: string;
    color: "yellow" | "green" | "red";
  };
  loading?: boolean;
  emptyMessage: {
    title: string;
    description: string;
  };
  children: React.ReactNode;
}

export const CertificateSection: React.FC<CertificateSectionProps> = ({
  title,
  description,
  badge,
  loading,
  emptyMessage,
  children,
}) => {
  const badgeColors = {
    yellow: "bg-yellow-100 text-yellow-800 ring-yellow-200",
    green: "bg-green-100 text-green-800 ring-green-200",
    red: "bg-red-100 text-red-800 ring-red-200",
  };

  return (
    <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          {badge && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${badgeColors[badge.color]}`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-500">
              Loading certificate validations...
            </p>
          </div>
        ) : React.Children.count(children) === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <DocumentIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              {emptyMessage.title}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {emptyMessage.description}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
