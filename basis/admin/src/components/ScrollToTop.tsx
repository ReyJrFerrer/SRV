import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop ensures that when navigating between routes, the page
 * scroll position is reset to the top. This prevents cases where the
 * next page opens scrolled near the bottom due to preserved history state.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  // Disable automatic scroll restoration so we control it explicitly
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {
        // no-op: some environments may not allow changing this
      }
    }
  }, []);

  // On each route change, jump to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
