import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {}
    }
  }, []);

  // Jump to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
