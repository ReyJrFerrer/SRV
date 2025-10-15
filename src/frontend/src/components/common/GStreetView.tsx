import React, { useEffect, useRef } from "react";

interface Props {
  position: google.maps.LatLngLiteral;
  pov?: { heading: number; pitch: number };
  options?: google.maps.StreetViewPanoramaOptions;
  style?: React.CSSProperties;
  className?: string;
}

const GStreetView: React.FC<Props> = ({ position, pov, options, style, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const failedRef = useRef<boolean>(false);

  // Initialize once
  useEffect(() => {
    if (!containerRef.current) return;
    const init = () => {
      if (!containerRef.current || panoRef.current || !(window as any).google?.maps || failedRef.current) return false;
      try {
        panoRef.current = new google.maps.StreetViewPanorama(containerRef.current, {
          position,
          pov: pov || { heading: 0, pitch: 0 },
          ...(options || {}),
        });
        return true;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug("StreetView init failed:", e);
        failedRef.current = true;
        return false;
      }
    };

    if (!(window as any).google?.maps) {
      const iv = window.setInterval(() => {
        if (init()) {
          window.clearInterval(iv);
        }
      }, 200);
      return () => window.clearInterval(iv);
    }

    init();
    return () => {
      try {
        panoRef.current?.setVisible(false);
      } catch {}
      panoRef.current = null;
      failedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update position when it changes
  useEffect(() => {
    if (!panoRef.current) return;
    const curr = panoRef.current.getPosition?.();
    const currLat = typeof curr?.lat === "function" ? curr.lat() : undefined;
    const currLng = typeof curr?.lng === "function" ? curr.lng() : undefined;
    if (currLat !== position.lat || currLng !== position.lng) {
      panoRef.current.setPosition(position);
    }
  }, [position.lat, position.lng]);

  // Update POV when it changes
  useEffect(() => {
    if (!panoRef.current || !pov) return;
    const curr = panoRef.current.getPov?.();
    if (!curr || curr.heading !== pov.heading || curr.pitch !== pov.pitch) {
      panoRef.current.setPov(pov as any);
    }
  }, [pov?.heading, pov?.pitch]);

  // Update options when they change (shallow via JSON)
  const optsJson = JSON.stringify(options || {});
  useEffect(() => {
    if (!panoRef.current || !options) return;
    panoRef.current.setOptions(options);
  }, [optsJson]);

  return <div ref={containerRef} style={style} className={className} />;
};

export default GStreetView;
