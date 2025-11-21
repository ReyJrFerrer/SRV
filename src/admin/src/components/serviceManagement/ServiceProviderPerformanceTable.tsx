import React from "react";
import { useNavigate } from "react-router-dom";
import { ProfileImage } from "../../../../frontend/src/components/common/ProfileImage";

interface ServiceProviderPerformanceData {
  id: string;
  name: string;
  phone: string;
  totalRevenue: number;
  totalCommission: number;
  completedBookings: number;
  totalBookings: number;
  walletBalance: number;
  profilePicture?: {
    imageUrl: string;
    thumbnailUrl: string;
  };
}

interface ServiceProviderPerformanceTableProps {
  providers: ServiceProviderPerformanceData[];
  loading?: boolean;
  onRefresh: () => void;
  showRefresh?: boolean;
}

const ServiceProviderPerformanceTable: React.FC<
  ServiceProviderPerformanceTableProps
> = ({
  providers,
  loading = false,
  onRefresh: _onRefresh,
  showRefresh: _showRefresh = false,
}) => {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const handleRowClick = (providerId: string) => {
    navigate(`/user/${providerId}/wallet`, {
      state: { from: "analytics" },
    });
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-1/4 rounded bg-gray-200"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-blue-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Service Provider Records
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-blue-100">
          <thead className="bg-blue-50/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Service Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Total Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Total Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Completed Bookings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-700">
                Wallet Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50 bg-white">
            {providers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No service providers found
                </td>
              </tr>
            ) : (
              providers.map((provider) => (
                <tr
                  key={provider.id}
                  className="cursor-pointer transition-colors hover:bg-blue-50/30"
                  onClick={() => handleRowClick(provider.id)}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <ProfileImage
                          profilePictureUrl={
                            provider.profilePicture?.thumbnailUrl ||
                            provider.profilePicture?.imageUrl
                          }
                          userName={provider.name}
                          size="h-10 w-10"
                          className="shadow-sm ring-2 ring-white"
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {provider.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(provider.totalRevenue)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(provider.totalCommission)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {provider.completedBookings}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(provider.walletBalance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export { ServiceProviderPerformanceTable };
