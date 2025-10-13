import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  duration = 2500,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-6 left-1/2 z-[9999] -translate-x-1/2 rounded px-4 py-2 text-sm font-medium text-white shadow-lg transition-all ${type === "success" ? "bg-green-600" : "bg-red-600"}`}
      role="alert"
    >
      {message}
    </div>
  );
};

export default Toast;
