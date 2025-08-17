import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const TermsAndConditionsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-blue-100 bg-white p-10 shadow-2xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-blue-700 hover:text-blue-900 focus:outline-none"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="font-medium">Back</span>
        </button>
        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.svg" alt="SRV Logo" className="mb-2 h-16 w-16" />
          <h1 className="text-center text-3xl font-extrabold tracking-tight text-blue-900">
            Terms and Conditions for SRV
          </h1>
        </div>
        <div className="space-y-6 text-lg text-gray-700">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
            <p>
              <strong>Effective Date: August 6, 2025</strong>
              <br />
              <br />
              Welcome to SRV! These Terms and Conditions ("Terms") govern your
              access to and use of the SRV website, mobile application, and
              related services (collectively, the "Platform"). The Platform is
              owned and operated by SRV, a platform based in Baguio City,
              Philippines.
              <br />
              <br />
              By creating an account, accessing, or using our Platform, you
              acknowledge that you have read, understood, and agree to be bound
              by these Terms, our Privacy Policy, and any other guidelines
              posted on the Platform. If you do not agree to these Terms, you
              must not use the Platform.
              <br />
              <br />
              This agreement is a legally binding electronic contract between
              you ("User," "you," "your") and SRV ("SRV," "we," "us," "our"), in
              accordance with the Republic Act No. 8792, also known as the
              E-Commerce Act of 2000.
              <br />
              <br />
              <strong>1. Definitions</strong>
              <br />
              Platform: Refers to the SRV website and mobile application.
              <br />
              User: Any individual who creates an account on the Platform,
              including Clients and Service Providers.
              <br />
              Client: A User who requests, books, and receives services from a
              Service Provider.
              <br />
              Service Provider (or Provider): A User who offers and performs
              services for Clients.
              <br />
              Service: The specific work or task performed by a Provider for a
              Client as listed on the Platform.
              <br />
              Commission Fee: The service fee charged by SRV to the Provider for
              the use of the Platform, calculated as a percentage of the total
              Service price.
              <br />
              Outstanding Commission: The cumulative, running balance of unpaid
              Commission Fees owed by a Provider to the Platform. This is a
              measure of debt and is not electronic money.
              <br />
              Commission Credit Limit: The maximum allowable Outstanding
              Commission a Provider may accrue before their ability to accept
              new jobs is automatically and temporarily restricted.
              <br />
              <br />
              <strong>2. The Platform's Role</strong>
              <br />
              SRV is a technology platform that connects Clients seeking
              services with independent Service Providers who can provide those
              services. You acknowledge that:
              <br />
              SRV is not an employer of Service Providers. Providers are
              independent contractors.
              <br />
              SRV is not a direct party to the agreements made between Clients
              and Providers.
              <br />
              SRV does not directly perform the Services and is not responsible
              for the quality, timing, legality, or any aspect of the Services
              provided, except as explicitly stated in these Terms. Our role is
              limited to facilitating the connection and providing the features
              described herein.
              <br />
              <br />
              <strong>3. User Accounts and Eligibility</strong>
              <br />
              Eligibility: To use the Platform, you must be at least 18 years
              old and have the legal capacity to enter into binding contracts.
              <br />
              Account Registration: You agree to provide accurate, current, and
              complete information during the registration process and to update
              such information to keep it accurate.
              <br />
              Account Security: You are solely responsible for safeguarding your
              account password and for all activities that occur under your
              account. You must notify us immediately of any unauthorized use of
              your account.
              <br />
              <br />
              <strong>4. Financial Terms for Service Providers</strong>
              <br />
              This section governs the financial relationship between Service
              Providers and the Platform.
              <br />
              Cash Payments: The primary method of payment for Services is a
              direct cash payment from the Client to the Service Provider upon
              completion of the Service. The Platform does not process these
              payments.
              <br />
              Commission Fee: In consideration for the use of the Platform, the
              Provider agrees to pay SRV a Commission Fee for each completed job
              booked through the Platform. The applicable percentage will be
              displayed to the Provider before they accept a job.
              <br />
              Accrual of Outstanding Commission: Upon confirmation that a
              cash-based job is complete, the Platform will automatically
              calculate the Commission Fee and add this amount to the Provider's
              Outstanding Commission balance. This is an automated accounting of
              debt owed to the Platform.
              <br />
              Payment of Outstanding Commission: Providers are obligated to
              settle their Outstanding Commission balance regularly. Payments
              shall be made via GCash to the official company account specified
              within the Platform. Providers must submit proof of payment (e.g.,
              a transaction receipt screenshot) through the designated in-app
              upload facility for verification.
              <br />
              Commission Credit Limit: The Platform enforces a Commission Credit
              Limit (e.g., ₱500.00). If a Provider's Outstanding Commission
              meets or exceeds this limit, their account will be automatically
              and temporarily restricted from accepting new job requests. This
              restriction will be lifted automatically once their Outstanding
              Commission is paid and verified, bringing their balance below the
              limit. By using the Platform, you explicitly agree to this
              condition as a fundamental part of the service.
              <br />
              Disputes: Any disputes regarding commission calculations must be
              raised through the Platform's support channels within seven (7)
              days of the transaction.
              <br />
              <br />
              <strong>5. User Obligations and Conduct</strong>
              <br />
              All Users Agree To:
              <br />
              Use the Platform in compliance with all applicable laws of the
              Republic of the Philippines.
              <br />
              Provide truthful and non-misleading information.
              <br />
              Communicate respectfully with other Users.
              <br />
              Service Providers Agree To:
              <br />
              Accurately represent their skills, qualifications, and the
              services they offer.
              <br />
              Perform Services to a professional standard of quality, in
              compliance with the Consumer Act of the Philippines (Republic Act
              No. 7394).
              <br />
              Maintain the confidentiality of Client information.
              <br />
              Clients Agree To:
              <br />
              Provide a safe environment for Providers to perform their
              services.
              <br />
              Make full cash payment directly to the Provider for services
              rendered.
              <br />
              <br />
              <strong>6. Reviews and User Content</strong>
              <br />
              Users may post reviews, ratings, and other content ("User
              Content"). You grant SRV a non-exclusive, worldwide, perpetual,
              royalty-free license to use, display, and distribute your User
              Content in connection with the Platform.
              <br />
              You are solely responsible for your User Content. You agree not to
              post content that is false, defamatory, obscene, or infringing on
              any third-party rights, including intellectual property rights
              under the Intellectual Property Code of the Philippines (Republic
              Act No. 8293).
              <br />
              <br />
              <strong>7. Account Termination</strong>
              <br />
              You may terminate your account at any time by contacting our
              support team, provided you have no outstanding financial
              obligations to the Platform or other users.
              <br />
              We may, at our sole discretion, suspend or terminate your account
              and access to the Platform without prior notice for any breach of
              these Terms, including but not limited to:
              <br />
              Failure to settle your Outstanding Commission in a timely manner.
              <br />
              Receiving consistently poor reviews or committing fraudulent acts.
              <br />
              Violating any applicable laws.
              <br />
              <br />
              <strong>8. Disclaimers and Limitation of Liability</strong>
              <br />
              Disclaimer of Warranty: The Platform is provided "as is" and "as
              available" without any warranties of any kind. We do not guarantee
              that the Platform will be error-free or uninterrupted, nor do we
              guarantee the quality or safety of the services provided by
              Service Providers.
              <br />
              Limitation of Liability: To the fullest extent permitted by law,
              SRV shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits or
              revenues, whether incurred directly or indirectly, or any loss of
              data, use, goodwill, or other intangible losses, resulting from
              (a) your use of the Platform; (b) any conduct or content of any
              third party on the Platform, including any defamatory, offensive,
              or illegal conduct of other users or third parties; or (c) any
              services provided by Service Providers.
              <br />
              <br />
              <strong>9. Data Privacy</strong>
              <br />
              Your privacy is important to us. We collect and process your
              personal data in accordance with our Privacy Policy and the Data
              Privacy Act of 2012 (Republic Act No. 10173). By using the
              Platform, you consent to such collection and processing. Please
              review our Privacy Policy for more information.
              <br />
              <br />
              <strong>10. General Provisions</strong>
              <br />
              Governing Law and Venue: These Terms shall be governed by and
              construed in accordance with the laws of the Republic of the
              Philippines. You agree that any legal action or proceeding arising
              out of these Terms shall be brought exclusively in the competent
              courts of Baguio City.
              <br />
              Changes to Terms: We reserve the right to modify these Terms at
              any time. We will provide notice of any significant changes. Your
              continued use of the Platform after such changes constitutes your
              acceptance of the new Terms.
              <br />
              Contact Information: For any questions about these Terms, please
              contact us at support@srvpinoy.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;
