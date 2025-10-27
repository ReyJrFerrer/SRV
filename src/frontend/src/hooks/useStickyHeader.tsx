import { useEffect, useRef, useState } from "react";

export interface StickyHeaderOptions {
  stickyOffset?: number; // px before header sticks
  hideLocationDelta?: number; // additional px scrolled down before hiding location
  revealDelta?: number; // px scrolled up to reveal location
}

export function useStickyHeader(opts: StickyHeaderOptions = {}) {
  const { stickyOffset = 80, hideLocationDelta = 120, revealDelta = 16 } = opts;

  const [sticky, setSticky] = useState(false);
  const [showLocation, setShowLocation] = useState(true);

  const lastY = useRef<number>(
    typeof window !== "undefined" ? window.scrollY : 0,
  );
  const downAccum = useRef(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || 0;

        // Stick when past offset
        setSticky(y > stickyOffset);

        // Direction and deltas
        const dirDown = y > lastY.current;
        const delta = Math.abs(y - lastY.current);

        if (dirDown) {
          downAccum.current += delta;
          if (downAccum.current >= hideLocationDelta) {
            setShowLocation(false);
          }
        } else {
          // scrolling up reveals location with small threshold
          if (delta >= revealDelta) {
            setShowLocation(true);
          }
          downAccum.current = 0;
        }

        lastY.current = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [stickyOffset, hideLocationDelta, revealDelta]);

  return { sticky, showLocation };
}

export default useStickyHeader;
