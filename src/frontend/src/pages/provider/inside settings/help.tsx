import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const HelpSupportPage: React.FC = () => {
  const navigate = useNavigate();

  const goToReportPage = () => navigate("/client/report");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-blue-100 bg-white p-10 shadow-2xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-blue-700 hover:text-blue-900 focus:outline-none"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="font-medium">Back</span>
        </button>
        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.svg" alt="SRV Logo" className="mb-2 h-16 w-16" />
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-blue-900">
            Help & Support
          </h1>
        </div>
        <div className="space-y-6 text-lg text-gray-700">
          <p>
            Need assistance or have questions? Here are some ways to get help:
          </p>
          <ul className="list-inside list-disc space-y-2 pl-4">
            <li>
              <span className="font-semibold">FAQ:</span> our Frequently Asked
              Questions section for quick answers to common issues.
            </li>
            <li>
              <span className="font-semibold">Contact Support:</span> Email us
              at{" "}
              <a
                href="mailto:support@srvpinoy.com"
                className="text-blue-600 underline"
              >
                support@srvpinoy.com
              </a>{" "}
              for personalized help.
            </li>
            <li>
              <span className="font-semibold">Report a Problem:</span> Use the{" "}
              <a className="text-blue-600 underline" onClick={goToReportPage}>
                Report an Issue
              </a>{" "}
              page to let us know about bugs or feedback.
            </li>
            <li>
              <span className="font-semibold">Community:</span> Join our user
              community for tips and peer support (coming soon).
            </li>
          </ul>
          <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h2 className="mb-2 text-lg font-bold text-yellow-700">
              Follow us on Social Media
            </h2>
            <div className="flex justify-center gap-6">
              <a
                href="https://facebook.com/srvpinoy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-700 hover:text-blue-900"
              >
                <img
                  src="/images/external logo/fb.svg"
                  alt="Facebook"
                  className="h-7 w-7"
                />{" "}
                Facebook
              </a>
              <a
                href="https://instagram.com/srvpinoy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-pink-600 hover:text-pink-800"
              >
                <img
                  src="/images/external logo/instagram.svg"
                  alt="Instagram"
                  className="h-7 w-7"
                />{" "}
                Instagram
              </a>
              <a
                href="https://tiktok.com/@srvpinoy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-600"
              >
                <img
                  src="/images/external logo/tiktok.svg"
                  alt="TikTok"
                  className="h-7 w-7"
                />{" "}
                TikTok
              </a>
            </div>
          </div>
          <p className="text-base text-gray-600 italic">
            We aim to respond to all inquiries within 24 hours. Thank you for
            using SRV!
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpSupportPage;
