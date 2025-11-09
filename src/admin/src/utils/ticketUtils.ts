// Types for tickets
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
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
  assignedTo?: string;
  lastUpdated: string;
  tags: string[];
  comments?: Comment[];
  attachments?: string[];
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isInternal: boolean;
}

// Parse structured report data
export const parseReportData = (description: string) => {
  try {
    const data = JSON.parse(description);
    if (data.title && data.description && data.category) {
      return data;
    }
  } catch (e) {}
  return null;
};

// Convert feedback reports to tickets
export const convertReportsToTickets = (
  reports: any[],
  _users: any[],
): Ticket[] => {
  return reports.map((report) => {
    const parsedData = parseReportData(report.description);

    let ticket: Ticket;
    if (parsedData) {
      // Build tags based on source and category
      const tags = [];
      if (
        parsedData.source === "provider_report" ||
        parsedData.source === "provider_cancellation"
      ) {
        tags.push("provider");
      } else if (
        parsedData.source === "client_report" ||
        parsedData.source === "client_cancellation"
      ) {
        tags.push("client");
      }

      if (parsedData.category === "cancellation") {
        tags.push("cancellation");
      }

      tags.push("user-report");

      // Structured report
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
        tags: tags,
        comments: [],
        attachments: report.attachments || [],
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
        attachments: report.attachments || [],
      };
    }
    return ticket;
  });
};

// Status colors
export const getStatusColor = (status: string) => {
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
export const getCategoryColor = (category: string) => {
  switch (category) {
    case "technical":
      return "bg-purple-100 text-purple-800";
    case "billing":
      return "bg-green-100 text-green-800";
    case "account":
      return "bg-blue-100 text-blue-800";
    case "service":
      return "bg-yellow-100 text-yellow-800";
    case "cancellation":
      return "bg-orange-100 text-orange-800";
    case "other":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Format date for display
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format date for ticket cards
export const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

