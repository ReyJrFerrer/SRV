import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  title?: string;
  children?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  height?: "small" | "medium" | "large";
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  title = "Bottom Sheet",
  children,
  isOpen,
  onClose,
  height = "medium",
}) => {
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Set the height based on prop
  const getHeight = () => {
    switch (height) {
      case "small":
        return "h-1/4";
      case "large":
        return "h-4/5";
      default:
        return "h-1/2";
    }
  };

  // Handle clicking outside the bottom sheet
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Handle drag gesture
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const startY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const sheet = sheetRef.current;

    if (!sheet) return;

    const handleMove = (moveEvent: TouchEvent | MouseEvent) => {
      const currentY =
        "touches" in moveEvent
          ? moveEvent.touches[0].clientY
          : (moveEvent as MouseEvent).clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        // Only allow dragging down
        sheet.style.transform = `translateY(${deltaY}px)`;
      }
    };

    const handleEnd = (endEvent: TouchEvent | MouseEvent) => {
      const currentY =
        "changedTouches" in endEvent
          ? endEvent.changedTouches[0].clientY
          : (endEvent as MouseEvent).clientY;
      const deltaY = currentY - startY;

      if (deltaY > 100) {
        // Threshold to close
        onClose();
      } else {
        // Reset position
        sheet.style.transform = "";
      }

      document.removeEventListener("mousemove", handleMove as any);
      document.removeEventListener("touchmove", handleMove as any);
      document.removeEventListener("mouseup", handleEnd as any);
      document.removeEventListener("touchend", handleEnd as any);
    };

    document.addEventListener("mousemove", handleMove as any);
    document.addEventListener("touchmove", handleMove as any);
    document.addEventListener("mouseup", handleEnd as any);
    document.addEventListener("touchend", handleEnd as any);
  };

  // Mount the component on client side only
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={backdropRef}
        className="bg-opacity-50 fixed inset-0 bg-black transition-opacity duration-300"
        onClick={handleBackdropClick}
      />

      <div
        ref={sheetRef}
        className={`bottom-sheet fixed inset-x-0 bottom-0 ${getHeight()} transform rounded-t-3xl bg-white shadow-xl transition-transform duration-300 ease-in-out`}
      >
        <div
          className="absolute top-0 right-0 left-0 h-10 cursor-grab"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="bottom-sheet-handle" />
        </div>

        {title && (
          <h3 className="px-6 pt-6 pb-4 text-lg font-semibold">{title}</h3>
        )}

        <div className="h-full overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default BottomSheet;
