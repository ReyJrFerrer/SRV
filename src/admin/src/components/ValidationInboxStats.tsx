import React from "react";
import {
  DocumentTextIcon,
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface ValidationInboxStatsProps {
  stats: {
    totalCertificates: number;
    certificatesPending: number;
    completedToday: number;
    completedTotal: number;
    rejectedTotal: number;
  };
}

export const ValidationInboxStats: React.FC<ValidationInboxStatsProps> = ({
  stats,
}) => {
  return (
    <div className="mb-2 grid grid-cols-1 gap-5 sm:grid-cols-5">
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Total Certificates
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.totalCertificates}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Certificates Pending
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.certificatesPending}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Completed Today
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.completedToday}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Completed Total
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.completedTotal}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Rejected Total
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.rejectedTotal}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

