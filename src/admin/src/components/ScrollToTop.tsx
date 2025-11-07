import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  // Disable automatic scroll restoration so we control it explicitly
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {
      }
    }
  }, []);

  // On each route change, jump to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
