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

    // If we have a path other than "/" and we're using HashRouter
    // This means the URL is malformed (path should be in hash, not pathname)
    if (pathname !== "/" && pathname !== "/index.html") {
      // Build the correct hash URL
      // Move the pathname and search to the hash
      const correctHash = `#${pathname}${search}`;
      
      // Replace the URL with the correct format
      window.location.replace(correctHash);
    }
  }, []);

  return null;
};

export default HashRouterFix;
