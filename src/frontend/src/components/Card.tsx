import { ReactNode } from "react";

interface CardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable card component that serves as a container
 */
export function Card({ title, children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md ${className}`}
    >
      {title && <h3 className="mb-4 text-lg font-bold text-gray-900">{title}</h3>}
      {children}
    </div>
  );
}
