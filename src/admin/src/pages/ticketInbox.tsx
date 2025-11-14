import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon as ExclamationTriangleOutlineIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Ticket,
  convertReportsToTickets,
  getStatusColor,
  getCategoryColor,
  formatDateShort,
} from "../utils/ticketUtils";
import { TicketFilters } from "../components/TicketFilters";

// Ticket card component
const TicketCard: React.FC<{
  ticket: Ticket;
  onView: (ticket: Ticket) => void;
}> = ({ ticket, onView }) => {
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
            <span>Submitted: {formatDateShort(ticket.submittedAt)}</span>
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
  const { refreshUsers, users: backendUsers } = useAdmin();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [, setLoadingReports] = useState(false);

  // Mobile bottom action bar visibility
  const [showMobileBar, setShowMobileBar] = useState(false);

  // Toggle mobile bottom bar when header scrolls out of view
  useEffect(() => {
    const onScroll = () => setShowMobileBar(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await refreshUsers();
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, [refreshUsers]);

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

  const handleViewTicket = (ticket: Ticket) => {
    navigate(`/ticket/${ticket.id}`);
  };

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      inProgress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    }),
    [tickets],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (styled like Provider Management) */}
      <header className="z-50 border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white shadow sm:sticky sm:top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:gap-3">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Ticket Inbox
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Manage and resolve support tickets from users and service
                    providers
                  </p>
                </div>
              </div>
              <div className="ml-0 flex w-full flex-row gap-2 sm:ml-4 sm:w-auto sm:space-x-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
                >
                  <ArrowLeftIcon className="mr-2 h-4 w-4 text-black" />
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom actions bar (appears when header is scrolled out) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-yellow-100 px-4 py-3 backdrop-blur transition-all duration-300 ease-out supports-[backdrop-filter]:bg-white/80 sm:hidden ${
          showMobileBar
            ? "translate-y-0 bg-white/95 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-row items-stretch gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4 text-black" />
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Stats Summary styled like Provider Management */}
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
                        Total Tickets
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.total}
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
                    <ExclamationTriangleOutlineIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">
                        Open
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.open}
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
                    <WrenchScrewdriverIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">
                        In Progress
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.inProgress}
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
                        Resolved
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.resolved}
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
                    <DocumentTextIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">
                        Active
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.total - stats.resolved}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <TicketFilters
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            sortBy={sortBy}
            onSearchChange={setSearchTerm}
            onStatusChange={setStatusFilter}
            onCategoryChange={setCategoryFilter}
            onSortChange={setSortBy}
          />

          {/* Tickets List */}
          <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
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
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200">
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
