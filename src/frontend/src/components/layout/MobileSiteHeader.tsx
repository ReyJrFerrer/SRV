import { useState, useEffect } from "react";
import { JoinWaitlistButton } from "../shared/LoginButton";

export interface MobileSiteHeaderProps {
  current: "home" | "about" | "contact";
  onHome: () => void;
  onAbout: () => void;
  onContact: () => void;
  onLogin: () => void;
  isLoginLoading: boolean;
}

export function MobileSiteHeader({
  current,
  onHome,
  onAbout,
  onContact,
  onLogin,
  isLoginLoading,
}: MobileSiteHeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  const navLinkClass = (key: string) =>
    [
      "nav-link",
      "px-4 py-3 w-full rounded-md border-b-2 border-transparent text-lg font-medium transition-colors",
      current === key
        ? "nav-link-active text-yellow-600 border-yellow-400 bg-yellow-50"
        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50",
    ].join(" ");

  return (
    <header className="site-header sticky top-0 z-50 rounded-b-2xl border-b border-blue-100 bg-white/80 shadow-lg backdrop-blur-lg md:hidden">
      {/* Top bar */}
      <div className="container mx-auto flex items-center px-4 py-2">
        <a
          href="#"
          className="logo-link flex items-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            onHome();
            close();
            window.scrollTo(0, 0);
          }}
          aria-label="SRV Home"
        >
          <img
            src="/logo.svg"
            alt="SRV Logo"
            className="logo-image h-9 w-auto"
          />
        </a>

        <button
          type="button"
          aria-label="Toggle navigation"
          aria-controls="mobile-nav"
          aria-expanded={open}
          className={`mobile-menu-toggle relative z-[60] ml-auto p-2 text-slate-700 transition-opacity duration-300 ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          onClick={() => setOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed left-0 top-0 z-40 h-[100dvh] w-screen bg-black/70 backdrop-blur-md transition-opacity duration-300"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Right side off-canvas panel (modified) */}
      <nav
        id="mobile-nav"
        aria-label="Mobile Primary"
        className={`fixed right-0 top-0 z-50 flex h-screen w-72 max-w-[80%] transform flex-col bg-white/95 shadow-xl backdrop-blur-lg transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <button
          onClick={close}
          className="absolute right-4 top-4 p-2 text-black hover:text-gray-800 focus:outline-none"
          aria-label="Close menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex min-h-full flex-col px-6 pb-4 pt-20">
          <ul className="nav-list flex flex-col gap-2">
            <li>
              <a
                href="#"
                className={navLinkClass("home")}
                onClick={(e) => {
                  e.preventDefault();
                  onHome();
                  close();
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
                  close();
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
                  close();
                  window.scrollTo(0, 0);
                }}
              >
                Contact
              </a>
            </li>
          </ul>

          {/* Centered Join button at bottom */}
          <div className="mt-auto flex w-full justify-center pb-6">
            <JoinWaitlistButton
              onClick={onLogin}
              loading={isLoginLoading}
              variant="mobile"
              fullWidth
              className="w-full"
              afterClick={close}
            />
          </div>

          <div className="pb-4 text-center text-[10px] text-slate-500">
            © {new Date().getFullYear()} SRV
          </div>
        </div>
      </nav>
    </header>
  );
}
