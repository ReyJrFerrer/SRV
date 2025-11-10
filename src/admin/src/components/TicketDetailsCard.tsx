import React from "react";

interface Ticket {
  id: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  attachments?: string[];
  tags: string[];
}

interface TicketDetailsCardProps {
  ticket: Ticket;
  imageDataUrls: Record<string, string>;
  loadingImages: boolean;
  onImageClick: (url: string) => void;
  getStatusColor: (status: string) => string;
}

export const TicketDetailsCard: React.FC<TicketDetailsCardProps> = ({
  ticket,
  imageDataUrls,
  loadingImages,
  onImageClick,
  getStatusColor,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Details</h2>
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(ticket.status)}`}
            >
              {ticket.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">
            {ticket.description}
          </p>
        </div>

        {/* Attachments Section */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-gray-900">
              Attachments ({ticket.attachments.length})
              {loadingImages && (
                <span className="ml-2 text-xs text-gray-500">
                  Loading images...
                </span>
              )}
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {ticket.attachments.map((attachment, index) => {
                const displayUrl = imageDataUrls[attachment] || "";
                const isLoading = loadingImages && !imageDataUrls[attachment];

                return isLoading ? (
                  <div
                    key={index}
                    className="flex h-32 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-100"
                  >
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                ) : (
                  <button
                    key={index}
                    className="group relative h-32 w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={() => onImageClick(displayUrl)}
                  >
                    <img
                      src={displayUrl}
                      alt={`Attachment ${index + 1}`}
                      className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        console.error(`❌ Image ${index + 1} failed to load:`, {
                          attachment,
                          displayUrl,
                          src: img.src,
                        });
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20"></div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {ticket.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {ticket.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
