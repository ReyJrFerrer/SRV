import { useEffect } from "react";

/**
 * HashRouterFix Component
 *
 * Fixes malformed URLs where the path appears before the hash (#) instead of after it.
 * This happens when URLs are shared or bookmarked incorrectly with HashRouter.
 *
 * Example of malformed URL:
 * https://srvpinoy.com/provider/receipt/123?price=100#/provider/home
 *
 * Should be:
 * https://srvpinoy.com/#/provider/receipt/123?price=100
 */
const HashRouterFix: React.FC = () => {
  useEffect(() => {
    const pathname = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash; // includes leading '#'

    // If we have a path other than "/" and we're using HashRouter
    // This means the URL is malformed (path should be in hash, not pathname)
    if (pathname !== "/" && pathname !== "/index.html") {
      // If there's already a hash (e.g. someone navigated via a hash route),
      // prefer the last hash fragment so we return to the page the user
      // actually visited (the hash route).
      const correctHash = hash && hash !== "#" ? hash : `#${pathname}${search}`;

      // Build full URL with origin so the pathname becomes '/'
      const targetUrl = `${window.location.origin}/${correctHash}`;

      // Replace the URL with the correct format (no history entry)
      window.location.replace(targetUrl);
    }
  }, []);

  return null;
};

export default HashRouterFix;
