import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CogIcon,
  UserIcon,
  BriefcaseIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { useFeedback } from "../../../hooks/useFeedback";
import BottomNavigation from "../../../components/provider/BottomNavigation";

// Ticket-compatible interfaces (same as client version)
interface TicketCategory {
  id: "technical" | "billing" | "account" | "service" | "other";
  name: string;
  description: string;
  icon: React.ComponentType<any>;
}

const TICKET_CATEGORIES: TicketCategory[] = [
  {
    id: "technical",
    name: "Technical Issue",
    description: "App bugs, loading problems, feature malfunctions",
    icon: CogIcon,
  },
  {
    id: "billing",
    name: "Billing & Payments",
    description: "Commission issues, payment problems, remittance delays",
    icon: BriefcaseIcon,
  },
  {
    id: "account",
    name: "Account Issues",
    description: "Login problems, profile issues, account restrictions",
    icon: UserIcon,
  },
  {
    id: "service",
    name: "Service Related",
    description:
      "Service management, bookings, client interactions, certificates",
    icon: BriefcaseIcon,
  },
  {
    id: "other",
    name: "Other",
    description: "General feedback, suggestions, other concerns",
    icon: QuestionMarkCircleIcon,
  },
];

const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory["id"]>("other");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { submitReport, submitting, error, clearError } = useFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      return;
    }

    clearError();
    setSuccessMessage(null);

    // Create ticket-compatible report with structured data
    const reportDescription = JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      category,
      timestamp: new Date().toISOString(),
      source: "provider_report", // Identify source for admin
    });

    const success = await submitReport(reportDescription);

    if (success) {
      setSuccessMessage(
        "Your report has been submitted successfully. Our support team will review it and respond as needed. Thank you!",
      );
      setTitle("");
      setDescription("");
      setCategory("other");
      // Navigate back after delay
      setTimeout(() => {
        navigate(-1);
      }, 3000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-yellow-50 to-gray-100 p-4">
      <div className="mx-auto w-full max-w-2xl flex-1 rounded-3xl border border-yellow-200 bg-white p-10 shadow-2xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-yellow-700 hover:text-yellow-900 focus:outline-none"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="font-medium">Back</span>
        </button>
        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.svg" alt="SRV Logo" className="mb-2 h-16 w-16" />
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-yellow-900">
            Report an Issue
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Help us improve by reporting bugs, issues, or providing feedback
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
              {successMessage}
            </div>
          )}

          {/* Issue Title */}
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Issue Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-gray-800 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
              placeholder="Brief summary of your issue..."
              required
              disabled={submitting}
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Category *
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TICKET_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <label
                    key={cat.id}
                    className={`relative flex cursor-pointer rounded-lg border p-4 transition-all hover:bg-yellow-50 ${
                      category === cat.id
                        ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.id}
                      checked={category === cat.id}
                      onChange={(e) =>
                        setCategory(e.target.value as TicketCategory["id"])
                      }
                      className="sr-only"
                      disabled={submitting}
                    />
                    <div className="flex items-start">
                      <IconComponent className="mr-3 mt-0.5 h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {cat.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {cat.description}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Issue Description */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Detailed Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-gray-800 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
              placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
              required
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim() || !description.trim() || submitting}
            className="w-full rounded-lg bg-yellow-200 px-6 py-3 text-lg font-semibold text-black shadow transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default ReportIssuePage;
