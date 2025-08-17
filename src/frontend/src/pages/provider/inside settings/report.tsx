import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const [issue, setIssue] = useState("");

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
        <form className="space-y-6">
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
            />
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-yellow-200 px-6 py-3 text-lg font-semibold text-black shadow transition-colors hover:bg-yellow-300"
            onClick={() => {}}
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssuePage;
