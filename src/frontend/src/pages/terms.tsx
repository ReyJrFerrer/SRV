import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import BottomNavigation from "../components/client/NavigationBar";

const TermsAndConditionsPage: React.FC = () => {
  const navigate = useNavigate();
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
          <h1 className="text-xl font-black tracking-tight text-blue-950">
            Terms
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          {/* Logo and Title */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-center text-2xl font-black tracking-tight text-blue-950">
              Terms and Conditions
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Effective Date: August 6, 2025
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-6 text-base text-gray-700">
            {/* Welcome Section */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
              <p className="font-bold text-blue-950">Welcome to SRV!</p>
              <p className="mt-2">
                These Terms and Conditions ("Terms") govern your access to and
                use of the SRV app, including all content, features, and
                services offered through it (collectively, the "Platform" or
                "Services"). The Platform is owned and operated by SRV, a
                platform based in Baguio City, Philippines.
              </p>
              <p className="mt-2">
                The Platform connects users seeking on-demand services
                ("Clients") with independent service providers ("Service
                Providers") across the Philippines.
              </p>
              <p className="mt-2">
                By downloading, accessing, registering, or using the Platform in
                any way, you acknowledge that you have read, understood, and
                agree to be bound by these Terms and our Privacy Policy. If you
                do not agree to all of these Terms or the Privacy Policy, you
                must not use the Platform.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                This agreement is a legally binding electronic contract between
                you ("User," "you," "your") and SRV ("SRV," "we," "us," "our"),
                in accordance with the Republic Act No. 8792 (E-Commerce Act of
                2000).
              </p>
            </div>

            {/* Section 1 */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <h2 className="mb-3 text-lg font-black text-blue-950">
                1. Definitions
              </h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="font-bold text-gray-900">Platform:</span> The
                  SRV mobile application and associated web or backend systems.
                </li>
                <li>
                  <span className="font-bold text-gray-900">User:</span> Any
                  individual or entity accessing or using the Platform,
                  including Clients and Service Providers.
                </li>
                <li>
                  <span className="font-bold text-gray-900">Client:</span> A
                  User who requests, books, or receives services via the
                  Platform.
                </li>
                <li>
                  <span className="font-bold text-gray-900">
                    Service Provider:
                  </span>{" "}
                  A User who offers services via the Platform.
                </li>
                <li>
                  <span className="font-bold text-gray-900">Service:</span> The
                  work, tasks, or services offered by Service Providers and
                  requested by Clients.
                </li>
                <li>
                  <span className="font-bold text-gray-900">
                    Platform Services:
                  </span>{" "}
                  The features offered by the company, including facilitating
                  connections, enabling bookings, communication channels, and
                  payment coordination.
                </li>
                <li>
                  <span className="font-bold text-gray-900">Content:</span> Any
                  text, images, video, audio, or other materials submitted via
                  the Platform.
                </li>
                <li>
                  <span className="font-bold text-gray-900">
                    Blockchain Features:
                  </span>{" "}
                  Functionalities using blockchain (e.g. wallet authentication,
                  smart contract escrow).
                </li>
                <li>
                  <span className="font-bold text-gray-900">
                    Commission Fee:
                  </span>{" "}
                  The service fee charged by SRV to the Provider, calculated as
                  a percentage of the total Service price.
                </li>
                <li>
                  <span className="font-bold text-gray-900">
                    Outstanding Commission:
                  </span>{" "}
                  The cumulative balance of unpaid Commission Fees owed by a
                  Provider.
                </li>
                <li>
                  <span className="font-bold text-gray-900">
                    Commission Credit Limit:
                  </span>{" "}
                  The maximum allowable Outstanding Commission before a
                  Provider's ability to accept new jobs is restricted.
                </li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <h2 className="mb-3 text-lg font-black text-blue-950">
                2. Eligibility
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Be at least 18 years old.</li>
                <li>
                  Be legally capable of entering binding contracts under
                  Philippine law.
                </li>
                <li>
                  Reside in the Philippines and be within a service area
                  currently supported by SRV.
                </li>
                <li>
                  Agree to abide by these Terms and all applicable laws and
                  regulations.
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <h2 className="mb-3 text-lg font-black text-blue-950">
                3. Account Registration and Security
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>
                  <span className="font-bold">Accuracy:</span> Each User must
                  provide current, accurate, and complete information during
                  registration.
                </li>
                <li>
                  <span className="font-bold">Account Verification:</span> You
                  agree to provide accurate information and keep it updated.
                </li>
                <li>
                  <span className="font-bold">Security:</span> Users bear sole
                  responsibility for safeguarding their account credentials. Any
                  suspected unauthorized access must be reported immediately.
                </li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <h2 className="mb-3 text-lg font-black text-blue-950">
                4. The Platform's Role
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>
                  <span className="font-bold">Marketplace Role:</span> SRV is a
                  facilitator connecting Clients and Service Providers.
                </li>
                <li>
                  <span className="font-bold">Independent Contractors:</span>{" "}
                  Service Providers are independent contractors, not employees
                  of SRV.
                </li>
                <li>
                  <span className="font-bold">Bridge Role:</span> SRV does not
                  directly perform Services and is not responsible for quality
                  except as stated.
                </li>
                <li>
                  <span className="font-bold">No Endorsement:</span> SRV does
                  not guarantee the quality, safety, or reliability of any
                  Service Provider.
                </li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <h2 className="mb-3 text-lg font-black text-blue-950">
                5. User Obligations and Conduct
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>
                  <span className="font-bold">All Users:</span> Use Platform in
                  compliance with applicable laws, provide truthful information,
                  communicate respectfully.
                </li>
                <li>
                  <span className="font-bold">Service Providers:</span>{" "}
                  Accurately represent skills, perform services professionally,
                  maintain confidentiality.
                </li>
                <li>
                  <span className="font-bold">Clients:</span> Provide a safe
                  environment, make full cash payment to Provider.
                </li>
                <li>
                  <span className="font-bold">Prohibited Activities:</span> No
                  violations, fraud, harassment, illegal services,
                  impersonation, malware, or unauthorized access.
                </li>
              </ul>
            </div>

            {/* Section 6-8 (simplified) */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <h2 className="mb-3 text-lg font-black text-blue-950">
                6. Client-specific Terms
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>
                  <span className="font-bold">Booking:</span> Valid only upon
                  acceptance by a Service Provider.
                </li>
                <li>
                  <span className="font-bold">Communication:</span> Through
                  in-app tools unless otherwise agreed.
                </li>
                <li>
                  <span className="font-bold">Verification:</span> Clients
                  should confirm satisfactory completion.
                </li>
                <li>
                  <span className="font-bold">Cancellations:</span> May incur
                  sanctions per policy.
                </li>
                <li>
                  <span className="font-bold">Ratings:</span> Provide honest,
                  fair feedback.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <h2 className="mb-3 text-lg font-black text-blue-950">
                7. Service Provider-specific Terms
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>
                  <span className="font-bold">Profile:</span> Maintain accurate
                  profile and pricing.
                </li>
                <li>
                  <span className="font-bold">Credentials:</span> Comply with
                  verification requests.
                </li>
                <li>
                  <span className="font-bold">Service Delivery:</span> Deliver
                  securely and per agreed terms.
                </li>
                <li>
                  <span className="font-bold">Commission Fee:</span> Percentage
                  displayed before accepting a job.
                </li>
                <li>
                  <span className="font-bold">Payment:</span> Via GCash to
                  official company account.
                </li>
                <li>
                  <span className="font-bold">Commission Credit Limit:</span>{" "}
                  Automatic restriction when limit is reached.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <h2 className="mb-3 text-lg font-black text-blue-950">
                8. Payments
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>
                  <span className="font-bold">Cash Transactions:</span> Between
                  Client and Provider, SRV is not liable.
                </li>
                <li>
                  <span className="font-bold">Taxes:</span> Users are
                  responsible for applicable taxes.
                </li>
              </ul>
            </div>

            {/* Sections 9-20 (condensed) */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <h2 className="mb-3 text-lg font-black text-blue-950">
                9-20. Additional Terms
              </h2>
              <p className="text-sm text-gray-600">
                Additional sections cover Reviews and User Content, Dispute
                Resolution, Cancellation Policy, Intellectual Property, Privacy,
                Third-Party Services, Disclaimers, Limitation of Liability,
                Indemnification, Termination, Governing Law, and Changes to
                Terms. Full details available in the complete document.
              </p>
            </div>

            {/* Contact */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
              <p className="text-center font-bold text-blue-950">
                Questions? Contact us at{" "}
                <a
                  href="mailto:hello@srvpinoy.com"
                  className="text-blue-600 underline hover:text-blue-700"
                >
                  hello@srvpinoy.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default TermsAndConditionsPage;
