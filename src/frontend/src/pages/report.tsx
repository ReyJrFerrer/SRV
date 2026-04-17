import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CogIcon,
  UserIcon,
  BriefcaseIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { useFeedback } from "../hooks/useFeedback";
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
    description: "Login problems, profile issues, restrictions",
    icon: UserIcon,
  },
  {
    id: "service",
    name: "Service Related",
    description: "Service listings, bookings, interactions",
    icon: BriefcaseIcon,
  },
  {
    id: "other",
    name: "Other",
    description: "General feedback, suggestions, concerns",
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
    const combined = [...files, ...imagesOnly].slice(0, 5);
    setFiles(combined);
    setUploadError(null);
    e.currentTarget.value = "";
  };

  const removeFileAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    clearError();
    setSuccessMessage(null);
    setUploadError(null);

    let attachmentUrls: string[] = [];
    if (files.length > 0) {
      try {
        setUploading(true);
        attachmentUrls = await uploadReportAttachments(files);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Failed to upload screenshots",
        );
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    const reportData = JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      category,
      timestamp: new Date().toISOString(),
      source: "client_report",
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
      setTimeout(() => {
        navigate(-1);
      }, 3000);
    }
  };

  const isSubmitDisabled =
    !title.trim() || !description.trim() || submitting || uploading;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-24 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 active:scale-95"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-black tracking-tight text-yellow-900">
            Report Issue
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          {/* Logo and Title */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-50">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-center text-2xl font-black tracking-tight text-yellow-900">
              Report an Issue
            </h1>
            <p className="mt-1 text-center text-sm font-medium text-gray-500">
              Help us improve by reporting bugs or providing feedback
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-medium text-green-600">
                {successMessage}
              </div>
            )}
            {uploadError && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                {uploadError}
              </div>
            )}

            {/* Issue Title */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-bold text-gray-700"
              >
                Issue Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 transition-colors focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200"
                placeholder="Brief summary of your issue..."
                required
                disabled={submitting}
              />
            </div>

            {/* Category Selection */}
            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700">
                Category *
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TICKET_CATEGORIES.map((cat) => {
                  const IconComponent = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <label
                      key={cat.id}
                      className={`relative flex cursor-pointer rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200"
                          : "border-gray-100 bg-gray-50 hover:border-yellow-200 hover:bg-yellow-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.id}
                        checked={isSelected}
                        onChange={(e) =>
                          setCategory(e.target.value as TicketCategory["id"])
                        }
                        className="sr-only"
                        disabled={submitting}
                      />
                      <div className="flex items-start">
                        <IconComponent
                          className={`mr-3 mt-0.5 h-5 w-5 ${isSelected ? "text-yellow-600" : "text-gray-500"}`}
                        />
                        <div>
                          <div className="text-sm font-bold text-gray-900">
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
                className="mb-2 block text-sm font-bold text-gray-700"
              >
                Detailed Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 transition-colors focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200"
                placeholder="Please provide detailed information about your issue..."
                required
                disabled={submitting}
              />
            </div>

            {/* Screenshots (optional) */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Attach Screenshots (optional)
              </label>
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 transition-colors hover:border-yellow-300 hover:bg-yellow-50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <PhotoIcon className="h-5 w-5" />
                    <span className="text-sm">Upload up to 5 images</span>
                  </div>
                  <label className="cursor-pointer rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-yellow-900 transition-colors hover:bg-yellow-500 active:scale-95">
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
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {previews.map((src, idx) => (
                      <div
                        key={idx}
                        className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white"
                      >
                        <img
                          src={src}
                          alt={`screenshot-${idx + 1}`}
                          className="h-20 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeFileAt(idx)}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {uploading && (
                  <div className="mt-3 text-sm font-medium text-yellow-700">
                    Uploading screenshots...
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex w-full items-center justify-center rounded-2xl bg-yellow-400 px-6 py-4 text-lg font-black text-yellow-900 shadow-sm transition-all hover:bg-yellow-500 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting || uploading ? (
                <span className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-900 border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <PaperAirplaneIcon className="h-5 w-5" />
                  Submit Report
                </span>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ReportIssuePage;
