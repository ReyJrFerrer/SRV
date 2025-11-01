import React from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

// Simple wrapper to apply a fade-in animation to components, with optional delay
const Appear: React.FC<Props> = ({ children, className, delayMs = 0 }) => {
  return (
    <div
      className={`fade-in ${className ?? ""}`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
};

export default Appear;
