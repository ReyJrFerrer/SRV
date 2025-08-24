import "./shared/about-us.css";
import { FingerPrintIcon } from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";

interface AboutUsProps {
  onLoginClick: () => void;
  isLoginLoading: boolean;
  onNavigateToMain: () => void;
}
export default function AboutUs({
  onLoginClick,
  isLoginLoading,
  onNavigateToMain,
}: AboutUsProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    const nav = document.querySelector(".main-nav");
    nav?.classList.toggle("active");
  };

  function initServiceGallery() {
    const galleryContainer = document.querySelector(".gallery-container");
    if (!galleryContainer) return;

    const slides = document.querySelectorAll<HTMLElement>(
      ".gallery-image-wrapper",
    );
    const prevBtn = document.querySelector<HTMLButtonElement>(".prev-btn");
    const nextBtn = document.querySelector<HTMLButtonElement>(".next-btn");
    const indicators = document.querySelector(".gallery-indicators");
    let currentIndex = 0;

    slides.forEach((_, index) => {
      const indicator = document.createElement("div");
      indicator.classList.add("gallery-indicator");
      if (index === 0) indicator.classList.add("active");

      indicator.addEventListener("click", () => {
        goToSlide(index);
      });

      indicators?.appendChild(indicator);
    });

    nextBtn?.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % slides.length;
      updateGallery();
    });

    prevBtn?.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      updateGallery();
    });

    function goToSlide(index: number) {
      currentIndex = index;
      updateGallery();
    }

    function updateGallery() {
      slides.forEach((slide) => {
        slide.classList.remove("active");
      });
      slides[currentIndex].classList.add("active");

      const allIndicators = document.querySelectorAll(".gallery-indicator");
      allIndicators.forEach((ind, index) => {
        ind.classList.toggle("active", index === currentIndex);
      });
    }

    slides.forEach((slide) => {
      slide.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateGallery();
      });
    });

    let autoplayInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      updateGallery();
    }, 5000);

    (galleryContainer as HTMLElement).addEventListener("mouseenter", () => {
      clearInterval(autoplayInterval);
    });

    (galleryContainer as HTMLElement).addEventListener("mouseleave", () => {
      autoplayInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateGallery();
      }, 5000);
    });
  }

  useEffect(() => {
    initServiceGallery();
  }, []);

  return (
    <div>
      {/* Header Section */}
      <header className="site-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-container">
              <a href="/" className="logo-link" aria-label="SRV Home">
                <img src="/logo.svg" alt="SRV Logo" className="logo-image" />
              </a>
            </div>

            <button
              className={`mobile-menu-toggle ${isMobileMenuOpen ? "active" : ""}`}
              aria-label="Toggle menu"
              onClick={toggleMobileMenu}
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>

            <nav className={`main-nav ${isMobileMenuOpen ? "active" : ""}`}>
              <ul className="nav-list">
                <li className="nav-item">
                  <a
                    href="#"
                    className="nav-link"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateToMain();
                    }}
                  >
                    Home
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    href="#"
                    className="nav-link nav-link-active"
                    onClick={(e) => e.preventDefault()}
                  >
                    About
                  </a>
                </li>
                <li className="nav-item nav-cta">
                  <button
                    onClick={onLoginClick}
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
                </li>
              </ul>
            </nav>

            <div className="header-button">
              <button
                onClick={onLoginClick}
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
      </header>
      <section className="about-hero-section">
        <div className="container">
          <div className="about-hero-content">
            <div className="about-hero-image mt-10">
              <img
                src="about-srv.jpeg"
                alt="SRV Service Platform"
                className="hero-image"
              />
            </div>
            <div className="about-hero-text mt-10">
              <h1 className="about-hero-title">About SRV</h1>
              <p className="about-hero-description">
                Mobile Phone? Laptop? Computer? Any other devices? SRV
                (Serbisyo, Rito, Valid) is here for you anywhere, anytime.
                Designed to act as a centralized digital marketplace connecting
                clients seeking various services with independent, local
                freelance service providers in Baguio City. Built specifically
                for the Filipino community, SRV bridges the gap between reliable
                service needs and trusted local professionals, moving beyond the
                limitations of Facebook groups and word-of-mouth referrals.
              </p>
              <div className="about-hero-buttons">
                <button
                  onClick={onLoginClick}
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
        </div>
      </section>

      <section id="mission" className="mission-section">
        <div className="container">
          <div className="mission-content">
            <div className="mission-text">
              <h2 className="mission-tagline">
                <span className="tagline-primary">Smarter Services.</span>
                <span className="tagline-secondary">Better Communities.</span>
              </h2>
              <p className="mission-description">
                We're here to connect every barangay by guiding Filipinos to
                trusted local services. Know and be known in your local area
                through a reliable platform.
              </p>
            </div>
            <div className="mission-image">
              <img
                src="smarter-services.png"
                alt="Connected Community"
                className="mission-img"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="services-preview-section">
        <div className="container">
          <div className="services-header">
            <h2 className="services-title">Services We Connect</h2>
          </div>

          <div className="services-gallery">
            <div className="gallery-container">
              <div className="gallery-image-wrapper active" data-index="0">
                <img
                  src="services/electrician.jpeg"
                  alt="Home Repairs"
                  className="gallery-image"
                />
                <div className="image-overlay">
                  <h3 className="overlay-title">Home Repairs</h3>
                  <p className="overlay-description">
                    Electricians, plumbers, carpenters
                  </p>
                </div>
              </div>
              <div className="gallery-image-wrapper" data-index="1">
                <img
                  src="services/mechanic.jpeg"
                  alt="Automobile Repairs"
                  className="gallery-image"
                />
                <div className="image-overlay">
                  <h3 className="overlay-title">Automobile Repairs</h3>
                  <p className="overlay-description">
                    Mechanics, car detailing
                  </p>
                </div>
              </div>
              <div className="gallery-image-wrapper" data-index="2">
                <img
                  src="services/technician.jpeg"
                  alt="Gadget & Appliance Tech"
                  className="gallery-image"
                />
                <div className="image-overlay">
                  <h3 className="overlay-title">Gadget & Appliance Tech</h3>
                  <p className="overlay-description">
                    Phone repair, appliance fixing
                  </p>
                </div>
              </div>
              <div className="gallery-image-wrapper" data-index="3">
                <img
                  src="services/hair-stylist.jpeg"
                  alt="Beauty Services"
                  className="gallery-image"
                />
                <div className="image-overlay">
                  <h3 className="overlay-title">Beauty Services</h3>
                  <p className="overlay-description">
                    Hair styling, manicures, facials
                  </p>
                </div>
              </div>
              <div className="gallery-image-wrapper" data-index="4">
                <img
                  src="services/massager.jpeg"
                  alt="Wellness Services"
                  className="gallery-image"
                />
                <div className="image-overlay">
                  <h3 className="overlay-title">Wellness Services</h3>
                  <p className="overlay-description">
                    Massage therapy, relaxation treatments
                  </p>
                </div>
              </div>
              <div className="gallery-image-wrapper" data-index="5">
                <img
                  src="services/delivery-man.jpeg"
                  alt="Delivery & Errands"
                  className="gallery-image"
                />
                <div className="image-overlay">
                  <h3 className="overlay-title">Delivery & Errands</h3>
                  <p className="overlay-description">
                    Shopping, document delivery
                  </p>
                </div>
              </div>
              <div className="gallery-image-wrapper" data-index="6">
                <img
                  src="services/tutor.jpeg"
                  alt="Tutoring"
                  className="gallery-image"
                />
                <div className="image-overlay">
                  <h3 className="overlay-title">Tutoring</h3>
                  <p className="overlay-description">
                    Academic support, skill training
                  </p>
                </div>
              </div>
            </div>

            <div className="gallery-controls">
              <button className="gallery-control prev-btn">◀</button>
              <div className="gallery-indicators"></div>
              <button className="gallery-control next-btn">▶</button>
            </div>
          </div>
        </div>
      </section>

      <section className="pillars-section">
        <div className="container">
          <div className="section-header-ab">
            <h2 className="section-title-ab">Our Core Pillars</h2>
          </div>

          <div className="pillars-impact-container">
            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-header">
                  <h3 className="pillar-title">Our Story</h3>
                  <img
                    src="three-pillars/story.svg"
                    alt="Story Icon"
                    className="pillar-icon"
                  />
                </div>
                <div className="pillar-content">
                  <p className="pillar-description">
                    Rooted in Baguio, we built SRV to rethink how communities
                    and service providers connect moving beyond inconsistent
                    Facebook groups and word-of-mouth searches, we created a
                    platform where trust meets convenience.
                  </p>
                </div>
              </div>

              <div className="pillar-card">
                <div className="pillar-header">
                  <h3 className="pillar-title">Our Mission</h3>
                  <img
                    src="three-pillars/mission.svg"
                    alt="Mission Icon"
                    className="pillar-icon"
                  />
                </div>
                <div className="pillar-content">
                  <p className="pillar-description">
                    To connect every Filipino with reliable local services-one
                    verified provider at a time. Together with empowering local
                    freelancers while making quality services accessible to
                    everyone in the community.
                  </p>
                </div>
              </div>

              <div className="pillar-card">
                <div className="pillar-header">
                  <h3 className="pillar-title">What Makes Us Unique?</h3>
                  <img
                    src="three-pillars/unique.svg"
                    alt="Unique Icon"
                    className="pillar-icon"
                  />
                </div>
                <div className="pillar-content">
                  <p className="pillar-description">
                    Local insights enhanced with technology to create a platform
                    that understands Filipino service culture. Built on
                    decentralized blockchain technology (ICP) with verified
                    provider profiles, transparent pricing, and community-driven
                    reviews.
                  </p>
                </div>
              </div>
            </div>

            <div className="impact-container">
              <div className="impact-header">
                <h2 className="impact-title">Our Potential Impact</h2>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-number">85%</div>
                  <p className="metric-description">
                    reduction in time spent searching for reliable service
                    providers
                  </p>
                </div>

                <div className="metric-card">
                  <div className="metric-number">3x</div>
                  <p className="metric-description">
                    increase in bookings for local freelance service providers
                  </p>
                </div>

                <div className="metric-card">
                  <div className="metric-number">40%</div>
                  <p className="metric-description">
                    faster service request fulfillment through location-based
                    matching
                  </p>
                </div>

                <div className="metric-card">
                  <div className="metric-number">90%</div>
                  <p className="metric-description">
                    improvement in service quality assurance through verified
                    provider profiles
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="additional-info-section">
        <div className="section-header-ab">
          <h2 className="section-title-ab">Ways to Connect</h2>
        </div>

        <div className="container">
          <div className="info-grid">
            <div className="info-card">
              <h3 className="info-title">For Service Providers</h3>
              <p className="info-description">
                Ready to contribute to the network of trusted local service
                providers? Highlight what you're great at - Do what you do best!
              </p>
              <button className="btn-secondary" id="providerBtn2">
                Preregister Now
              </button>
            </div>

            <div className="info-card">
              <h3 className="info-title">For Partnerships</h3>
              <p className="info-description">
                Looking to partner with SRV? We're open to collaborations with
                businesses, organizations, and community leaders.
              </p>
              <a href="contact.html" className="btn-secondary">
                Email Partnerships
              </a>
            </div>

            <div className="info-card">
              <h3 className="info-title">For Support</h3>
              <p className="info-description">
                Need technical support or have questions about using SRV? Our
                support team is here to help.
              </p>
              <a href="contact.html" className="btn-secondary">
                {" "}
                Get Support{" "}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="team-section">
        <div className="container">
          <div className="team-header">
            <h2 className="team-title">Meet the Team</h2>
            <p className="team-description">
              The passionate individuals behind SRV, working to revolutionize
              how Filipino communities connect with local services.
            </p>
          </div>

          <div className="team-grid">
            <div className="team-member">
              <div className="member-image-container">
                <div className="member-image-wrapper">
                  <img
                    src="about-us/don.jpg"
                    alt="Don - Team Member"
                    className="member-image"
                  />
                </div>
                <div className="member-social">
                  <a
                    href="https://www.facebook.com/share/16V1X4FiAZ/"
                    className="social-link"
                    aria-label="Facebook"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-facebook.svg"
                      alt="Facebook"
                      className="social-icon"
                    />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/don-daryll-dela-concha-081ab6320?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                    className="social-link"
                    aria-label="LinkedIn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-linkedin.svg"
                      alt="LinkedIn"
                      className="social-icon"
                    />
                  </a>
                </div>
              </div>
              <div className="member-info">
                <h3 className="member-name">Don Daryll Dela Concha</h3>
                <p className="member-role">Frontend Support</p>
              </div>
            </div>
            <div className="team-member">
              <div className="member-image-container">
                <div className="member-image-wrapper">
                  <img
                    src="about-us/jd.png"
                    alt="JD - Team Member"
                    className="member-image"
                  />
                </div>
                <div className="member-social">
                  <a
                    href="https://www.facebook.com/jandale.ii/"
                    className="social-link"
                    aria-label="Facebook"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-facebook.svg"
                      alt="Facebook"
                      className="social-icon"
                    />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/jan-dale-zarate-1bbb67188/"
                    className="social-link"
                    aria-label="LinkedIn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-linkedin.svg"
                      alt="LinkedIn"
                      className="social-icon"
                    />
                  </a>
                </div>
              </div>
              <div className="member-info">
                <h3 className="member-name">Jan Dale Zarate</h3>
                <p className="member-role">Frontend Developer</p>
              </div>
            </div>
            <div className="team-member">
              <div className="member-image-container">
                <div className="member-image-wrapper">
                  <img
                    src="about-us/rey.png"
                    alt="Rey - Team Member"
                    className="member-image"
                  />
                </div>
                <div className="member-social">
                  <a
                    href="https://www.facebook.com/reynaldo.ferrer.jr.2024"
                    className="social-link"
                    aria-label="Facebook"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-facebook.svg"
                      alt="Facebook"
                      className="social-icon"
                    />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/reynaldo-jr-ferrer"
                    className="social-link"
                    aria-label="LinkedIn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-linkedin.svg"
                      alt="LinkedIn"
                      className="social-icon"
                    />
                  </a>
                </div>
              </div>
              <div className="member-info">
                <h3 className="member-name">Reynaldo Jr Ferrer</h3>
                <p className="member-role">Lead Programmer</p>
              </div>
            </div>

            <div className="team-member">
              <div className="member-image-container">
                <div className="member-image-wrapper">
                  <img
                    src="about-us/hannah.jpg"
                    alt="Hannah - Team Member"
                    className="member-image"
                  />
                </div>
                <div className="member-social">
                  <a
                    href="https://www.facebook.com/share/1AL8AtDj7y/?mibextid=wwXIfr"
                    className="social-link"
                    aria-label="Facebook"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-facebook.svg"
                      alt="Facebook"
                      className="social-icon"
                    />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/princess-hannah-arzadon-1927562b6?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app"
                    className="social-link"
                    aria-label="LinkedIn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-linkedin.svg"
                      alt="LinkedIn"
                      className="social-icon"
                    />
                  </a>
                </div>
              </div>
              <div className="member-info">
                <h3 className="member-name">Princess Hannah Arzadon</h3>
                <p className="member-role">Project Manager</p>
              </div>
            </div>
            <div className="team-member">
              <div className="member-image-container">
                <div className="member-image-wrapper">
                  <img
                    src="about-us/yanni.jpg"
                    alt="Alexie - Team Member"
                    className="member-image"
                  />
                </div>
                <div className="member-social">
                  <a
                    href="https://www.facebook.com/hyaeniferrer"
                    className="social-link"
                    aria-label="Facebook"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-facebook.svg"
                      alt="Facebook"
                      className="social-icon"
                    />
                  </a>
                  <a
                    href=""
                    className="social-link"
                    aria-label="LinkedIn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-linkedin.svg"
                      alt="LinkedIn"
                      className="social-icon"
                    />
                  </a>
                </div>
              </div>
              <div className="member-info">
                <h3 className="member-name">Hyaeni Ferrer</h3>
                <p className="member-role">UI/UX Designer</p>
              </div>
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
                onClick={onLoginClick}
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
                      onNavigateToMain();
                    }}
                  >
                    Home
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    href="#"
                    className="footer-link"
                    onClick={(e) => e.preventDefault()}
                  >
                    About
                  </a>
                </li>
              </ul>
            </div>

            <div className="footer-section">
              <ul className="footer-links">
                <li className="social-item">
                  <a
                    href="https://www.facebook.com/srvpinoy"
                    className="footer-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-facebook.svg"
                      alt="Facebook"
                      className="social-icon-footer"
                    />
                  </a>
                  <a
                    href="https://www.instagram.com/srvpinoy?igsh=MWJzZTEyaGFrdmwycw%3D%3D&utm_source=qr"
                    className="footer-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-instagram.svg"
                      alt="Instagram"
                      className="social-icon-footer"
                    />
                  </a>
                  <a
                    href="https://youtube.com/@srvpinoy?si=XqCsNabtY42DkpJ-"
                    className="footer-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-youtube.svg"
                      alt="Youtube"
                      className="social-icon-footer"
                    />
                  </a>
                  <a
                    href="https://www.tiktok.com/@srvpinoy?_t=ZS-8xkUDFeTRm3&_r=1"
                    className="footer-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="socials/brand-tiktok.svg"
                      alt="Tiktok"
                      className="social-icon-footer"
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
