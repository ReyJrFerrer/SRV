import "./shared/contact.css";
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { SiteHeader } from "./layout/SiteHeader";
import { SiteFooter } from "./layout/SiteFooter";
import { MobileSiteHeader } from "./layout/MobileSiteHeader";
import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "../services/firebaseApp";

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
      // Get Firebase Functions instance using centralized service
      const functions = getFirebaseFunctions();
      const sendContactEmail = httpsCallable(functions, "sendContactEmail");

      // Call the Cloud Function
      const result = await sendContactEmail({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });

      const data = result.data as { status: string; message: string };

      if (data.status === "success") {
        setMessageType("success");
        setFormMessage(data.message || "Message sent successfully.");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setMessageType("error");
        setFormMessage(data.message || "Submission failed.");
      }
    } catch (err: any) {
      setMessageType("error");
      // Check if it's a Firebase Functions error
      if (err.code && err.message) {
        setFormMessage(err.message);
      } else {
        setFormMessage(
          "Sorry, there was an error sending your message. Please try again or contact us directly.",
        );
      }
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

      <div className="contact-page-wrapper">
        <section className="contact-section">
          <div className="contact-container">
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
                  <div className="contact-item contact-phone-item">
                    <div className="contact-icon email-icon">
                      <EnvelopeIcon className="h-6 w-6 text-current" />
                    </div>
                    <div className="contact-content contact-phone-text-wrapper">
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
                      <PhoneIcon className="h-6 w-6 text-current" />
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
                    aria-label="Open map showing location: InTTO Office, University of the Cordilleras Legarda Campus, Basement 1, Legarda Road, Baguio City, Philippines"
                    onClick={() => setShowMapModal(true)}
                  >
                    <div className="contact-icon location-icon">
                      <MapPinIcon className="h-6 w-6 text-current" />
                    </div>
                    <div className="contact-content location-text-wrapper">
                      <h3 className="contact-label">Location</h3>
                      <p className="contact-value">
                        InTTO Office, University of the Cordilleras Legarda
                        Campus, Basement 1, Legarda Road, Baguio City,
                        Philippines
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
                  <div className="contact-form-group">
                    <label htmlFor="name" className="contact-form-label">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="contact-form-input"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="contact-form-group">
                    <label htmlFor="email" className="contact-form-label">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="contact-form-input"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="contact-form-group">
                    <label htmlFor="subject" className="contact-form-label">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      className="contact-form-input"
                      placeholder="e.g. Partnership Inquiry, Feedback, Support"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="contact-form-group">
                    <label htmlFor="message" className="contact-form-label">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      className="contact-form-textarea"
                      placeholder="Tell us about your inquiry, feedback, or how we can help you..."
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="contact-btn-submit"
                    disabled={isSubmitting}
                  >
                    <span className="btn-text">
                      {isSubmitting ? "Sending..." : "Submit"}
                    </span>
                    <div
                      className="contact-loading-spinner"
                      style={{
                        display: isSubmitting ? "inline-block" : "none",
                      }}
                    ></div>
                  </button>
                </form>
                {formMessage && (
                  <div
                    id="formMessage"
                    className={`contact-form-message ${messageType}`}
                    style={{ display: "block" }}
                  >
                    {formMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
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

      {showMapModal && (
        <div
          className="contact-page-wrapper"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div
            className="contact-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Map showing SRV location in Baguio City"
            style={{ pointerEvents: "auto" }}
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
        </div>
      )}
    </div>
  );
};

export default Contact;
