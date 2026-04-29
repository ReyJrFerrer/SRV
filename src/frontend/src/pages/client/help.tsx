import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  LifebuoyIcon,
  EnvelopeIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

const HelpSupportPage: React.FC = () => {
  const navigate = useNavigate();

  const goToReportPage = () => navigate("/client/report");

  return (
    <div className="flex min-h-screen flex-col bg-white pb-24 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 transition-colors hover:bg-blue-50 active:scale-95"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-black tracking-tight text-blue-950">
            Help & Support
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          {/* Logo and Title */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-white">
              <LifebuoyIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-center text-2xl font-black tracking-tight text-blue-950">
              How can we help?
            </h1>
            <p className="mt-1 text-center text-sm font-medium text-gray-500">
              Here are ways to get assistance
            </p>
          </div>

          {/* Help Options */}
          <div className="space-y-4">
            {/* FAQ Option */}
            <button
              onClick={() => {}}
              className="flex w-full items-center rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-400 active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-white text-blue-600">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <div className="font-bold text-gray-900">
                  Frequently Asked Questions
                </div>
                <div className="text-sm text-gray-500">
                  Quick answers to common questions
                </div>
              </div>
            </button>

            {/* Email Support */}
            <a
              href="mailto:hello@srvpinoy.com"
              className="flex w-full items-center rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-400 active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-white text-blue-600">
                <EnvelopeIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <div className="font-bold text-gray-900">Email Support</div>
                <div className="text-sm text-gray-500">hello@srvpinoy.com</div>
              </div>
            </a>

            {/* Report an Issue */}
            <button
              onClick={goToReportPage}
              className="flex w-full items-center rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-400 active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-white text-blue-600">
                <LifebuoyIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <div className="font-bold text-gray-900">Report an Issue</div>
                <div className="text-sm text-gray-500">
                  Let us know about bugs or feedback
                </div>
              </div>
            </button>
          </div>

          {/* Social Media Section */}
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-lg font-black text-gray-700">Follow Us</h2>
            <div className="flex flex-col gap-3">
              <a
                href="https://facebook.com/srvpinoy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-blue-700 transition-all hover:translate-x-1 hover:border-blue-400"
              >
                <img
                  src="/images/external logo/fb.svg"
                  alt="Facebook"
                  className="h-6 w-6"
                />
                <span className="font-bold">Facebook</span>
              </a>
              <a
                href="https://instagram.com/srvpinoy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-pink-600 transition-all hover:translate-x-1 hover:border-pink-400"
              >
                <img
                  src="/images/external logo/instagram.svg"
                  alt="Instagram"
                  className="h-6 w-6"
                />
                <span className="font-bold">Instagram</span>
              </a>
              <a
                href="https://tiktok.com/@srvpinoy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 transition-all hover:translate-x-1 hover:border-gray-400"
              >
                <img
                  src="/images/external logo/tiktok.svg"
                  alt="TikTok"
                  className="h-6 w-6"
                />
                <span className="font-bold">TikTok</span>
              </a>
            </div>
          </div>

          {/* Response Time Note */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <StarIcon className="h-4 w-4 text-yellow-400" />
            <span>We aim to respond within 24 hours</span>
          </div>
        </div>
      </main>

    </div>
  );
};

export default HelpSupportPage;
