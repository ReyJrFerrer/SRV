import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useFeedback } from "../hooks/useFeedback";

const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const [issue, setIssue] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { submitReport, submitting, error, clearError } = useFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issue.trim()) {
      return;
    }

    clearError();
    setSuccessMessage(null);

    const success = await submitReport({ description: issue.trim() });

    if (success) {
      setSuccessMessage(
        "Your report has been submitted successfully. Thank you for your feedback!",
      );
      setIssue(""); // Clear the form
      // Optionally navigate back after a delay
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 to-gray-100 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-yellow-200 bg-white p-10 shadow-2xl">
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
          <div>
            <label
              htmlFor="issue"
              className="mb-2 block text-lg font-medium text-gray-700"
            >
              Describe your issue
            </label>
            <textarea
              id="issue"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-gray-800 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
              placeholder="Type your issue or feedback here..."
              required
              disabled={submitting}
            />
          </div>
          <button
            type="submit"
            disabled={!issue.trim() || submitting}
            className="w-full rounded-lg bg-yellow-200 px-6 py-3 text-lg font-semibold text-black shadow transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssuePage;
