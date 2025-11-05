import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Prevent navigating back to the previous page from the current screen.
 * When the user taps the browser back button, they will be redirected to
 * the provided fallback route instead of the previous step in a flow.
 *
 * Notes:
 * - This only applies while the page using the hook is mounted.
 * - We push a state entry and listen for `popstate` to redirect with replace.
 */
export function useNoBackNavigation(fallbackPath: string) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Mark current entry so a back action triggers popstate while mounted
    try {
      window.history.pushState({ __noback: true }, "", location.pathname + location.search + location.hash);
    } catch {}

    const onPopState = () => {
      // Always redirect to a safe location; replace to avoid growing history
      navigate(fallbackPath, { replace: true });
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [navigate, fallbackPath, location.pathname, location.search, location.hash]);
}

export default useNoBackNavigation;
