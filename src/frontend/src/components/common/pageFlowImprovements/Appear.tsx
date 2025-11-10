import React from "react";

type Variant = "fade" | "fade-up" | "fade-scale";

interface Props {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  variant?: Variant;
}

// Simple wrapper to apply a fade-in animation to components, with optional delay and subtle variants
const Appear: React.FC<Props> = ({
  children,
  className,
  delayMs = 0,
  variant = "fade",
}) => {
  const variantClass =
    variant === "fade-up"
      ? "fade-in-up"
      : variant === "fade-scale"
        ? "fade-in-scale"
        : "fade-in";

  return (
    <div
      className={`${variantClass} ${className ?? ""}`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
};

export default Appear;
