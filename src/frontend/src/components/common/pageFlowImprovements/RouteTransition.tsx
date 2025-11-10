import React from "react";
import { useLocation } from "react-router-dom";

interface Props {
  className?: string;
  children: React.ReactNode;
}

// Lightweight route enter animation wrapper using a key on pathname
// to trigger a fresh mount and CSS-based fade/slide-in.
const RouteTransition: React.FC<Props> = ({ className, children }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className={`page-enter ${className ?? ""}`}>
      {children}
    </div>
  );
};

export default RouteTransition;
