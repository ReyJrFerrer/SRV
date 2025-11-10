import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CogIcon,
  UserIcon,
  BriefcaseIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { useFeedback } from "../hooks/useFeedback";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { uploadReportAttachments } from "../services/mediaService";

// Ticket-compatible interfaces
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
    description: "Payment issues, commission problems, refunds",
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
    description: "Service listings, bookings, provider interactions",
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

  // Screenshots (optional)
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Generate/revoke object URLs for previews
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    const imagesOnly = list.filter((f) => f.type.startsWith("image/"));
    const combined = [...files, ...imagesOnly].slice(0, 5); // limit to 5
    setFiles(combined);
    setUploadError(null);
    // reset input value to allow re-selecting same file
    e.currentTarget.value = "";
  };

  const removeFileAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      return;
    }

    clearError();
    setSuccessMessage(null);
    setUploadError(null);

    // Upload screenshots using media service (if any)
    let attachmentUrls: string[] = [];
    if (files.length > 0) {
      try {
        setUploading(true);
        // Use media service to upload report attachments
        attachmentUrls = await uploadReportAttachments(files);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Failed to upload screenshots",
        );
        setUploading(false);
        return; // don't submit if uploads failed
      } finally {
        setUploading(false);
      }
    }

    // Create ticket-compatible report with structured data
    const reportData = JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      category,
      timestamp: new Date().toISOString(),
      source: "client_report", // Identify source for admin
    });
    const success = await submitReport(reportData, attachmentUrls);

    if (success) {
      setSuccessMessage(
        "Your report has been submitted successfully. Our support team will review it and respond as needed. Thank you!",
      );
      setTitle("");
      setDescription("");
      setCategory("other");
      setFiles([]);
      // Navigate back after delay
      setTimeout(() => {
        navigate(-1);
      }, 3000);
    }
  };

  // Removed unused variables for selectedCategory and selectedPriority

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 to-gray-100 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-yellow-200 bg-white p-10 shadow-2xl">
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
          {uploadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              {uploadError}
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

          {/* Screenshots (optional) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Screenshots (optional)
            </label>
            <div className="rounded-lg border border-dashed border-yellow-300 bg-yellow-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-yellow-700">
                  <PhotoIcon className="h-5 w-5" />
                  <span className="text-sm">Upload up to 5 images</span>
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-md bg-yellow-200 px-3 py-1.5 text-sm font-semibold text-black hover:bg-yellow-300">
                  Choose Files
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={submitting || uploading}
                  />
                </label>
              </div>
              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {previews.map((src, idx) => (
                    <div
                      key={idx}
                      className="group relative overflow-hidden rounded-md border border-yellow-200 bg-white"
                    >
                      <img
                        src={src}
                        alt={`screenshot-${idx + 1}`}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFileAt(idx)}
                        className="absolute right-1 top-1 rounded bg-red-600/90 px-1.5 py-0.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {uploading && (
                <div className="mt-3 text-sm text-yellow-700">
                  Uploading screenshots...
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={
              !title.trim() || !description.trim() || submitting || uploading
            }
            className="w-full rounded-lg bg-yellow-200 px-6 py-3 text-lg font-semibold text-black shadow transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting || uploading ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssuePage;
