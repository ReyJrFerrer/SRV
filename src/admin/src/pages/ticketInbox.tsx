import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";

// Function to parse structured report data
const parseReportData = (description: string) => {
  try {
    const data = JSON.parse(description);
    if (data.title && data.description && data.category) {
      return data;
    }
  } catch (e) {}
  return null;
};

// Function to convert feedback reports to tickets
const convertReportsToTickets = (reports: any[], _users: any[]): Ticket[] => {
  return reports.map((report) => {
    const parsedData = parseReportData(report.description);

    let ticket: Ticket;
    if (parsedData) {
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
  submittedById: string; // User ID for navigation
  submittedAt: string;
  assignedTo?: string;
  lastUpdated: string;
  tags: string[];
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

// Ticket card component
const TicketCard: React.FC<{
  ticket: Ticket;
  onView: (ticket: Ticket) => void;
}> = ({ ticket, onView }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => onView(ticket)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {ticket.title}
            </h3>
          </div>

          <p className="mb-3 line-clamp-2 text-sm text-gray-600">
            {ticket.description}
          </p>

          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>ID: {ticket.id}</span>
            <span>By: {ticket.submittedBy}</span>
            <span>Submitted: {formatDate(ticket.submittedAt)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
              ticket.status,
            )}`}
          >
            {ticket.status.replace("_", " ").toUpperCase()}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(
              ticket.category,
            )}`}
          >
            {ticket.category.toUpperCase()}
          </span>
        </div>
      </div>

      {ticket.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
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
  );
};

export const TicketInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    initializeCanisterReferences,
    refreshUsers,
    users: backendUsers,
  } = useAdmin();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);

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
  const loadReportsAsTickets = async () => {
    setLoadingReports(true);
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
    } finally {
      setLoadingReports(false);
    }
  };

  // Update tickets when users are loaded
  useEffect(() => {
    if (backendUsers.length > 0) {
      const loadAllTickets = async () => {
        const reportTickets = await loadReportsAsTickets();

        setTickets(reportTickets);
        setFilteredTickets(reportTickets);
      };

      loadAllTickets();
    }
  }, [backendUsers]);

  // Filter and search tickets
  useEffect(() => {
    let filtered = tickets.filter((ticket) => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || ticket.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    // Sort tickets
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime()
          );
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredTickets(filtered);
  }, [tickets, searchTerm, statusFilter, categoryFilter, sortBy]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Refresh users first
      await refreshUsers();

      if (backendUsers.length > 0) {
        // Load real reports only (removed mock tickets)
        const reportTickets = await loadReportsAsTickets();

        setTickets(reportTickets);
        setFilteredTickets(reportTickets);
      }
    } catch (error) {
      console.error("Error refreshing tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    navigate(`/ticket/${ticket.id}`);
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
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
                  Back
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Ticket Inbox
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Manage and resolve support tickets from users and service
                    providers
                  </p>
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleRefresh}
                  disabled={loading || loadingReports}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                >
                  {loading || loadingReports ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
                  ) : (
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  )}
                  {loadingReports ? "Loading Reports..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Stats Summary */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-500">Total Tickets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.open}
                </div>
                <div className="text-sm text-gray-500">Open</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.inProgress}
                </div>
                <div className="text-sm text-gray-500">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.resolved}
                </div>
                <div className="text-sm text-gray-500">Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {stats.total - stats.resolved}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="account">Account</option>
                  <option value="service">Service</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Support Tickets
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {filteredTickets.length} of {tickets.length} tickets
                  </p>
                </div>
                {stats.open > 0 && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    {stats.open} open
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              {filteredTickets.length === 0 ? (
                <div className="py-12 text-center">
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
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No tickets found
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {searchTerm ||
                    statusFilter !== "all" ||
                    categoryFilter !== "all"
                      ? "Try adjusting your filters to see more tickets."
                      : "No support tickets have been submitted yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onView={handleViewTicket}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
