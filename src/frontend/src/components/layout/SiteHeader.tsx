import { useState, useEffect } from "react";
import { JoinWaitlistButton } from "../shared/JoinWaitlistButton";

export interface SiteHeaderProps {
  current: "home" | "about" | "contact";
  onHome: () => void;
  onAbout: () => void;
  onContact: () => void;
  onLogin: () => void;
  isLoginLoading: boolean;
}

export function SiteHeader({
  current,
  onHome,
  onAbout,
  onContact,
  onLogin,
  isLoginLoading,
}: SiteHeaderProps) {
  const [isMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
  }, [isMobileMenuOpen]);

  const navLinkClass = (key: string) =>
    [
      "nav-link",
      "px-4 py-2 rounded-md border-b-2 border-transparent transition-colors",
      current === key
        ? "nav-link-active text-yellow-600 border-yellow-400 bg-yellow-50"
        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50",
    ].join(" ");

  return (
    <header className="site-header sticky top-0 z-40 hidden rounded-b-2xl border-b border-blue-100 bg-white/80 shadow-lg backdrop-blur-lg md:block">
      <div className="container mx-auto flex items-center px-4 py-1">
        {/* Logo */}
        <a
          href="#"
          className="logo-link flex items-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            onHome();
            window.scrollTo(0, 0);
          }}
          aria-label="SRV Home"
        >
          <img
            src="/logo.svg"
            alt="SRV Logo"
            className="logo-image h-10 w-auto"
          />
        </a>

        {/* Center nav */}
        <nav
          className="flex flex-1 items-center justify-center"
          aria-label="Primary"
        >
          <ul className="nav-list flex items-center gap-2 xl:gap-4">
            <li>
              <a
                href="#"
                className={navLinkClass("home")}
                onClick={(e) => {
                  e.preventDefault();
                  onHome();
                  window.scrollTo(0, 0);
                }}
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="#"
                className={navLinkClass("about")}
                onClick={(e) => {
                  e.preventDefault();
                  onAbout();
                  window.scrollTo(0, 0);
                }}
              >
                About
              </a>
            </li>
            <li>
              <a
                href="#"
                className={navLinkClass("contact")}
                onClick={(e) => {
                  e.preventDefault();
                  onContact();
                  window.scrollTo(0, 0);
                }}
              >
                Contact
              </a>
            </li>
          </ul>
        </nav>

        {/* Right side button */}
        <div className="header-button">
          <JoinWaitlistButton onClick={onLogin} loading={isLoginLoading} />
        </div>
      </div>
    </header>
  );
}
