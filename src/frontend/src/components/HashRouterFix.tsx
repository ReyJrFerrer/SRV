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
    const hash = window.location.hash;

    // Only redirect if hash is missing or empty
    if (
      pathname !== "/" &&
      pathname !== "/index.html" &&
      (!hash || hash === "#")
    ) {
      // Build the correct hash URL
      const correctHash = `#${pathname}${search}`;
      window.location.replace(correctHash);
    }
    // If hash is present, do nothing (let HashRouter handle it)
  }, []);

  return null;
};

export default HashRouterFix;
