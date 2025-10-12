import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";

// Function to parse structured report data (same as ticketInbox)
const parseReportData = (description: string) => {
  try {
    const data = JSON.parse(description);
    if (data.title && data.description && data.category) {
      return data;
    }
  } catch (e) {}
  return null;
};

const convertReportsToTickets = (reports: any[], _users: any[]): Ticket[] => {
  return reports.map((report) => {
    const parsedData = parseReportData(report.description);

    let ticket: Ticket;
    if (parsedData) {
      // Structured report (new format)
      ticket = {
        id: `REPORT-${report.id}`,
        title: parsedData.title,
        description: parsedData.description,
        status: (report.status || "open") as Ticket["status"],
        category: parsedData.category as Ticket["category"],
        submittedBy: report.userName || `User_${report.userId}`,
        submittedById: report.userId,
        submittedAt: report.createdAt,
        lastUpdated: report.createdAt,
        tags: [
          parsedData.source === "provider_report" ? "provider" : "client",
          "user-report",
        ],
        comments: [],
      };
    } else {
      ticket = {
        id: `REPORT-${report.id}`,
        title: "User Report",
        description: report.description,
        status: (report.status || "open") as Ticket["status"],
        category: "other" as const,
        submittedBy: report.userName || `User_${report.userId}`,
        submittedById: report.userId,
        submittedAt: report.createdAt,
        lastUpdated: report.createdAt,
        tags: ["legacy", "user-report"],
        comments: [],
      };
    }
    return ticket;
  });
};

// Types for tickets
interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  category: "technical" | "billing" | "account" | "service" | "other";
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  assignedTo?: string;
  lastUpdated: string;
  tags: string[];
  comments?: Comment[];
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isInternal: boolean;
}

// Status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case "open":
      return "bg-red-100 text-red-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "resolved":
      return "bg-green-100 text-green-800";
    case "closed":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Category colors
const getCategoryColor = (category: string) => {
  switch (category) {
    case "technical":
      return "bg-purple-100 text-purple-800";
    case "billing":
      return "bg-green-100 text-green-800";
    case "account":
      return "bg-blue-100 text-blue-800";
    case "service":
      return "bg-yellow-100 text-yellow-800";
    case "other":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    initializeCanisterReferences,
    refreshUsers,
    users: backendUsers,
  } = useAdmin();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Initialize canister references and refresh data
  useEffect(() => {
    const initializeData = async () => {
      try {
        await initializeCanisterReferences();
        await refreshUsers();
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, [initializeCanisterReferences, refreshUsers]);

  // Load reports from feedback canister
  const loadReportsAsTickets = async (): Promise<Ticket[]> => {
    try {
      const { getReportsFromFeedbackCanister } = await import(
        "../services/adminServiceCanister"
      );
      const reports = await getReportsFromFeedbackCanister();
      const reportTickets = convertReportsToTickets(reports, backendUsers);
      return reportTickets;
    } catch (error) {
      console.error("Error loading reports:", error);
      return [];
    }
  };

  // Find ticket by ID from reports
  useEffect(() => {
    if (id && backendUsers.length > 0) {
      const loadTicket = async () => {
        setLoading(true);
        try {
          // Load real reports only
          const reportTickets = await loadReportsAsTickets();
          const foundTicket = reportTickets.find((t) => t.id === id);

          setTicket(foundTicket || null);
        } catch (error) {
          console.error("Error loading ticket:", error);
          setTicket(null);
        } finally {
          setLoading(false);
        }
      };

      loadTicket();
    }
  }, [id, backendUsers]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;

    setUpdatingStatus(true);
    try {
      const reportId = ticket.id.replace("REPORT-", "");

      // Call backend to update status
      const { updateReportStatus } = await import(
        "../services/adminServiceCanister"
      );
      const success = await updateReportStatus(reportId, newStatus);

      if (success) {
        // Update local state
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus as Ticket["status"],
                lastUpdated: new Date().toISOString(),
                assignedTo:
                  newStatus === "in_progress"
                    ? "Admin_001"
                    : newStatus === "open"
                      ? undefined
                      : ticket.assignedTo,
              }
            : null,
        );

        console.log(`✅ Ticket ${ticket.id} status updated to: ${newStatus}`);

        // Show success feedback
        const statusText = newStatus
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        console.log(`Status changed to "${statusText}" - persisted to backend`);
      } else {
        console.error("Failed to update status in backend");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    if (!ticket || !newComment.trim()) return;

    const comment: Comment = {
      id: `COMMENT-${Date.now()}`,
      author: "Admin_001",
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
      isInternal,
    };

    setTicket((prev) =>
      prev
        ? {
            ...prev,
            comments: [...(prev.comments || []), comment],
            lastUpdated: new Date().toISOString(),
          }
        : null,
    );

    setNewComment("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-sm text-gray-500">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="h-12 w-12"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Ticket not found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            The ticket you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/ticket-inbox")}
            className="mt-4 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Ticket #{ticket.id}
                </h1>
                <p className="mt-2 text-sm text-gray-600">{ticket.title}</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate("/ticket-inbox")}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
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
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Tickets
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Ticket Details */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Details
                  </h2>
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

            {/* Comments Section */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Comments
                </h2>
              </div>

              <div className="px-6 py-4">
                {ticket.comments && ticket.comments.length > 0 ? (
                  <div className="space-y-4">
                    {ticket.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`rounded-lg p-4 ${
                          comment.isInternal
                            ? "border-l-4 border-blue-400 bg-blue-50"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {comment.author}
                            </span>
                            {comment.isInternal && (
                              <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                Internal
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(comment.timestamp)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-gray-700">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No comments yet.</p>
                )}

                {/* Add Comment Form */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Add Comment
                      </label>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        placeholder="Add a comment..."
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Internal comment (not visible to user)
                        </span>
                      </label>

                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Actions */}
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
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
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

            {/* Ticket Info */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Ticket Info
                </h3>
              </div>

              <div className="space-y-4 px-6 py-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Category
                  </dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(ticket.category)}`}
                    >
                      {ticket.category.toUpperCase()}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Submitted By
                  </dt>
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
                  <dt className="text-sm font-medium text-gray-500">
                    Submitted At
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(ticket.submittedAt)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Last Updated
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(ticket.lastUpdated)}
                  </dd>
                </div>

                {ticket.assignedTo && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Assigned To
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {ticket.assignedTo}
                    </dd>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons card removed - status is now managed via dropdown above */}
          </div>
        </div>
      </main>
    </div>
  );
};
