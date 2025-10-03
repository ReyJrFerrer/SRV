import "./shared/contact.css";
import { SiteHeader } from "./layout/SiteHeader";
import { SiteFooter } from "./layout/SiteFooter";
import { MobileSiteHeader } from "./layout/MobileSiteHeader";
import { useState } from "react";

interface ContactProps {
  onLoginClick: () => void;
  isLoginLoading: boolean;
  onNavigateToMain: () => void;
  onNavigateToAbout: () => void;
}

const Contact = ({
  onLoginClick,
  isLoginLoading,
  onNavigateToMain,
  onNavigateToAbout,
}: ContactProps) => {
  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);

  const handleLoginClick = () => {
    onLoginClick();
  };

  // -------------------- Contact Form State & Handlers --------------------
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage("");
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("subject", formData.subject);
      formDataToSend.append("message", formData.message);

      const response = await fetch("/contact-submit.php", {
        method: "POST",
        body: formDataToSend,
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      if (data.status === "success") {
        setMessageType("success");
        setFormMessage(data.message || "Message sent successfully.");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setMessageType("error");
        setFormMessage(data.message || "Submission failed.");
      }
    } catch (err) {
      setMessageType("error");
      setFormMessage(
        "Sorry, there was an error sending your message. Please try again or contact us directly.",
      );
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFormMessage(""), 5000);
    }
  };

  return (
    <div>
      <MobileSiteHeader
        current="contact"
        onHome={() => {
          onNavigateToMain?.();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onAbout={() => {
          onNavigateToAbout?.();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onContact={() => window.scrollTo(0, 0)}
        onLogin={handleLoginClick}
        isLoginLoading={isLoginLoading}
      />
      <SiteHeader
        current="contact"
        onHome={() => {
          onNavigateToMain?.();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onAbout={() => {
          onNavigateToAbout?.();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onContact={() => window.scrollTo(0, 0)}
        onLogin={handleLoginClick}
        isLoginLoading={isLoginLoading}
      />

      <section className="contact-section">
        <div className="container">
          <div className="contact-layout">
            <div className="contact-info">
              <h1 className="contact-title">Contact Us</h1>
              <p className="contact-description">
                Whether you're a homeowner needing services, a skilled service
                provider, or a local business partner — we're here to answer
                your questions and explore opportunities to connect our
                community.
              </p>
              <div className="contact-details">
                <div className="contact-item">
                  <div className="contact-icon email-icon">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="22,6 12,13 2,6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="contact-content">
                    <h3 className="contact-label">E-mail</h3>
                    <p className="contact-value">hello@srvpinoy.com</p>
                  </div>
                </div>

                <a
                  href="tel:+639939515571"
                  className="contact-item contact-phone-item"
                  aria-label="Call SRV at (+63) 993-951-5571"
                >
                  <div className="contact-icon phone-icon">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M22 16.92V20a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 5.18 2 2 0 0 1 5 3h3.09a1 1 0 0 1 1 .75c.12.66.36 1.3.7 1.88a1 1 0 0 1-.23 1.06L8.7 8.7a16 16 0 0 0 6.6 6.6l1.01-1.01a1 1 0 0 1 1.06-.23c.58.34 1.22.58 1.88.7a1 1 0 0 1 .75 1V20z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="contact-content contact-phone-text-wrapper">
                    <h3 className="contact-label">Phone</h3>
                    <p className="contact-value" style={{ margin: 0 }}>
                      (+63) 993-951-5571
                    </p>
                    <span className="contact-phone-cta">Tap to call</span>
                  </div>
                </a>

                <button
                  type="button"
                  className="contact-item contact-location-item"
                  aria-label="Open map showing location: InTT Office, University of the Cordilleras Legarda Campus, Basement 1, Legarda Road, Baguio City, Philippines"
                  onClick={() => setShowMapModal(true)}
                >
                  <div className="contact-icon location-icon">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="10"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="contact-content location-text-wrapper">
                    <h3 className="contact-label">Location</h3>
                    <p className="contact-value">
                      InTT Office, University of the Cordilleras Legarda Campus,
                      Basement 1, Legarda Road, Baguio City, Philippines
                    </p>
                    <span className="contact-location-cta">
                      Click to view map
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="contact-form-container">
              <form
                className="contact-form"
                id="contactForm"
                onSubmit={handleContactSubmit}
              >
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-input"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-input"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject" className="form-label">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="form-input"
                    placeholder="e.g. Partnership Inquiry, Feedback, Support"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message" className="form-label">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    className="form-textarea"
                    placeholder="Tell us about your inquiry, feedback, or how we can help you..."
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isSubmitting}
                >
                  <span className="btn-text">
                    {isSubmitting ? "Sending..." : "Submit"}
                  </span>
                  <div
                    className="loading-spinner"
                    style={{ display: isSubmitting ? "inline-block" : "none" }}
                  ></div>
                </button>
              </form>
              {formMessage && (
                <div
                  id="formMessage"
                  className={`form-message ${messageType}`}
                  style={{ display: "block" }}
                >
                  {formMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {showMapModal && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Map showing SRV location in Baguio City"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMapModal(false);
          }}
        >
          <div className="map-modal-content contact-map-modal">
            <button
              className="map-modal-close"
              aria-label="Close map"
              onClick={() => setShowMapModal(false)}
            >
              &times;
            </button>
            <div className="map-modal-header">
              <h3 className="map-modal-title">SRV Location</h3>
              <p className="map-modal-sub">
                University of the Cordilleras (Legarda Campus) • InTT Office
              </p>
            </div>
            <div className="map-modal-iframe-wrapper">
              <iframe
                title="SRV - University of the Cordilleras (Legarda Campus) map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3827.2841143403452!2d120.59157560000001!3d16.4103908!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3391a1685e7b7073%3A0xe6bda988e8558d2!2sUniversity%20of%20Cordilleras%20Legarda!5e0!3m2!1sen!2sph!4v1759030399917!5m2!1sen!2sph"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen={false}
              />
            </div>
          </div>
        </div>
      )}
      <SiteFooter
        current="contact"
        onHome={() => {
          onNavigateToMain?.();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onAbout={() => {
          onNavigateToAbout?.();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onContact={() => window.scrollTo(0, 0)}
      />
    </div>
  );
};

export default Contact;
