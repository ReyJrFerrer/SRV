import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import BottomNavigation from "../../../components/provider/NavigationBar";

const TermsAndConditionsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="mx-auto w-full max-w-2xl flex-1 rounded-3xl border border-blue-100 bg-white p-10 shadow-2xl">
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
            <div className="mb-4">
              <p>
                <strong>Effective Date: August 6, 2025</strong>
              </p>
              <p className="mt-2">
                <b>Welcome to SRV!</b> These Terms and Conditions ("Terms")
                govern your access to and use of the SRV app, including all
                content, features, and services offered through it
                (collectively, the "Platform" or "Services"). The Platform is
                owned and operated by SRV, a platform based in Baguio City,
                Philippines.
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
              <p className="mt-2">
                This agreement is a legally binding electronic contract between
                you ("User," "you," "your") and SRV ("SRV," "we," "us," "our"),
                in accordance with the Republic Act No. 8792 (E-Commerce Act of
                2000).
              </p>
            </div>

            <ol className="list-none pl-1">
              <li>
                <strong>1. Definitions</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>Platform:</b> The SRV mobile application and associated
                    web or backend systems.
                  </li>
                  <li>
                    <b>User:</b> Any individual or entity accessing or using the
                    Platform, including Clients and Service Providers.
                  </li>
                  <li>
                    <b>Client:</b> A User who requests, books, or receives
                    services via the Platform.
                  </li>
                  <li>
                    <b>Service Provider (or Provider):</b> A User who offers
                    services via the Platform.
                  </li>
                  <li>
                    <b>Service:</b> The work, tasks, or services offered by
                    Service Providers and requested by Clients via the Platform.
                  </li>
                  <li>
                    <b>Platform Services:</b> The features offered by the
                    company, including facilitating connections, enabling
                    bookings, communication channels, and payment coordination.
                  </li>
                  <li>
                    <b>Content:</b> Any text, images, video, audio, or other
                    materials submitted or made available via the Platform by
                    Users or the company.
                  </li>
                  <li>
                    <b>Blockchain Features:</b> Functionalities using blockchain
                    (e.g. wallet authentication, smart contract escrow, ledger
                    records).
                  </li>
                  <li>
                    <b>Commission Fee:</b> The service fee charged by SRV to the
                    Provider for the use of the Platform, calculated as a
                    percentage of the total Service price.
                  </li>
                  <li>
                    <b>Outstanding Commission:</b> The cumulative, running
                    balance of unpaid Commission Fees owed by a Provider to the
                    Platform. This is a measure of debt and is not electronic
                    money.
                  </li>
                  <li>
                    <b>Commission Credit Limit:</b> The maximum allowable
                    Outstanding Commission a Provider may accrue before their
                    ability to accept new jobs is automatically and temporarily
                    restricted.
                  </li>
                </ul>
              </li>

              <li>
                <strong>2. Eligibility</strong>
                <ul className="mt-1 list-disc pl-5">
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
              </li>

              <li>
                <strong>3. Account Registration and Security</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>Accuracy:</b> Each User must provide current, accurate,
                    and complete information during registration and update it
                    as needed.
                  </li>
                  <li>
                    <b>Account Verification:</b> You agree to provide accurate,
                    current, and complete information during the registration
                    process and to update such information to keep it accurate.
                  </li>
                  <li>
                    <b>Security:</b> Users bear sole responsibility for
                    safeguarding their account credentials. All activity under
                    an account is the User's responsibility. Any suspected
                    unauthorized access or security breach must be reported
                    immediately. The company is not liable for losses from a
                    User's failure to protect their account.
                  </li>
                </ul>
              </li>

              <li>
                <strong>4. The Platform's Role</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>Marketplace Role:</b> SRV is a facilitator and technology
                    platform connecting Clients and Service Providers.
                  </li>
                  <li>
                    <b>Independent Contractors:</b> Service Providers are
                    independent contractors, not employees, agents, or partners
                    of SRV. SRV does not control the manner in which Service
                    Providers perform services.
                  </li>
                  <li>
                    <b>Bridge Role:</b> SRV does not directly perform the
                    Services and is not responsible for the quality, timing,
                    legality, or any aspect of the Services provided, except as
                    explicitly stated in these Terms. Our role is limited to
                    facilitating the connection and providing the features
                    described herein.
                  </li>
                  <li>
                    <b>No Endorsement:</b> Although the Platform may include
                    reviews, ratings, and verification systems, SRV does not
                    guarantee or endorse the quality, safety, or reliability of
                    any Service Provider or service.
                  </li>
                </ul>
              </li>

              <li>
                <strong>5. User Obligations and Conduct</strong>
                <ul className="mt-1 pl-5">
                  <li>
                    <b>All Users Agree To:</b>
                    <ul className="mt-1 list-disc pl-5">
                      <li>
                        Use the Platform in compliance with all applicable laws
                        of the Republic of the Philippines.
                      </li>
                      <li>Provide truthful and non-misleading information.</li>
                      <li>Communicate respectfully with other Users.</li>
                    </ul>
                  </li>
                  <li>
                    <b>Service Providers Agree To:</b>
                    <ul className="mt-1 list-disc pl-5">
                      <li>
                        Accurately represent their skills, qualifications, and
                        the services they offer.
                      </li>
                      <li>
                        Perform Services to a professional standard of quality,
                        in compliance with the Consumer Act of the Philippines
                        (Republic Act No. 7394).
                      </li>
                      <li>
                        Maintain the confidentiality of Client information.
                      </li>
                    </ul>
                  </li>
                  <li>
                    <b>Clients Agree To:</b>
                    <ul className="mt-1 list-disc pl-5">
                      <li>
                        Provide a safe environment for Providers to perform
                        their services.
                      </li>
                      <li>
                        Make full cash payment directly to the Provider for
                        services rendered.
                      </li>
                    </ul>
                  </li>
                  <li>
                    <b>Prohibited Activities:</b> Users must not use the
                    Platform to:
                    <ul className="mt-1 list-disc pl-5">
                      <li>Violate laws or regulations.</li>
                      <li>
                        Engage in fraudulent, deceptive, or misleading behavior.
                      </li>
                      <li>Infringe intellectual property or other rights.</li>
                      <li>
                        Harass, threaten, defame, or discriminate against
                        others.
                      </li>
                      <li>
                        Submit or transmit unlawful, harmful, or objectionable
                        content.
                      </li>
                      <li>Request or provide illegal services.</li>
                      <li>
                        Impersonate any person or misrepresent affiliations.
                      </li>
                      <li>Distribute malware or malicious code.</li>
                      <li>Attempt unauthorized access to systems or data.</li>
                      <li>
                        Reverse engineer or tamper with the Platform's software.
                      </li>
                      <li>
                        Disrupt Platform operations or interfere with Blockchain
                        Features.
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>

              <li>
                <strong>6. Client-specific Terms</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>Booking:</b> Clients request services by providing
                    necessary details. A booking becomes valid only upon
                    acceptance by a Service Provider.
                  </li>
                  <li>
                    <b>Communication:</b> All communication about bookings
                    should be through in-app tools unless otherwise agreed.
                  </li>
                  <li>
                    <b>Verification & Completion:</b> Clients should confirm
                    satisfactory completion of service before Service Provider
                    marks booking as complete.
                  </li>
                  <li>
                    <b>Cancellations:</b> Cancellations may incur sanctions per
                    Service Provider policy or Platform rules. A reason may be
                    required.
                  </li>
                  <li>
                    <b>Ratings & Reviews:</b> Clients should provide honest,
                    fair feedback based on their experience.
                  </li>
                </ul>
              </li>

              <li>
                <strong>7. Service Provider-specific Terms</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>Profile & Services:</b> Service Providers must maintain
                    an accurate profile, clearly describe offerings, pricing,
                    availability, and any special terms.
                  </li>
                  <li>
                    <b>Credentials & KYC:</b> Providers must comply with
                    verification requests. Misrepresentation may result in
                    suspension or termination.
                  </li>
                  <li>
                    <b>Booking Management:</b> Providers should respond promptly
                    to requests and manage their schedule professionally.
                  </li>
                  <li>
                    <b>Service Delivery:</b> Services must be delivered
                    securely, safely, and per agreed terms. Providers should
                    provide status updates or proof of work when required.
                  </li>
                  <li>
                    <b>Location & Tracking:</b> Location sharing may be used
                    during service delivery.
                  </li>
                  <li>
                    <b>Cancellations:</b> Providers must adhere to cancellation
                    policies and may incur penalties for unjustified
                    cancellations.
                  </li>
                  <li>
                    <b>Review Feedback:</b> Clients and Providers may report
                    unfair feedback to the admin for review.
                  </li>
                  <li>
                    <b>Independent Contractor:</b> Providers are responsible for
                    their own taxes, insurance, equipment, and regulatory
                    compliance.
                  </li>
                  <li>
                    <b>Cash Payments:</b> The primary method of payment for
                    Services is a direct cash payment from the Client to the
                    Service Provider upon completion of the Service. The
                    Platform does not process these payments.
                  </li>
                  <li>
                    <b>Commission Fee:</b> In consideration for the use of the
                    Platform, the Provider agrees to pay SRV a Commission Fee
                    for each completed job booked through the Platform. The
                    applicable percentage will be displayed to the Provider
                    before they accept a job.
                  </li>
                  <li>
                    <b>Accrual of Outstanding Commission:</b> Upon confirmation
                    that a cash-based job is complete, the Platform will
                    automatically calculate the Commission Fee and add this
                    amount to the Provider's Outstanding Commission balance.
                    This is an automated accounting of debt owed to the
                    Platform.
                  </li>
                  <li>
                    <b>Payment of Outstanding Commission:</b> Providers are
                    obligated to settle their Outstanding Commission balance
                    regularly. Payments shall be made via GCash to the official
                    company account specified within the Platform. Providers
                    must submit proof of payment (e.g., a transaction receipt
                    screenshot) through the designated in-app upload facility
                    for verification.
                  </li>
                  <li>
                    <b>Commission Credit Limit:</b> The Platform enforces a
                    Commission Credit Limit (e.g., ₱500.00). If a Provider's
                    Outstanding Commission meets or exceeds this limit, their
                    account will be automatically and temporarily restricted
                    from accepting new job requests. This restriction will be
                    lifted automatically once their Outstanding Commission is
                    paid and verified, bringing their balance below the limit.
                    By using the Platform, you explicitly agree to this
                    condition as a fundamental part of the service.
                  </li>
                  <li>
                    <b>Disputes:</b> Any disputes regarding commission
                    calculations must be raised through the Platform's support
                    channels within seven (7) days of the transaction.
                  </li>
                  <li>
                    <b>Performance Monitoring and Provider Accountability:</b>
                    The platform monitors provider performance in real-time
                    based on ratings, complaints, and job completion rates.
                    Automated alerts are issued if a provider's average rating
                    falls below a set threshold. Providers with low ratings
                    receive in-app or email notifications including feedback and
                    improvement tips, and are given time to improve. Failure to
                    show improvement may result in temporary suspension of new
                    bookings. Continued poor performance or verified serious
                    complaints may lead to permanent account deactivation. All
                    actions are documented, and providers are notified formally.
                    Providers have the right to appeal suspensions or
                    deactivations within a specified period, with appeals
                    reviewed by an admin or quality assurance team. Accounts may
                    be reinstated if unfair ratings or system errors are
                    verified.
                  </li>
                </ul>
              </li>

              <li>
                <strong>8. Payments</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>Cash Transactions:</b> Payments between Client and
                    Service Provider may occur outside the Platform (e.g. cash).
                    SRV's role is to facilitate and record confirmations but SRV
                    is not liable for nonpayment or disputes in cash
                    transactions.
                  </li>
                  <li>
                    <b>Fees:</b> Any service or platform fees (if applicable)
                    will be clearly disclosed.
                  </li>
                  <li>
                    <b>Taxes:</b> Users are responsible for determining,
                    withholding, and paying applicable taxes.
                  </li>
                  <li>
                    <b>Refunds:</b> For cash payments, refund matters must be
                    handled directly between Client and Service Provider.
                  </li>
                </ul>
              </li>

              <li>
                <strong>9. Reviews and User Content</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>User Content:</b> Users may post reviews, ratings, and
                    other content ("User Content"). You grant SRV a
                    non-exclusive, worldwide, perpetual, royalty-free license to
                    use, display, and distribute your User Content in connection
                    with the Platform.
                  </li>
                  <li>
                    <b>User Responsibility:</b> You are solely responsible for
                    your User Content. You agree not to post content that is
                    false, defamatory, obscene, or infringing on any third-party
                    rights, including intellectual property rights under the
                    Intellectual Property Code of the Philippines (Republic Act
                    No. 8293).
                  </li>
                  <li>
                    <b>Independence of Reviews:</b> Reviews and ratings
                    published on the online application are solely the opinions
                    of the individual users who submit them and do not reflect
                    the opinions, views, or endorsement of SRV. SRV disclaims
                    all liability for the accuracy or content of any
                    user-submitted review.
                  </li>
                  <li>
                    <b>Moderation Rights:</b> SRV reserves the absolute right to
                    monitor, edit, remove, or otherwise moderate any review that
                    is deemed to violate these Terms and Conditions, including
                    but not limited to content that is unlawful, abusive,
                    defamatory, or infringes on the rights of others.
                  </li>
                  <li>
                    <b>Dispute Resolution:</b> All disputes related to the
                    content or existence of a user review, which cannot be
                    resolved directly between the user and the service provider,
                    may be escalated to the platform's administration for a
                    final determination.
                  </li>
                </ul>
              </li>

              <li>
                <strong>10. Dispute Resolution</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>User-to-User:</b> Clients and Providers are encouraged to
                    try to resolve disputes directly.
                  </li>
                  <li>
                    <b>Platform Mediation:</b> If unresolved, Users may file a
                    dispute through the Platform, submitting relevant evidence
                    (e.g. communications, photos).
                  </li>
                  <li>
                    <b>Admin Decision:</b> SRV admins will review the dispute
                    and make a final decision. For cash transactions, the admin
                    acts primarily as mediator, since SRV does not hold the
                    funds. The admin's ruling is final and binding.
                  </li>
                  <li>
                    <b>Sanctions:</b> SRV may suspend or terminate accounts
                    involved in repeated or fraudulent disputes.
                  </li>
                  <li>
                    <b>Additional Services and Scope of Work:</b> Any services
                    or work requested by the client and performed by the service
                    provider that fall outside the scope of the original booking
                    made through the online application are considered separate
                    agreements. SRV is not responsible for the negotiation,
                    payment, execution, or resolution of disputes concerning
                    these additional services.
                  </li>
                </ul>
              </li>

              <li>
                <strong>11. Cancellation Policy</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>Online Payments:</b> For services paid for in advance
                    through SRV, the funds will be securely held by SRV until
                    the service is marked as complete. In the event the Client
                    properly initiates a dispute and a full refund is approved
                    by the platform, 100% of the pre-paid amount will be
                    returned to the Client.
                  </li>
                  <li>
                    <b>Transaction Completion:</b> Once the Service Provider
                    confirms completion of the service and the pre-paid online
                    payment is released to them, the transaction is deemed final
                    and complete. At this point, the funds are outside the
                    control of the platform and cannot be unilaterally recalled
                    or refunded to the Client.
                  </li>
                  <li>
                    <b>Evidence and Resolution:</b> In the event the Client is
                    unable to file a dispute report (or to support a claim of
                    non-payment), the Service Provider must provide substantial
                    evidence (e.g., time logs, before/after photos,
                    communications) for review by the platform's administration.
                    The administration will use all available evidence from both
                    parties to make a final and binding decision on the dispute.
                  </li>
                </ul>
              </li>

              <li>
                <strong>12. Intellectual Property</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>Platform IP:</b> All content, software, features, and
                    trademarks belonging to SRV (excluding User Content) remain
                    its exclusive property.
                  </li>
                  <li>
                    <b>User License:</b> Users are granted a limited,
                    non-exclusive, non-transferable, revocable license to use
                    the Platform per these Terms.
                  </li>
                  <li>
                    <b>User Content:</b> Users retain ownership of their
                    submitted content. By posting, Users grant SRV a worldwide,
                    non-exclusive, royalty-free license (including sublicensing)
                    to use, display, adapt, distribute, or promote that content
                    in connection with the Platform.
                  </li>
                </ul>
              </li>

              <li>
                <strong>13. Privacy</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    SRV's collection, use, and protection of personal data are
                    governed by its Privacy Policy. Users agree to the terms of
                    the Privacy Policy.
                  </li>
                </ul>
              </li>

              <li>
                <strong>14. Third-Party Services</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    The Platform integrates with third-party services (payment
                    gateways, mapping APIs, identity verification, etc.). Use of
                    such services is subject to their own terms and privacy
                    policies. SRV is not liable for their performance,
                    availability, or security.
                  </li>
                </ul>
              </li>

              <li>
                <strong>15. Disclaimers</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    THE PLATFORM AND SERVICES ARE PROVIDED “AS IS” AND “AS
                    AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                    IMPLIED (including merchantability, fitness for a purpose,
                    or non-infringement).
                  </li>
                  <li>
                    SRV does not guarantee uninterrupted, secure, or error- free
                    operation, nor that defects will be corrected or the
                    Platform will be virus-free.
                  </li>
                  <li>
                    SRV makes no warranties about services provided by Service
                    Providers, including their quality, timeliness, or legality.
                  </li>
                  <li>
                    SRV disclaims all liability regarding blockchain features:
                    loss of funds, smart contract failures, network issues, or
                    user wallet errors.
                  </li>
                </ul>
              </li>

              <li>
                <strong>16. Limitation of Liability</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    To the fullest extent permitted under Philippine law,
                    neither SRV nor its directors, officers, employees, or
                    agents shall be liable for indirect, incidental, special,
                    consequential, or punitive damages (e.g. loss of profits,
                    data, goodwill) arising out of use or inability to use the
                    Platform, user interactions, third-party services, or
                    blockchain features.
                  </li>
                  <li>
                    In no event shall SRV's aggregate liability exceed the
                    greater of PHP 100.00 or the total Platform fees paid by the
                    User during the six (6) months immediately preceding the
                    event giving rise to liability.
                  </li>
                </ul>
              </li>

              <li>
                <strong>17. Indemnification</strong>
                <ul className="mt-1 pl-5">
                  <li>
                    Users agree to defend, indemnify, and hold harmless SRV, its
                    affiliates, officers, directors, employees, agents,
                    licensors, and successors from claims, liabilities, damages,
                    losses, costs, or expenses (including reasonable attorneys'
                    fees) arising from:
                    <ul className="mt-1 list-disc pl-5">
                      <li>Use of the Platform in violation of these Terms,</li>
                      <li>User Content,</li>
                      <li>Disputes involving Services,</li>
                      <li>
                        Any other misuse of the Platform or infringement of
                        third-party rights.
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>

              <li>
                <strong>18. Termination</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <b>By User:</b> You may terminate your account at any time
                    via the app or by contacting support.
                  </li>
                  <li>
                    <b>By SRV:</b> The company may suspend or terminate a User's
                    access at any time, for any reason, including breach of
                    these Terms.
                  </li>
                  <li>
                    <b>Effect of Termination:</b> Upon termination, all rights
                    to use the Platform cease immediately. Provisions that
                    should survive (e.g. ownership, disclaimers,
                    indemnification, dispute resolution) will remain in force.
                    Outstanding obligations, payments, or disputes may still
                    need resolution.
                  </li>
                </ul>
              </li>

              <li>
                <strong>19. Governing Law and Venue</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    These Terms are governed by Philippine law, without regard
                    to conflict of law principles. Any legal proceedings shall
                    be brought exclusively in courts located in Baguio City,
                    Philippines.
                  </li>
                </ul>
              </li>

              <li>
                <strong>20. Changes to Terms</strong>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    SRV may modify or replace these Terms at its sole
                    discretion. For material changes, reasonable notice will be
                    provided (e.g. via in-app notification or email) before the
                    new version takes effect.
                  </li>
                  <li>
                    Continued use after modifications constitutes acceptance of
                    the new Terms.
                  </li>
                </ul>
              </li>
              <br />
              <li>
                Contact Information: For any questions about these Terms, please
                contact us at <strong>hello@srvpinoy.com</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default TermsAndConditionsPage;
