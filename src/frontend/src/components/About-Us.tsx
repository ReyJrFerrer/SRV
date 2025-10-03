import "./shared/about-us.css";
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  BoltIcon,
  ShieldCheckIcon,
  FingerPrintIcon,
} from "@heroicons/react/24/solid";
import { useEffect } from "react";
import "./shared/animations.css"; // ensure animation classes available
import { SiteHeader } from "./layout/SiteHeader";
import { SiteFooter } from "./layout/SiteFooter";
import { MobileSiteHeader } from "./layout/MobileSiteHeader";
import "./shared/styles.css";
import { CommunityCTASection } from "./layout/CommunityCTASection";

interface AboutUsProps {
  onLoginClick: () => void;
  isLoginLoading: boolean;
  onNavigateToMain: () => void;
  onNavigateToContact: () => void;
}
export default function AboutUs({
  onLoginClick,
  isLoginLoading,
  onNavigateToMain,
  onNavigateToContact,
}: AboutUsProps) {
  const handleLoginClick = () => {
    onLoginClick();
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
    // (waitlist count not shown; no fetch needed now)
    // About SRV (slide from right)
    const aboutSection = document.querySelector<HTMLElement>(
      ".about-hero-section",
    );
    if (aboutSection) {
      aboutSection.classList.add("about-slide-right-init");
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              aboutSection.classList.add("about-slide-right-in");
              obs.disconnect();
            }
          });
        },
        { threshold: 0.25 },
      );
      obs.observe(aboutSection);
    }
    // Mission (slide from left)
    const missionSection =
      document.querySelector<HTMLElement>(".mission-section");
    if (missionSection) {
      missionSection.classList.add("mission-slide-left-init");
      const obs2 = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              missionSection.classList.add("mission-slide-left-in");
              obs2.disconnect();
            }
          });
        },
        { threshold: 0.25 },
      );
      obs2.observe(missionSection);
    }
  }, []);

  // Impact & Milestones pop animations
  useEffect(() => {
    // Our Potential Impact
    const impactSection = document.querySelector<HTMLElement>(
      ".pillars-section .impact-container",
    );
    const metricCards = Array.from(
      document.querySelectorAll<HTMLElement>(".pillars-section .metric-card"),
    );
    if (impactSection) {
      impactSection.classList.add("impact-pop-init");
    }
    metricCards.forEach((card, i) => {
      card.classList.add("impact-pop-init");
      card.style.setProperty("--impact-delay", `${120 + i * 120}ms`);
    });
    let impactTriggered = false;
    const impactObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!impactTriggered && entry.isIntersecting) {
            impactTriggered = true;
            if (impactSection) impactSection.classList.add("impact-pop-in");
            metricCards.forEach((c) => c.classList.add("impact-pop-in"));
            impactObserver.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    if (impactSection) impactObserver.observe(impactSection);

    // Milestones
    const milestoneCards = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".milestones-section .milestone-card",
      ),
    );
    milestoneCards.forEach((card, i) => {
      card.classList.add("milestone-pop-init");
      card.style.setProperty("--mile-delay", `${100 + i * 180}ms`);
    });
    let mileTriggered = false;
    const mileSection = document.querySelector<HTMLElement>(
      ".milestones-section",
    );
    const mileObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!mileTriggered && entry.isIntersecting) {
            mileTriggered = true;
            milestoneCards.forEach((c) => c.classList.add("milestone-pop-in"));
            mileObserver.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );
    if (mileSection) mileObserver.observe(mileSection);

    return () => {
      impactObserver.disconnect();
      mileObserver.disconnect();
    };
  }, []);

  // Team & Map pop animations
  useEffect(() => {
    // Team Section
    const teamSection = document.querySelector<HTMLElement>(".team-section");
    const teamMembers = Array.from(
      document.querySelectorAll<HTMLElement>(".team-section .team-member"),
    );
    if (teamSection) teamSection.classList.add("team-pop-init");
    teamMembers.forEach((m, i) => {
      m.classList.add("team-pop-init");
      m.style.setProperty("--team-delay", `${140 + i * 140}ms`);
    });
    let teamTriggered = false;
    const teamObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!teamTriggered && entry.isIntersecting) {
            teamTriggered = true;
            if (teamSection) teamSection.classList.add("team-pop-in");
            teamMembers.forEach((m) => m.classList.add("team-pop-in"));
            teamObserver.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    if (teamSection) teamObserver.observe(teamSection);

    // Map Section
    const mapSection = document.querySelector<HTMLElement>(
      ".map-section .map-wrapper",
    );
    if (mapSection) mapSection.classList.add("map-pop-init");
    let mapTriggered = false;
    const mapObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!mapTriggered && entry.isIntersecting) {
            mapTriggered = true;
            mapSection?.classList.add("map-pop-in");
            mapObserver.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    if (mapSection) mapObserver.observe(mapSection);

    return () => {
      teamObserver.disconnect();
      mapObserver.disconnect();
    };
  }, []);

  return (
    <div>
      <MobileSiteHeader
        current="about"
        onHome={() => {
          onNavigateToMain();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onAbout={() => window.scrollTo(0, 0)}
        onContact={() => {
          onNavigateToContact?.();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onLogin={handleLoginClick}
        isLoginLoading={isLoginLoading}
      />
      <SiteHeader
        current="about"
        onHome={() => {
          onNavigateToMain();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onAbout={() => window.scrollTo(0, 0)}
        onContact={() => {
          onNavigateToContact?.();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onLogin={handleLoginClick}
        isLoginLoading={isLoginLoading}
      />

      <section className="about-hero-section">
        <div className="container">
          <div className="about-hero-content">
            <div className="about-hero-image mt-10">
              <div className="video-wrapper">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/jW0rTOmDPI0?start=7&autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1"
                  title="SRV Introduction"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
            </div>
            <div className="about-hero-text mt-10">
              <h1 className="about-hero-title">About SRV</h1>
              <p className="about-hero-description">
                SRV is a digital marketplace connecting the Filipino community
                in Baguio City with trusted, local freelance service providers.
                It's the reliable, all-device alternative to risky Facebook
                groups and referrals. Your service, validated, right here.
              </p>
              <div className="about-hero-buttons">
                <button
                  onClick={handleLoginClick}
                  disabled={isLoginLoading}
                  className="btn-primary flex items-center"
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
                <span className="tagline-primary">Building Tech</span>
                <span className="tagline-secondary">
                  That <b>SRVs</b>.
                </span>
              </h2>
              <p className="mission-description">
                We're here to connect every barangay by guiding Filipinos to
                trusted local services. Know and be known in your local area
                through a reliable platform.
              </p>
            </div>
            <div className="mission-image about-hero-image /* same sizing as hero video */">
              <div className="video-wrapper">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/EphPJADIL8U?start=7&autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&controls=1"
                  title="SRV - Smarter Services, Better Communities"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  style={{ pointerEvents: "auto" }}
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pillars-section">
        <div className="container">
          <div className="pillars-impact-container">
            <div className="impact-container">
              <div className="impact-header">
                <h2 className="impact-title">Our Potential Impact</h2>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <MagnifyingGlassIcon className="metric-icon" />
                  <div className="metric-number">85%</div>
                  <p className="metric-description">
                    reduction in time spent searching for reliable service
                    providers
                  </p>
                </div>

                <div className="metric-card">
                  <ChartBarIcon className="metric-icon" />
                  <div className="metric-number">3x</div>
                  <p className="metric-description">
                    increase in bookings for local freelance service providers
                  </p>
                </div>

                <div className="metric-card">
                  <BoltIcon className="metric-icon" />
                  <div className="metric-number">40%</div>
                  <p className="metric-description">
                    faster service request fulfillment through location-based
                    matching
                  </p>
                </div>

                <div className="metric-card">
                  <ShieldCheckIcon className="metric-icon" />
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

      <section className="milestones-section">
        <div className="section-header-ab">
          <h2 className="section-title-ab">Milestones</h2>
        </div>

        <div className="container">
          <div className="milestones-grid">
            <div className="milestone-card milestone-left">
              <div className="milestone-badge">Incubator</div>
              <div className="milestone-media">
                <img
                  src="/about-us/intto logo.svg"
                  alt="INTTO - University of the Cordilleras Innovation & Technology Transfer Office"
                  className="milestone-logo"
                />
              </div>
              <div className="milestone-body">
                <h3 className="milestone-title">Incubation</h3>
                <p className="milestone-text">
                  SRV is currently being incubated by the University of the
                  Cordilleras Innovation and Technology Transfer Office (UC
                  InTTO). The UC InTTO supports early-stage startups with
                  mentorship, technical resources, and go-to-market guidance.
                </p>
                <a
                  className="milestone-cta"
                  href="https://preview.canva.site/0d91fe27-9cd7-4de4-b6eb-81fd83058c91/intto-startups.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit UC InTTO
                </a>
              </div>
            </div>

            <div className="milestone-card milestone-right">
              <div className="milestone-badge">Award</div>
              <div className="milestone-media">
                <img
                  src="/about-us/wchl logo.svg"
                  alt="WCHL - World Computer Hackathon League"
                  className="milestone-logo"
                />
              </div>
              <div className="milestone-body">
                <h3 className="milestone-title">WCHL Recognition</h3>
                <p className="milestone-text">
                  SRV placed 2nd in the World Computer Hackathon League
                  (Philippine-China-Korea funnel) and will represent the
                  Philippines in the Asian rounds. This recognition validates
                  our technical approach and community impact.
                </p>
                <a
                  className="milestone-cta"
                  href="https://dorahacks.io/hackathon/wchl25-national-round/winner"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View WCHL Winners
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Map Section - Baguio City Pin */}
      <section className="map-section">
        <div className="container">
          <div className="map-header">
            <h2 className="map-title">Where we're focused</h2>
            <p className="map-description">
              SRV is proudly serving the Baguio City community. Find us here.
            </p>
          </div>

          <div className="map-wrapper">
            {/* Google Maps embed centered on Baguio City, Philippines with a marker */}
            <iframe
              title="SRV - University of the Cordilleras (Legarda Campus)"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3827.2841143403452!2d120.59157560000001!3d16.4103908!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3391a1685e7b7073%3A0xe6bda988e8558d2!2sUniversity%20of%20Cordilleras%20Legarda!5e0!3m2!1sen!2sph!4v1759030399917!5m2!1sen!2sph"
              width="100%"
              height="420"
              style={{ border: 0, borderRadius: 12 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Restored Join Community CTA (inline section) */}
      <CommunityCTASection onOpenCommunity={handleLoginClick} />

      <SiteFooter
        current="about"
        onHome={() => {
          onNavigateToMain();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onAbout={() => window.scrollTo(0, 0)}
        onContact={() => {
          onNavigateToContact?.();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
      />
    </div>
  );
}
