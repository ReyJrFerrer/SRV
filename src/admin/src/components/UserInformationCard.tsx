import React from "react";

interface UserInformationCardProps {
  user: {
    phone: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    servicesCount: number;
  };
  formatDate: (date: Date) => string;
  onEditPhoneNumber?: () => void;
}

export const UserInformationCard: React.FC<UserInformationCardProps> = ({
  user,
  formatDate,
  onEditPhoneNumber,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">User Information</h3>
        <button
          type="button"
          onClick={onEditPhoneNumber}
          className="inline-flex items-center rounded-md border border-indigo-600 px-3 py-1 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Edit Phone Number
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
          <dd className="mt-1 text-sm text-gray-900">{user.phone}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">User ID</dt>
          <dd className="mt-1 font-mono text-sm text-gray-900">{user.id}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">
            Registration Date
          </dt>
          <dd className="mt-1 text-sm text-gray-900">
            {formatDate(user.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
          <dd className="mt-1 text-sm text-gray-900">
            {formatDate(user.updatedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Total Services</dt>
          <dd className="mt-1 text-sm text-gray-900">{user.servicesCount}</dd>
        </div>
      </div>
    </div>
  );
};
