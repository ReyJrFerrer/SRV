import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";

/**
 * Tiny top progress bar showing during route transitions and data fetches.
 * No external dependency; uses a simple timed progression that caps at 85% until idle.
 */
const TopProgressBar: React.FC = () => {
  const location = useLocation();
  const isFetching = useIsFetching();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const fallbackRef = useRef<number | null>(null);

  // Drive the progress forward while loading
  const start = () => {
    if (!visible) {
      setVisible(true);
      setProgress(8); // quick start
    }
    if (timerRef.current) return;
    // Clear any existing fallback finish timer (we're actively loading again)
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }

    timerRef.current = window.setInterval(() => {
      setProgress((p) => {
        // Ease towards 85%
        if (p < 85) {
          const delta = Math.max(0.5, (85 - p) * 0.05);
          return Math.min(85, p + delta);
        }
        return p;
      });
    }, 120);

    // Safety fallback: if nothing finishes (no fetch end), hide after a short time
    // This prevents the bar from sticking visible when route changes but no network occurs
    if (!fallbackRef.current) {
      fallbackRef.current = window.setTimeout(() => {
        finish();
      }, 1200);
    }
  };

  const finish = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
    setProgress(100);
    // Allow the 100% state to render briefly, then hide
    window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
  };

  // Start on route change
  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash]);

  // Also react to React Query global fetching
  useEffect(() => {
    if (isFetching > 0) {
      start();
    } else {
      // If no fetching and we already triggered a start, finish
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[9999] h-0.5 bg-transparent"
    >
      <div
        className="h-full"
        style={{
          width: `${progress}%`,
          transition: "width 120ms ease-out",
          background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
          boxShadow: "0 0 10px rgba(59,130,246,0.45)",
        }}
      />
    </div>
  );
};

export default TopProgressBar;
