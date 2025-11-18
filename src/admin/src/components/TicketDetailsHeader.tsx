import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface TicketDetailsHeaderProps {
  ticketId: string;
  ticketTitle: string;
}

export const TicketDetailsHeader: React.FC<TicketDetailsHeaderProps> = ({
  ticketId,
  ticketTitle,
}) => {
  const navigate = useNavigate();

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Ticket #{ticketId}
              </h1>
              <p className="mt-2 text-sm text-gray-600">{ticketTitle}</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate("/ticket-inbox")}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
