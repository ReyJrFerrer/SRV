export interface SiteFooterProps {
  current: "home" | "about" | "contact";
  onHome: () => void;
  onAbout: () => void;
  onContact: () => void;
}

export function SiteFooter({
  current,
  onHome,
  onAbout,
  onContact,
}: SiteFooterProps) {
  const linkCls = (k: string) =>
    `footer-link ${current === k ? "nav-link-active" : ""}`;

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <a
              href="#"
              className="footer-logo-link"
              onClick={(e) => {
                e.preventDefault();
                onHome();
              }}
            >
              <img src="logo.svg" alt="SRV Logo" className="footer-logo" />
            </a>
          </div>

          <div className="footer-section footer-nav">
            <ul className="footer-links nav-links">
              <li>
                <a
                  href="#"
                  className={linkCls("home")}
                  onClick={(e) => {
                    e.preventDefault();
                    onHome();
                  }}
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={linkCls("about")}
                  onClick={(e) => {
                    e.preventDefault();
                    onAbout();
                  }}
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={linkCls("contact")}
                  onClick={(e) => {
                    e.preventDefault();
                    onContact();
                  }}
                >
                  Contact
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
  );
}
