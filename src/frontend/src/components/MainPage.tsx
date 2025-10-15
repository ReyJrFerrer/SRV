import { FingerPrintIcon } from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";
import { SiteHeader } from "./layout/SiteHeader";
import { SiteFooter } from "./layout/SiteFooter";
import { MobileSiteHeader } from "./layout/MobileSiteHeader";
import "./shared/animations.css";
import { CommunityCTASection } from "./layout/CommunityCTASection";
import "./shared/styles.css";

interface MainPageProps {
  onLoginClick: () => void;
  isLoginLoading: boolean;
  onNavigateToAbout: () => void;
  onNavigateToContact: () => void;
}

export default function MainPage({
  onLoginClick,
  isLoginLoading,
  onNavigateToAbout,
  onNavigateToContact,
}: MainPageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLoginClick = () => {
    onLoginClick();
    // Close mobile menu if it's open
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      const nav = document.querySelector(".main-nav");
      nav?.classList.remove("active");
    }
  };

  // ===================== RESTORED / NEW EFFECTS =====================

  // Services gallery autoplay + indicators
  useEffect(() => {
    const galleryContainer =
      document.querySelector<HTMLElement>(".gallery-container");
    if (!galleryContainer) return;
    const slides = Array.from(
      document.querySelectorAll<HTMLElement>(".gallery-image-wrapper"),
    );
    const prevBtn = document.querySelector<HTMLButtonElement>(".prev-btn");
    const nextBtn = document.querySelector<HTMLButtonElement>(".next-btn");
    const indicators = document.querySelector<HTMLElement>(
      ".gallery-indicators",
    );
    let currentIndex = 0;
    let autoplay: ReturnType<typeof setInterval> | null = null;

    // Apply enhanced transition classes (single time)
    slides.forEach((s) => {
      s.style.transition =
        "opacity 1s cubic-bezier(.4,0,.2,1), transform 1.2s cubic-bezier(.25,.8,.25,1)";
      s.style.willChange = "opacity, transform";
    });

    slides.forEach((_, index) => {
      const indicator = document.createElement("div");
      indicator.classList.add("gallery-indicator");
      if (index === 0) indicator.classList.add("active");
      indicator.addEventListener("click", () => {
        currentIndex = index;
        updateGallery();
      });
      indicators?.appendChild(indicator);
    });

    function updateGallery() {
      slides.forEach((s) => s.classList.remove("active"));
      slides[currentIndex].classList.add("active");
      document
        .querySelectorAll(".gallery-indicator")
        .forEach((ind, i) =>
          ind.classList.toggle("active", i === currentIndex),
        );
    }

    function goTo(delta: number) {
      currentIndex = (currentIndex + delta + slides.length) % slides.length;
      updateGallery();
      restartAutoplay();
    }
    const handleNext = () => goTo(1);
    const handlePrev = () => goTo(-1);

    slides.forEach((slide) => {
      slide.addEventListener("click", handleNext);
    });
    nextBtn?.addEventListener("click", handleNext);
    prevBtn?.addEventListener("click", handlePrev);

    function startAutoplay() {
      autoplay = setInterval(handleNext, 3000);
    }
    function stopAutoplay() {
      if (autoplay) clearInterval(autoplay);
    }
    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }
    startAutoplay();

    const pause = () => stopAutoplay();
    const resume = () => startAutoplay();
    galleryContainer.addEventListener("mouseenter", pause);
    galleryContainer.addEventListener("mouseleave", resume);

    return () => {
      stopAutoplay();
      nextBtn?.removeEventListener("click", handleNext);
      prevBtn?.removeEventListener("click", handlePrev);
      galleryContainer.removeEventListener("mouseenter", pause);
      galleryContainer.removeEventListener("mouseleave", resume);
      slides.forEach((slide) => slide.removeEventListener("click", handleNext));
      if (indicators) indicators.innerHTML = "";
    };
  }, []);

  // Hero stagger animation
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero-section");
    if (!hero) return;
    const elems = Array.from(hero.querySelectorAll<HTMLElement>(".hero-anim"));
    if (!elems.length) return;
    elems.forEach((el, i) => {
      el.classList.add("hero-anim-init");
      el.style.setProperty("--hero-delay", `${i * 130}ms`);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            elems.forEach((el) => el.classList.add("hero-anim-in"));
            observer.disconnect();
          }
        });
      },
      { threshold: 0.35 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Features (“How does SRV work?”) reveal
  useEffect(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".features-section .feature-card"),
    );
    if (!cards.length) return;
    cards.forEach((c, i) => {
      c.classList.add("feature-init");
      c.style.setProperty("--feat-delay", `${i * 120}ms`);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("feature-in");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    cards.forEach((c) => observer.observe(c));
    return () => {
      observer.disconnect();
    };
  }, []);

  // Why Choose SRV
  useEffect(() => {
    const section = document.querySelector<HTMLElement>(".why-choose-section");
    if (!section) return;
    const title = section.querySelector<HTMLElement>(".why-choose-title");
    const phone = section.querySelector<HTMLElement>(".phone-container");
    const reasons = Array.from(
      section.querySelectorAll<HTMLElement>(".reason-item"),
    );
    if (!title || !phone || !reasons.length) return;

    title.classList.add("why-fade-up-init");
    title.style.setProperty("--why-delay", "0ms");
    phone.classList.add("why-slide-left-init");
    phone.style.setProperty("--why-delay", "120ms");
    reasons.forEach((r, i) => {
      r.classList.add("why-slide-right-init");
      r.style.setProperty("--why-delay", `${240 + i * 140}ms`);
    });

    let done = false;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!done && entry.isIntersecting) {
            done = true;
            title.classList.add("why-animate-in");
            phone.classList.add("why-animate-in");
            reasons.forEach((r) => r.classList.add("why-animate-in"));
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
    };
  }, []);

  // SDG cards reveal
  useEffect(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".sdg-card"),
    );
    if (!cards.length) return;
    cards.forEach((c, i) => {
      c.classList.add("sdg-init");
      c.style.setProperty("--sdg-delay", `${i * 100}ms`);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("sdg-in");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    cards.forEach((c) => observer.observe(c));
    return () => {
      observer.disconnect();
    };
  }, []);

  // Services We Connect (gallery wrappers & title) animation
  useEffect(() => {
    const section = document.querySelector<HTMLElement>(
      ".services-preview-section",
    );
    if (!section) return;
    const title = section.querySelector<HTMLElement>(".services-title");
    const items = Array.from(
      section.querySelectorAll<HTMLElement>(".gallery-image-wrapper"),
    );
    if (title) title.classList.add("service-title-init");
    items.forEach((it, i) => {
      it.classList.add("service-init");
      it.style.setProperty("--service-delay", `${120 + i * 90}ms`);
    });
    let triggered = false;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!triggered && entry.isIntersecting) {
            triggered = true;
            if (title) title.classList.add("service-title-in");
            items.forEach((it) => it.classList.add("service-in"));
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
    };
  }, []);

  // SDG header animation (separate from cards)
  useEffect(() => {
    const sdgHeader = document.querySelector<HTMLElement>(
      ".sdg-section .sdg-header",
    );
    if (!sdgHeader) return;
    sdgHeader.classList.add("sdg-header-init");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            sdgHeader.classList.add("sdg-header-in");
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    observer.observe(sdgHeader);
    return () => {
      observer.disconnect();
    };
  }, []);

  // =================== END RESTORED / NEW EFFECTS =====================

  // (Removed community modal; CTA will open waitlist directly)

  return (
    <div>
      <MobileSiteHeader
        current="home"
        onHome={() => window.scrollTo(0, 0)}
        onAbout={() => {
          onNavigateToAbout();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onContact={() => {
          onNavigateToContact();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onLogin={handleLoginClick}
        isLoginLoading={isLoginLoading}
      />
      <SiteHeader
        current="home"
        onHome={() => window.scrollTo(0, 0)}
        onAbout={() => {
          onNavigateToAbout();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onContact={() => {
          onNavigateToContact();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onLogin={handleLoginClick}
        isLoginLoading={isLoginLoading}
      />

      {/* HERO (hero-anim classes added) */}
      <section className="hero-section home-hero">
        <div className="container mx-auto px-4 pt-1 pb-4 md:pt-2 md:pb-5">
          <div className="hero-content hero-pop relative flex flex-col items-center p-2 md:p-3">
            <div className="absolute top-0 left-0 -z-10 h-32 w-32 rounded-full bg-blue-100 opacity-40 blur-2xl"></div>
            <div className="absolute right-0 bottom-0 -z-10 h-24 w-24 rounded-full bg-yellow-200 opacity-30 blur-2xl"></div>
            <div className="hero-text-container mb-2">
              <h1 className="hero-text text-center text-3xl leading-tight font-extrabold text-blue-800 drop-shadow-lg md:text-5xl">
                <div className="text-line hero-anim mb-2 flex items-center justify-center gap-2">
                  <span className="text-segment">
                    Ang <span className="text-yellow-400">S</span>erbisyo
                  </span>
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
                <div className="text-line hero-anim mb-2 flex items-center justify-center gap-2">
                  <span className="component-group-before">
                    <img
                      src="/hero/star.svg"
                      alt="star"
                      className="star-image h-6 w-6 drop-shadow md:h-8 md:w-8"
                    />
                  </span>
                  <span className="text-segment">
                    <span className="text-blue-400">R</span>ito ay
                  </span>
                  <span className="component-group-after">
                    <img
                      src="/hero/message-load.svg"
                      alt="message-load"
                      className="message-load-image h-9 w-9 drop-shadow md:h-13 md:w-13"
                    />
                  </span>
                </div>
                <div className="text-line hero-anim flex items-center justify-center gap-2">
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
                  <span className="text-segment">
                    always <span className="text-yellow-400">V</span>alued!
                  </span>
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
            <p className="hero-description hero-anim mx-auto mb-4 max-w-2xl text-center text-lg text-gray-700 md:text-2xl">
              Finding reliable help for everyday tasks can be a challenge.
              <strong className="text-blue-700"> SRV</strong> is your platform
              to easily discover, compare, and book a wide range of local
              service providers.
            </p>
            <div className="hero-buttons hero-anim flex justify-center">
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

      {/* Features */}
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

      {/* Why Choose SRV */}
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
                src="/images/main page assets/phone mockup.svg"
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

      {/* Services Preview */}
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
                <img
                  src="/images/categories/home-services.svg"
                  alt="Home Repairs category icon"
                  className="category-icon"
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
                <img
                  src="/images/categories/automobile-repairs.svg"
                  alt="Automobile Repairs category icon"
                  className="category-icon"
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
                <img
                  src="/images/categories/gadget-technicians.svg"
                  alt="Gadget & Appliance Tech category icon"
                  className="category-icon"
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
                <img
                  src="/images/categories/beauty-services.svg"
                  alt="Beauty Services category icon"
                  className="category-icon"
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
                  alt="Massage Services"
                  className="gallery-image"
                />
                <img
                  src="/images/categories/beauty-wellness.svg"
                  alt="Massage Services category icon"
                  className="category-icon"
                />
                <div className="image-overlay">
                  <h3 className="overlay-title">Massage Services</h3>
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
                <img
                  src="/images/categories/delivery-errands.svg"
                  alt="Delivery & Errands category icon"
                  className="category-icon"
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
                <img
                  src="/images/categories/tutoring.svg"
                  alt="Tutoring category icon"
                  className="category-icon"
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

      {/* SDG */}
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
            <div className="sdg-card" data-sdg="9">
              <div className="sdg-icon-circle">
                <img src="sdg9.svg" alt="SDG 9 icon" className="sdg-icon-img" />
              </div>
              <h3 className="sdg-card-title">
                SDG 9: Industry, Innovation, & Infrastructure
              </h3>
              <p className="sdg-card-description">
                Integrating blockchain into e‑commerce drives innovation, public
                adoption, and resilient digital infrastructure.
              </p>
            </div>

            <div className="sdg-card sdg-card-primary" data-sdg="8">
              <div className="sdg-icon-circle">
                <img src="sdg8.svg" alt="SDG 8 icon" className="sdg-icon-img" />
              </div>

              <h3 className="sdg-card-title">
                SDG 8: Decent Work & Economic Growth
              </h3>
              <div className="sdg-primary-badge">Primary Focus</div>

              <p className="sdg-card-description">
                A professional transaction layer creating livelihood pathways
                and elevating service reputation, trust, and opportunity.
              </p>
            </div>

            <div className="sdg-card" data-sdg="17">
              <div className="sdg-icon-circle">
                <img
                  src="sdg17.svg"
                  alt="SDG 17 icon"
                  className="sdg-icon-img"
                />
              </div>
              <h3 className="sdg-card-title">
                SDG 17: Partnerships for the Goals
              </h3>
              <p className="sdg-card-description">
                Enabling collaboration among providers, customers, and local
                support networks through transparent digital tooling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Restored Bottom Join Community CTA Section */}
      <CommunityCTASection onOpenCommunity={handleLoginClick} />

      <SiteFooter
        current="home"
        onHome={() => window.scrollTo(0, 0)}
        onAbout={() => {
          onNavigateToAbout();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
        onContact={() => {
          onNavigateToContact();
          setTimeout(() => window.scrollTo(0, 0), 0);
        }}
      />
    </div>
  );
}
