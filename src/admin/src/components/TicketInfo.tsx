import React from "react";
import { Link } from "react-router-dom";

interface Ticket {
  id: string;
  category:
    | "technical"
    | "billing"
    | "account"
    | "service"
    | "cancellation"
    | "other";
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  lastUpdated: string;
  assignedTo?: string;
}

interface TicketInfoProps {
  ticket: Ticket;
  formatDate: (dateString: string) => string;
  getCategoryColor: (category: string) => string;
}

export const TicketInfo: React.FC<TicketInfoProps> = ({
  ticket,
  formatDate,
  getCategoryColor,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Ticket Info</h3>
      </div>

      <div className="space-y-4 px-6 py-4">
        <div>
          <dt className="text-sm font-medium text-gray-500">Category</dt>
          <dd className="mt-1">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(ticket.category)}`}
            >
              {ticket.category.toUpperCase()}
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
          <dd className="mt-1 text-sm text-gray-900">
            <Link
              to={`/user/${ticket.submittedById}?from=ticket&ticketId=${ticket.id}`}
              className="cursor-pointer text-indigo-600 hover:text-indigo-500 hover:underline"
            >
              {ticket.submittedBy}
            </Link>
          </dd>
        </div>

        <div>
          <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
          <dd className="mt-1 text-sm text-gray-900">
            {formatDate(ticket.submittedAt)}
          </dd>
        </div>

        <div>
          <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
          <dd className="mt-1 text-sm text-gray-900">
            {formatDate(ticket.lastUpdated)}
          </dd>
        </div>

        {ticket.assignedTo && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
            <dd className="mt-1 text-sm text-gray-900">{ticket.assignedTo}</dd>
          </div>
        )}
      </div>
    </div>
  );
};

