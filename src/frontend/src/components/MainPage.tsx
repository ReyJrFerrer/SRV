import {
  ShieldCheckIcon,
  UsersIcon,
  GlobeAltIcon,
  SparklesIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { SiteHeader } from "./layout/SiteHeader";
import { SiteFooter } from "./layout/SiteFooter";
import { MobileSiteHeader } from "./layout/MobileSiteHeader";
import "./shared/animations.css";
import { CommunityCTASection } from "./layout/CommunityCTASection";
import ReputationCircle from "./common/ReputationCircle";
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
  const [repScore, setRepScore] = useState(50);
  const [celebrating, setCelebrating] = useState(false);
  const handleRepClick = () => {
    if (celebrating) return;
    if (repScore >= 100) {
      setRepScore(50);
      return;
    }
    const next = repScore + 1;
    setRepScore(next);
    if (next === 100) {
      setCelebrating(true);
      setTimeout(() => {
        setCelebrating(false);
        setRepScore(50);
      }, 1600);
    }
  };

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

  // Services gallery logic removed in favor of Bento Grid

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

  // Services We Connect (bento cards & title) animation
  useEffect(() => {
    const section = document.querySelector<HTMLElement>(
      ".services-preview-section",
    );
    if (!section) return;
    const title = section.querySelector<HTMLElement>(".services-title");
    const items = Array.from(
      section.querySelectorAll<HTMLElement>(".bento-card"),
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

  // AI Reputation points reveal
  useEffect(() => {
    const points = Array.from(
      document.querySelectorAll<HTMLElement>(".ai-rep-point"),
    );
    if (!points.length) return;
    points.forEach((p, i) => {
      p.classList.add("ai-rep-init");
      p.style.setProperty("--ai-rep-delay", `${i * 140}ms`);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("ai-rep-in");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 },
    );
    points.forEach((p) => observer.observe(p));
    return () => {
      observer.disconnect();
    };
  }, []);

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
        <div className="container mx-auto px-4 pb-4 pt-1 md:pb-5 md:pt-2">
          <div className="hero-content hero-pop relative flex flex-col items-center p-2 md:p-3">
            <div className="absolute left-0 top-0 -z-10 h-32 w-32 rounded-full bg-blue-100 opacity-40 blur-2xl"></div>
            <div className="absolute bottom-0 right-0 -z-10 h-24 w-24 rounded-full bg-yellow-200 opacity-30 blur-2xl"></div>
            <div className="hero-text-container mb-2">
              <h1 className="hero-text text-center text-3xl font-extrabold leading-tight text-blue-800 drop-shadow-lg md:text-5xl">
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
                      className="message-load-image md:h-13 md:w-13 h-9 w-9 drop-shadow"
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
            <div className="hero-buttons hero-anim flex flex-col items-center justify-center gap-3">
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
                    <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
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
                  src="/images/srv characters (SVG)/Sir V. Discover.png"
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
                  src="/images/srv characters (SVG)/Sir V. Compare.png"
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
                  src="/images/srv characters (SVG)/Sir V. Book.png"
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
                  src="/images/srv characters (SVG)/Sir V. GID.png"
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
                    <ShieldCheckIcon className="icon-svg h-6 w-6" />
                  </div>
                  <h3 className="reason-title">Beripikado at Maaasahan</h3>
                  <p className="reason-description">
                    Kasama mo ang SRV sa paghanap ng mga service provider na may
                    kakayahan at beripikado.
                  </p>
                </div>

                <div className="reason-item">
                  <div className="reason-icon">
                    <UsersIcon className="icon-svg h-6 w-6" />
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
                    <GlobeAltIcon className="icon-svg h-6 w-6" />
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

          <div className="services-bento-grid grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pb-8">
            {/* Card 1: Home Repairs (Wide) */}
            <div className="bento-card md:col-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 overflow-hidden relative group">
              <div className="flex-1 flex flex-col justify-center z-10 relative">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100/50">
                  <img src="/images/categories/home-services.svg" alt="Home Repairs" className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 mb-3 font-rubik">Home Repairs</h3>
                <p className="text-slate-500 text-lg leading-relaxed">Electricians, plumbers, carpenters</p>
              </div>
              <div className="flex-1 relative min-h-[220px] md:min-h-full rounded-[1.5rem] overflow-hidden shadow-inner">
                <img src="services/electrician.jpeg" alt="Home Repairs" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>

            {/* Card 2: Automobile Repairs (Square) */}
            <div className="bento-card md:col-span-1 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col overflow-hidden relative group">
              <div className="z-10 relative mb-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100/50">
                  <img src="/images/categories/automobile-repairs.svg" alt="Automobile Repairs" className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3 font-rubik">Automobile Repairs</h3>
                <p className="text-slate-500 text-lg leading-relaxed">Mechanics, car detailing</p>
              </div>
              <div className="flex-1 relative min-h-[180px] rounded-[1.5rem] overflow-hidden shadow-inner mt-auto">
                <img src="services/mechanic.jpeg" alt="Automobile Repairs" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>

            {/* Card 3: Gadget & Appliance Tech (Square) */}
            <div className="bento-card md:col-span-1 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col overflow-hidden relative group">
              <div className="z-10 relative mb-6">
                <div className="w-14 h-14 bg-gray-50 border border-gray-100/50 rounded-2xl flex items-center justify-center mb-6">
                  <img src="/images/categories/gadget-technicians.svg" alt="Gadget & Appliance Tech" className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3 font-rubik">Gadget Tech</h3>
                <p className="text-slate-500 text-lg leading-relaxed">Phone repair, appliance fixing</p>
              </div>
              <div className="flex-1 relative min-h-[180px] rounded-[1.5rem] overflow-hidden shadow-inner mt-auto">
                <img src="services/technician.jpeg" alt="Gadget & Appliance Tech" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>

            {/* Card 4: Beauty Services (Wide) */}
            <div className="bento-card md:col-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 overflow-hidden relative group">
              <div className="flex-1 flex flex-col justify-center z-10 relative order-2 md:order-1">
                <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center mb-6 border border-pink-100/50">
                  <img src="/images/categories/beauty-services.svg" alt="Beauty Services" className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 mb-3 font-rubik">Beauty Services</h3>
                <p className="text-slate-500 text-lg leading-relaxed">Hair styling, manicures, facials</p>
              </div>
              <div className="flex-1 relative min-h-[220px] md:min-h-full rounded-[1.5rem] overflow-hidden shadow-inner order-1 md:order-2">
                <img src="services/hair-stylist.jpeg" alt="Beauty Services" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>

            {/* Card 5: Massage Services (Square) */}
            <div className="bento-card md:col-span-1 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col overflow-hidden relative group">
              <div className="z-10 relative mb-6">
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 border border-purple-100/50">
                  <img src="/images/categories/beauty-wellness.svg" alt="Massage Services" className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3 font-rubik">Massage Services</h3>
                <p className="text-slate-500 text-lg leading-relaxed">Therapy & relaxation treatments</p>
              </div>
              <div className="flex-1 relative min-h-[180px] rounded-[1.5rem] overflow-hidden shadow-inner mt-auto">
                <img src="services/massager.jpeg" alt="Massage Services" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>

            {/* Card 6: Delivery & Errands (Wide) */}
            <div className="bento-card md:col-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 overflow-hidden relative group">
              <div className="flex-1 flex flex-col justify-center z-10 relative">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 border border-green-100/50">
                  <img src="/images/categories/delivery-errands.svg" alt="Delivery & Errands" className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 mb-3 font-rubik">Delivery & Errands</h3>
                <p className="text-slate-500 text-lg leading-relaxed">Shopping, document delivery</p>
              </div>
              <div className="flex-1 relative min-h-[220px] md:min-h-full rounded-[1.5rem] overflow-hidden shadow-inner">
                <img src="services/delivery-man.jpeg" alt="Delivery & Errands" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>

            {/* Card 7: Tutoring (Full span bottom) */}
            <div className="bento-card md:col-span-3 bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 overflow-hidden relative group">
              <div className="flex-1 flex flex-col justify-center z-10 relative md:max-w-md">
                <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center mb-6 border border-yellow-100/50">
                  <img src="/images/categories/tutoring.svg" alt="Tutoring" className="w-8 h-8" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 font-rubik">Tutoring</h3>
                <p className="text-slate-500 text-lg leading-relaxed">Academic support, skill training, and personal development</p>
              </div>
              <div className="flex-[2] relative min-h-[260px] md:min-h-[320px] rounded-[1.5rem] overflow-hidden shadow-inner mt-4 md:mt-0">
                <img src="services/tutor.jpeg" alt="Tutoring" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 object-[center_30%]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI-Powered Trust & Reputation */}
      <section className="ai-reputation-section">
        <div className="container">
          <div className="ai-reputation-header">
            <h2 className="ai-reputation-title">
              AI-Powered Trust & Reputation
            </h2>
            <p className="ai-reputation-description">
              Every booking builds trust. Our AI engine analyzes reviews,
              detects suspicious patterns, and powers a reputation system you
              can rely on.
            </p>
          </div>

          <div className="ai-reputation-split">
            <ReputationCircle
              score={repScore}
              onClick={handleRepClick}
              celebrating={celebrating}
            />

            <div className="ai-reputation-content">
              <div className="ai-rep-point">
                <div className="ai-rep-point-icon">
                  <SparklesIcon />
                </div>
                <div className="ai-rep-point-text">
                  <h3 className="ai-rep-point-title">AI Review Intelligence</h3>
                  <p className="ai-rep-point-description">
                    Automated analysis detects suspicious language patterns and
                    rating anomalies, keeping fake reviews out and reputation
                    scores authentic.
                  </p>
                </div>
              </div>

              <div className="ai-rep-point">
                <div className="ai-rep-point-icon">
                  <ChartBarIcon />
                </div>
                <div className="ai-rep-point-text">
                  <h3 className="ai-rep-point-title">Dynamic Scoring Engine</h3>
                  <p className="ai-rep-point-description">
                    Always see the full picture with reputation scores updated
                    in real-time from completed bookings, verified ratings, and
                    AI-validated review data.
                  </p>
                </div>
              </div>

              <div className="ai-rep-point">
                <div className="ai-rep-point-icon">
                  <ShieldCheckIcon />
                </div>
                <div className="ai-rep-point-text">
                  <h3 className="ai-rep-point-title">Trust Assurance</h3>
                  <p className="ai-rep-point-description">
                    Fairness monitoring and anomaly flagging ensure the system
                    rewards genuine service excellence while protecting the
                    community from bad actors.
                  </p>
                </div>
              </div>
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
