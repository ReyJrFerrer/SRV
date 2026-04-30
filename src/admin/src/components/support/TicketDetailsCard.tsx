import React from "react";
import type { AiAnalysisData } from "../../utils/ticketUtils";

interface Ticket {
  id: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  attachments?: string[];
  tags: string[];
  aiAnalysis?: AiAnalysisData;
}

interface TicketDetailsCardProps {
  ticket: Ticket;
  imageDataUrls: Record<string, string>;
  loadingImages: boolean;
  onImageClick: (url: string) => void;
  getStatusColor: (status: string) => string;
}

const getThreatLevelColor = (level?: string) => {
  switch (level) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const TicketDetailsCard: React.FC<TicketDetailsCardProps> = ({
  ticket,
  imageDataUrls,
  loadingImages,
  onImageClick,
  getStatusColor,
}) => {
  const ai = ticket.aiAnalysis;

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

        {/* AI Analysis Section */}
        {ai && (
          <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <h3 className="mb-3 flex items-center text-sm font-semibold text-indigo-900">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              AI Analysis
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-indigo-700">
                  Threat Level
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getThreatLevelColor(ai.threatLevel)}`}
                  >
                    {(ai.threatLevel || "unknown").toUpperCase()}
                  </span>
                </dd>
              </div>

              {ai.confidence !== undefined && (
                <div>
                  <dt className="text-xs font-medium text-indigo-700">
                    Confidence
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {(ai.confidence * 100).toFixed(0)}%
                  </dd>
                </div>
              )}

              {ai.rating !== undefined && (
                <div>
                  <dt className="text-xs font-medium text-indigo-700">
                    Review Rating
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {ai.rating}/5
                  </dd>
                </div>
              )}
            </div>

            {/* Reviewer / Provider info */}
            {(ai.clientName || ai.providerName) && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ai.clientName && (
                  <div className="rounded bg-white/60 px-3 py-2">
                    <dt className="text-xs font-medium text-indigo-700">
                      Reviewer (Client)
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-900">
                      {ai.clientName}
                      {ai.clientId && (
                        <span className="ml-1 text-xs text-gray-500">
                          ({ai.clientId})
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {ai.providerName && (
                  <div className="rounded bg-white/60 px-3 py-2">
                    <dt className="text-xs font-medium text-indigo-700">
                      Provider
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-900">
                      {ai.providerName}
                      {ai.providerId && (
                        <span className="ml-1 text-xs text-gray-500">
                          ({ai.providerId})
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </div>
            )}

            {/* Review comment */}
            {ai.comment && (
              <div className="mt-3 rounded bg-white/60 px-3 py-2">
                <dt className="text-xs font-medium text-indigo-700">
                  Review Comment
                </dt>
                <dd className="mt-0.5 text-sm italic text-gray-700">
                  &ldquo;{ai.comment}&rdquo;
                </dd>
              </div>
            )}

            {/* Patterns */}
            {ai.patterns && ai.patterns.length > 0 && (
              <div className="mt-3">
                <dt className="text-xs font-medium text-indigo-700">
                  Detected Patterns
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {ai.patterns.map((pattern, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800"
                    >
                      {pattern.replace(/_/g, " ")}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {/* Summary */}
            {ai.summary && (
              <div className="mt-3">
                <dt className="text-xs font-medium text-indigo-700">
                  AI Summary
                </dt>
                <dd className="mt-0.5 text-sm text-gray-700">{ai.summary}</dd>
              </div>
            )}

            {/* Recommendation */}
            {ai.recommendation && (
              <div className="mt-3 rounded border border-indigo-200 bg-white px-3 py-2">
                <dt className="text-xs font-medium text-indigo-700">
                  Recommendation
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">
                  {ai.recommendation}
                </dd>
              </div>
            )}
          </div>
        )}

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
                        console.error(`Image ${index + 1} failed to load:`, {
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
