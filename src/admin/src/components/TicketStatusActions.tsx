import React from "react";

interface TicketStatusActionsProps {
  status: "open" | "in_progress" | "resolved" | "closed";
  updatingStatus: boolean;
  onStatusChange: (newStatus: string) => void;
}

export const TicketStatusActions: React.FC<TicketStatusActionsProps> = ({
  status,
  updatingStatus,
  onStatusChange,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
      </div>

      <div className="space-y-3 px-6 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Update Status
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={updatingStatus}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {updatingStatus && (
          <div className="flex items-center text-sm text-gray-500">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-indigo-600"></div>
            Updating status...
          </div>
        )}
      </div>
    </div>
  );
};
