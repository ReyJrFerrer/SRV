import { useEffect } from "react";

const HashRouterFix: React.FC = () => {
  useEffect(() => {
    const pathname = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash; // includes leading '#'

    // Case 1: Nested hash fragments (e.g., /path#/another#/third)
    // This happens when navigation occurs multiple times with hash routing
    if (hash && hash.includes("#", 1)) {
      // Extract the last hash fragment which is the actual route
      const lastHashIndex = hash.lastIndexOf("#");
      const correctHash = hash.substring(lastHashIndex);

      console.log("[HashRouterFix] Detected nested hash, fixing:", {
        original: window.location.href,
        correctHash,
      });

      // Build correct URL with only the last hash fragment
      const targetUrl = `${window.location.origin}/${correctHash}`;
      window.location.replace(targetUrl);
      return;
    }

    // Case 2: Path-based route when using HashRouter
    // If we have a path other than "/" and we're using HashRouter,
    // the URL is malformed (path should be in hash, not pathname)
    if (pathname !== "/" && pathname !== "/index.html") {
      // If there's already a hash (e.g. someone navigated via a hash route),
      // prefer the hash so we return to the page the user actually visited.
      const correctHash = hash && hash !== "#" ? hash : `#${pathname}${search}`;

      console.log(
        "[HashRouterFix] Detected path-based route, converting to hash:",
        {
          original: window.location.href,
          correctHash,
        },
      );

      // Build full URL with origin so the pathname becomes '/'
      const targetUrl = `${window.location.origin}/${correctHash}`;

      // Replace the URL with the correct format (no history entry)
      window.location.replace(targetUrl);
    }
  }, []);

  return null;
};

export default HashRouterFix;
