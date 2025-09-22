import {
  FingerPrintIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { useState } from "react";
import "./shared/styles.css";

interface MainPageProps {
  onLoginClick: () => void;
  isLoginLoading: boolean;
  onNavigateToAbout: () => void;
}

export default function MainPage({
  onLoginClick,
  isLoginLoading,
  onNavigateToAbout,
}: MainPageProps) {
  // Modal for Internet Identity info
  const [showIdentityInfoModal, setShowIdentityInfoModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Handler for login button click
  const handleLoginClick = () => {
    setShowIdentityInfoModal(true);
    // Close mobile menu if it's open
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      const nav = document.querySelector(".main-nav");
      nav?.classList.remove("active");
    }
  };

  // Handler for confirming identity info
  const handleConfirmIdentityInfo = () => {
    setShowIdentityInfoModal(false);
    onLoginClick();
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    const nav = document.querySelector(".main-nav");
    nav?.classList.toggle("active");
  };

  return (
    <div>
      {/* Internet Identity Info Modal (top-level, so all buttons trigger it) */}
      {showIdentityInfoModal && (
        <div
          className="fixed inset-0 z-50 mt-10 flex items-center justify-center bg-black/70"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIdentityInfoModal(false);
          }}
        >
          <div
            className={`relative w-full max-w-md rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 shadow-2xl ${
              showHowItWorks ? "max-h-[90vh] overflow-y-auto" : ""
            }`}
            style={
              showHowItWorks ? { maxHeight: "90vh", overflowY: "auto" } : {}
            }
          >
            <button
              className="absolute top-3 right-3 rounded-full border border-gray-300 bg-gray-100 p-2 hover:bg-gray-200"
              onClick={() => setShowIdentityInfoModal(false)}
              aria-label="Close"
              tabIndex={0}
            >
              <span className="text-xl font-bold text-gray-700">&times;</span>
            </button>
            <div className="mb-4 flex flex-col items-center">
              <img
                src="/images/srv characters (SVG)/tech guy.svg"
                alt="Tech Guy"
                className="mb-2 h-20 w-20 drop-shadow"
              />
              <h2 className="mb-1 text-2xl font-extrabold text-blue-700">
                Internet Identity Login
              </h2>
              <span className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                Secure & Private
              </span>
            </div>
            <div className="mb-6 text-center">
              <p className="mb-2 text-base text-gray-700">
                You will be redirected to Internet Identity to securely log in
                or sign up.
              </p>
              <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                <strong className="mb-1 block text-blue-700">
                  Why is this important?
                </strong>
                <span className="text-sm text-gray-700">
                  Internet Identity protects your privacy and security,{" "}
                  <strong>
                    allowing you to use SRV without sharing personal passwords.
                  </strong>{" "}
                  It helps keep your account safe and enables trusted
                  interactions on the platform.
                </span>
              </div>
              <button
                className="mx-auto mt-2 flex w-full items-center justify-center gap-1 text-blue-700 hover:underline"
                onClick={() => setShowHowItWorks((v) => !v)}
                aria-expanded={showHowItWorks}
                aria-controls="how-ii-works-section"
                type="button"
              >
                <InformationCircleIcon className="h-5 w-5" />
                <span className="text-center">
                  How does Internet Identity login work?
                </span>
              </button>
              {/* How It Works Section (hidden by default) */}
              {showHowItWorks && (
                <div
                  id="how-ii-works-section"
                  className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-left text-sm text-gray-700"
                >
                  <h3 className="mb-2 text-base font-bold text-blue-700">
                    How Internet Identity Works
                  </h3>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      <b>Imagine you have a magic key</b> that you don't need to
                      remember, and it automatically creates a new, private
                      "you" every time you visit a different website. That's
                      basically how Internet Identity on ICP works.
                    </li>
                    <li>
                      <b>No password needed:</b> Instead of a password, you use
                      something you physically have, like your phone or a
                      special security key, and something you are, like your
                      fingerprint or face. This is called a <b>passkey</b>. This
                      passkey is like your master key.
                    </li>

                    <li>
                      <b>Private & secure:</b> This process proves to the
                      website that it's really you without ever sending a
                      password. The system then creates a completely new, unique
                      "you" (a digital identity) just for that app.
                    </li>
                    <li>
                      <b>Privacy by design:</b> Because each app gets a
                      different "you," none of them can talk to each other to
                      figure out who you are or what you've been doing on other
                      apps. This keeps your online life private. It's a way to
                      log in that's more secure than passwords and keeps your
                      information from being tracked.
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <button
              className="mt-2 w-full rounded-lg bg-blue-600 py-3 text-lg font-bold text-white shadow transition hover:bg-blue-700"
              onClick={handleConfirmIdentityInfo}
            >
              Continue to Internet Identity
            </button>
          </div>
        </div>
      )}
      {/* Header Section */}
      <header className="site-header sticky top-0 z-40 rounded-b-2xl border-b border-blue-100 bg-white/80 shadow-lg backdrop-blur-lg">
        <div className="container mx-auto flex items-center px-4 py-3">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="logo-link flex items-center gap-2"
              aria-label="SRV Home"
            >
              <img
                src="/logo.svg"
                alt="SRV Logo"
                className="logo-image h-10 w-auto"
              />
            </a>
          </div>

          <button
            className={`mobile-menu-toggle ${isMobileMenuOpen ? "active" : ""} ml-auto rounded-lg border border-gray-300 bg-white p-2 shadow md:hidden`}
            aria-label="Toggle menu"
            onClick={toggleMobileMenu}
          >
            <span className="hamburger-line mb-1 block h-0.5 w-6 bg-blue-700"></span>
            <span className="hamburger-line mb-1 block h-0.5 w-6 bg-blue-700"></span>
            <span className="hamburger-line block h-0.5 w-6 bg-blue-700"></span>
          </button>

          <nav
            className={`main-nav ${isMobileMenuOpen ? "active" : ""} hidden flex-1 items-center justify-center gap-6 md:flex`}
          >
            <ul className="nav-list flex items-center gap-6">
              <li className="nav-item">
                <a
                  href="#"
                  className="nav-link nav-link-active font-semibold text-blue-700 hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Home
                </a>
              </li>
              <li className="nav-item">
                <a
                  href="#"
                  className="nav-link font-semibold text-gray-700 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateToAbout();
                  }}
                >
                  About
                </a>
              </li>
              <li className="nav-item nav-cta">
                <button
                  onClick={handleLoginClick}
                  disabled={isLoginLoading}
                  className="btn-primary ml-2 flex min-h-0 items-center gap-1 px-2 py-1 text-xs"
                >
                  {isLoginLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      <span className="text-base">Connecting...</span>
                    </>
                  ) : (
                    <>
                      <FingerPrintIcon className="h-4 w-4" />
                      <span className="text-base">Login / Sign Up</span>
                    </>
                  )}
                </button>
              </li>
            </ul>
          </nav>

          <div className="header-button hidden md:block">
            <button
              onClick={handleLoginClick}
              disabled={isLoginLoading}
              className="btn-primary"
            >
              {isLoginLoading ? (
                <>
                  <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-slate-800"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <FingerPrintIcon className="mr-3 h-6 w-6" />
                  <span>Login / Sign Up</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="hero-content relative flex flex-col items-center rounded-3xl bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-8 shadow-xl md:p-16">
            {/* Decorative background shapes */}
            <div className="absolute top-0 left-0 -z-10 h-32 w-32 rounded-full bg-blue-100 opacity-40 blur-2xl"></div>
            <div className="absolute right-0 bottom-0 -z-10 h-24 w-24 rounded-full bg-yellow-200 opacity-30 blur-2xl"></div>
            <div className="hero-text-container mb-8">
              <h1 className="hero-text text-center text-3xl leading-tight font-extrabold text-blue-800 drop-shadow-lg md:text-5xl">
                <div className="text-line mb-2 flex items-center justify-center gap-2">
                  <span className="text-segment">Ang <span className="text-yellow-400">S</span>erbisyo</span>
                  <span className="component-group-after flex items-center gap-1">
                    <span className="arrow-circle">
                      <img
                        src="/hero/arrow.png"
                        alt="Arrow"
                        className="arrow-image h-7 w-7 drop-shadow md:h-10 md:w-10"
                      />
                    </span>
                    <span className="toggle-switch"></span>
                  </span>
                </div>

                <div className="text-line mb-2 flex items-center justify-center gap-2">
                  <span className="component-group-before">
                    <img
                      src="/hero/star.svg"
                      alt="star"
                      className="star-image h-6 w-6 drop-shadow md:h-8 md:w-8"
                    />
                  </span>
                  <span className="text-segment"><span className="text-blue-400">R</span>ito ay</span>
                  <span className="component-group-after">
                    <img
                      src="/hero/message-load.svg"
                      alt="message-load"
                      className="message-load-image h-9 w-9 drop-shadow md:h-13 md:w-13"
                    />
                  </span>
                </div>

                <div className="text-line flex items-center justify-center gap-2">
                  <span className="component-group-before">
                    <div className="dots-line flex items-center gap-1">
                      <span className="line h-0.5 w-6 rounded bg-blue-300"></span>
                      <span className="dots flex gap-0.5">
                        <span className="dot h-2 w-2 rounded-full bg-yellow-400"></span>
                        <span className="dot h-2 w-2 rounded-full bg-blue-400"></span>
                      </span>
                      <span className="line h-0.5 w-6 rounded bg-blue-300"></span>
                    </div>
                  </span>

                  <span className="text-segment">always <span className="text-yellow-400">V</span>alued!</span>
                  <span className="component-group-after flex gap-1">
                    <img
                      src="/hero/polygon1.svg"
                      alt="star"
                      className="polygon-image1 h-5 w-5 drop-shadow md:h-7 md:w-7"
                    />
                    <img
                      src="/hero/polygon1.svg"
                      alt="star"
                      className="polygon-image2 h-5 w-5 drop-shadow md:h-7 md:w-7"
                    />
                  </span>
                </div>
              </h1>
            </div>

            <p className="hero-description mx-auto mb-8 max-w-2xl text-center text-lg text-gray-700 md:text-2xl">
              Finding reliable help for everyday tasks can be a challenge.
              <strong className="text-blue-700"> SRV</strong> is your platform
              to easily discover, compare, and book a wide range of local
              service providers.
            </p>

            <div className="hero-buttons flex justify-center">
              <button
                onClick={handleLoginClick}
                disabled={isLoginLoading}
                className="btn-primary rounded-xl px-6 py-3 text-lg font-bold shadow-lg transition-all hover:scale-105"
              >
                {isLoginLoading ? (
                  <>
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-slate-800"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <FingerPrintIcon className="mr-3 h-6 w-6" />
                    <span>Login / Sign Up</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="features-header">
            <h1 className="features-title">How does SRV work?</h1>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <h3 className="feature-title">Discover</h3>
              <div className="feature-image max-w-3/4">
                <img
                  src="/images/srv characters (SVG)/girl.svg"
                  alt="Service Discovery"
                  className="feature-icon"
                />
              </div>
              <p className="feature-description">
                Browse trusted service providers near you - from home repair to
                wellness.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Compare</h3>
              <div className="feature-image max-w-3/4">
                <img
                  src="/images/srv characters (SVG)/tutor.svg"
                  alt="Detailed Provider Profiles"
                  className="feature-icon"
                />
              </div>
              <p className="feature-description">
                Check profiles, ratings, and real customer reviews
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Book</h3>
              <div className="feature-image max-w-3/4">
                <img
                  src="/images/srv characters (SVG)/tech guy.svg"
                  alt="Seamless Booking System"
                  className="feature-icon"
                />
              </div>
              <p className="feature-description">
                Choose your preferred provider and confirm your schedule in just
                a few taps
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Get it Done</h3>
              <div className="feature-image max-w-3/4">
                <img
                  src="/images/srv characters (SVG)/plumber.svg"
                  alt="Authentic Ratings & Reviews"
                  className="feature-icon"
                />
              </div>
              <p className="feature-description">
                Service is completed. You rate, review, and vouch - helping the
                next customer choose wisely
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="why-choose-section">
        <img src="CircleArrow.svg" className="bg-shape-arrow-left" alt="" />
        <img src="Polygon 3.svg" className="bg-shape-triangle-top" alt="" />

        <div className="container">
          <div className="why-choose-header">
            <div className="why-choose-title-container">
              <h1 className="why-choose-title">Why Choose SRV?</h1>
            </div>
          </div>

          <div className="why-choose-content">
            <div className="phone-container">
              <img
                src="/images/main page assets/phone mockup.png"
                alt="SRV Mobile App"
                className="phone-image"
                style={{ width: "100%", height: "auto", maxWidth: "100%" }}
              />
            </div>

            <div className="content-card">
              <div className="reasons-grid">
                <div className="reason-item">
                  <div className="reason-icon">
                    <svg
                      className="icon-svg"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="reason-title">Beripikado at Maaasahan</h3>
                  <p className="reason-description">
                    Kasama mo ang SRV sa paghanap ng mga service provider na may
                    kakayahan at beripikado.
                  </p>
                </div>

                <div className="reason-item">
                  <div className="reason-icon">
                    <svg
                      className="icon-svg"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="reason-title">
                    Platform na Nakatuon sa Kliyente
                  </h3>
                  <p className="reason-description">
                    Madali lang maghanap at magtingin ng mga service provider sa
                    iyong partikular na pangangailangan at lokasyon
                  </p>
                </div>

                <div className="reason-item">
                  <div className="reason-icon">
                    <svg
                      className="icon-svg"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="reason-title">Nagpapalakas sa mga Provider</h3>
                  <p className="reason-description">
                    Lahat ng iskedyul, reputasyon at ng kakayahan mo, mabilis
                    lang asikasuhin sa SRV.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sdg-section">
        <div className="container">
          <div className="sdg-header">
            <h1 className="sdg-title">
              Our Commitment to Sustainable Development
            </h1>
            <p className="sdg-description">
              SRV is dedicated to making a positive impact by aligning our
              platform with key Sustainable Development Goals.
            </p>
          </div>

          <div className="sdg-grid">
            <div className="sdg-card">
              <h3 className="sdg-card-title">
                SDG 9: Industry, Innovation, and Infrastructure
              </h3>
              <div className="sdg-icon">
                <img src="sdg9.png" alt="sdg 9" />
              </div>

              <p className="sdg-card-description">
                Integrating blockchain into e-commerce brings innovation to a
                mature industry while promoting public adoption of the
                technology and strengthening the platform's infrastructure.
              </p>
            </div>

            <div className="sdg-card sdg-card-primary">
              <h3 className="sdg-card-title sdg-primary-title">
                SDG 8: Decent Work and Economic Growth
              </h3>
              <div className="sdg-icon">
                <img src="sdg8.png" alt="sdg 8" />
              </div>

              <p className="sdg-card-description sdg-primary-description">
                SRV provides a professional platform for service transactions,
                promoting mutual respect and creating job opportunities for
                skilled but unemployed individuals.
              </p>
              <div className="sdg-primary-badge">Primary Focus</div>
            </div>

            <div className="sdg-card">
              <h3 className="sdg-card-title">
                SDG 17: Partnerships for the Goals
              </h3>
              <div className="sdg-icon">
                <img src="sdg17.png" alt="sdg 17" />
              </div>

              <p className="sdg-card-description">
                SRV fosters collaboration among service providers, clients, and
                support staff through technology, aligning with the SDG goals of
                partnership and knowledge sharing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-cta-section">
        <div className="container">
          <div className="about-cta-card">
            <h2 className="about-cta-title">Join the SRV Community Today</h2>
            <p className="about-cta-description">
              Connect with trusted local service providers and discover a better
              way to get things done in your community.
            </p>
            <div className="about-cta-button-container">
              <button
                onClick={handleLoginClick}
                disabled={isLoginLoading}
                className={"btn-primary"}
              >
                {isLoginLoading ? (
                  <>
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-slate-800"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <FingerPrintIcon className="mr-3 h-6 w-6" />
                    <span>Login / Sign Up</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <a href="/" className="footer-logo-link">
                <img src="logo.svg" alt="SRV Logo" className="footer-logo" />
              </a>
            </div>
            <div className="footer-section footer-nav">
              <ul className="footer-links nav-links">
                <li className="nav-item">
                  <a
                    href="#"
                    className="footer-link"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  >
                    Home
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    href="#"
                    className="footer-link"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateToAbout();
                    }}
                  >
                    About
                  </a>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <ul className="footer-links">
                <li className="social-item-main">
                  <a
                    href="https://www.facebook.com/srvpinoy"
                    className="footer-link social-link-main"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-facebook.svg"
                      alt="Facebook"
                      className="social-icon-main"
                    />
                  </a>
                  <a
                    href="https://www.instagram.com/srvpinoy?igsh=MWJzZTEyaGFrdmwycw%3D%3D&utm_source=qr"
                    className="footer-link social-link-main"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-instagram.svg"
                      alt="Instagram"
                      className="social-icon-main"
                    />
                  </a>
                  <a
                    href="https://youtube.com/@srvpinoy?si=XqCsNabtY42DkpJ-"
                    className="footer-link social-link-main"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-youtube.svg"
                      alt="Youtube"
                      className="social-icon-main"
                    />
                  </a>
                  <a
                    href="https://www.tiktok.com/@srvpinoy?_t=ZS-8xkUDFeTRm3&_r=1"
                    className="footer-link social-link-main"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-tiktok.svg"
                      alt="Tiktok"
                      className="social-icon-main"
                    />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">
              © 2025 SRV Service Booking. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
