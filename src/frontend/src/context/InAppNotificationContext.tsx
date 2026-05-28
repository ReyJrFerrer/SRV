import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import InAppNotificationPopup from "../components/notifications/InAppNotificationPopup";

export interface InAppNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  href?: string;
  duration?: number;
  exiting?: boolean;
}

interface InAppNotificationContextValue {
  notifications: InAppNotificationItem[];
  showNotification: (
    notification: Omit<InAppNotificationItem, "id" | "exiting">,
  ) => void;
  dismissNotification: (id: string) => void;
}

const InAppNotificationContext = createContext<
  InAppNotificationContextValue | undefined
>(undefined);

export function useInAppNotification() {
  const context = useContext(InAppNotificationContext);
  if (!context) {
    throw new Error(
      "useInAppNotification must be used within an InAppNotificationProvider",
    );
  }
  return context;
}

export const InAppNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>(
    [],
  );
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissNotification = useCallback((id: string) => {
    // Mark as exiting so CSS exit animation plays
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, exiting: true } : n)),
    );

    // Clear any pending auto-dismiss timer
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }

    // Remove from state after exit animation completes
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 220);
  }, []);

  const showNotification = useCallback(
    (notification: Omit<InAppNotificationItem, "id" | "exiting">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const duration = notification.duration ?? 5000;

      const newNotification: InAppNotificationItem = {
        ...notification,
        id,
        exiting: false,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-dismiss after duration
      const timer = window.setTimeout(() => {
        dismissNotification(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [dismissNotification],
  );

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <InAppNotificationContext.Provider
      value={{ notifications, showNotification, dismissNotification }}
    >
      {children}
      {/* Global notification popup container */}
      {notifications.length > 0 && (
        <div className="pointer-events-none fixed left-0 right-0 top-0 z-[10000]">
          {notifications.map((notification, index) => (
            <InAppNotificationPopup
              key={notification.id}
              notification={notification}
              index={index}
              onDismiss={() => dismissNotification(notification.id)}
            />
          ))}
        </div>
      )}
    </InAppNotificationContext.Provider>
  );
};
