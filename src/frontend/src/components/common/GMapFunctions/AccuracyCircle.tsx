import React, { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface AccuracyCircleProps {
  center: { lat: number; lng: number };
  radius: number;
}

const AccuracyCircle: React.FC<AccuracyCircleProps> = ({ center, radius }) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !window.google || typeof radius !== "number") return;
    if (!circleRef.current) {
      circleRef.current = new window.google.maps.Circle({
        strokeColor: "#2563eb",
        strokeOpacity: 0.9,
        strokeWeight: 1,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
      });
      circleRef.current.setMap(map);
    }
    circleRef.current.setCenter(center);
    circleRef.current.setRadius(radius);
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, center.lat, center.lng, radius]);

  return null;
};

export default AccuracyCircle;
