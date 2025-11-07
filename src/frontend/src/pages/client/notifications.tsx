// SECTION: Imports — dependencies for this page
import React, { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifications,
  Notification,
} from "../../hooks/useNotificationsWithPush";
import BottomNavigation from "../../components/client/NavigationBar";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import {
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  EnvelopeOpenIcon,
  InboxIcon,
  TicketIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/solid";
import { createPortal } from "react-dom";

// SECTION: NotificationIcon — icon by type and context
const NotificationIcon: React.FC<{
  type: Notification["type"];
  metadata?: any;
}> = ({ type, metadata }) => {
  const isTicketNotification = metadata?.ticketId !== undefined;

  let icon, bg;

  if (isTicketNotification) {
    icon = <TicketIcon className="h-6 w-6 text-orange-600" />;
    bg = "bg-orange-100";
  } else
    switch (type) {
      case "booking_accepted":
        icon = <CheckCircleIcon className="h-6 w-6 text-green-600" />;
        bg = "bg-green-100";
        break;
      case "booking_declined":
        icon = <XCircleIcon className="h-6 w-6 text-red-600" />;
        bg = "bg-red-100";
        break;
      case "booking_cancelled":
        icon = <XCircleIcon className="h-6 w-6 text-orange-500" />;
        bg = "bg-orange-100";
        break;
      case "booking_completed":
        icon = <CheckCircleIcon className="h-6 w-6 text-blue-600" />;
        bg = "bg-blue-100";
        break;
      case "payment_received":
        icon = <CheckCircleIcon className="h-6 w-6 text-green-700" />;
        bg = "bg-green-200";
        break;
      case "payment_failed":
        icon = <XCircleIcon className="h-6 w-6 text-red-700" />;
        bg = "bg-red-200";
        break;
      case "provider_message":
        icon = <EnvelopeOpenIcon className="h-6 w-6 text-purple-600" />;
        bg = "bg-purple-100";
        break;
      case "system_announcement":
        icon = <BellAlertIcon className="h-6 w-6 text-gray-700" />;
        bg = "bg-gray-200";
        break;
      case "service_rescheduled":
        icon = <BellAlertIcon className="h-6 w-6 text-yellow-700" />;
        bg = "bg-yellow-200";
        break;
      case "service_reminder":
        icon = <StarIcon className="h-6 w-6 text-blue-500" />;
        bg = "bg-blue-100";
        break;
      case "promo_offer":
        icon = <StarIcon className="h-6 w-6 text-pink-500" />;
        bg = "bg-pink-100";
        break;
      case "provider_on_the_way":
        icon = <BellAlertIcon className="h-6 w-6 text-teal-600" />;
        bg = "bg-teal-100";
        break;
      case "review_reminder":
        icon = <StarIcon className="h-6 w-6 text-yellow-500" />;
        bg = "bg-yellow-100";
        break;
      default:
        icon = <BellAlertIcon className="h-6 w-6 text-blue-600" />;
        bg = "bg-blue-100";
    }
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${bg}`}
    >
      {icon}
    </span>
  );
};

// SECTION: NotificationItem — list row with actions
const NotificationItem: React.FC<{
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
  onMarkAsRead: () => void;
  selectable?: boolean;
  checked?: boolean;
  onToggleSelect?: () => void;
}> = ({
  notification,
  onClick,
  onDelete,
  onMarkAsRead,
  selectable = false,
  checked = false,
  onToggleSelect,
}) => {
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  const getEnhancedMessage = () => {
    const providerName = notification.providerName
      ? ` by ${notification.providerName}`
      : "";

    switch (notification.type) {
      case "booking_accepted":
        return `Your booking has been accepted${providerName}. Service is confirmed and scheduled.`;
      case "booking_declined":
        return `Your booking was declined${providerName}. Please try booking with another provider.`;
      case "booking_cancelled":
        return `Your booking has been cancelled${providerName}. You can book again anytime.`;
      case "booking_completed":
        return `Service completed${providerName}. Thank you for using our platform!`;
      case "payment_received":
        return `Payment received successfully${providerName}. Your transaction is complete.`;
      case "payment_failed":
        return `Payment failed${providerName}. Please check your payment method and try again.`;
      case "chat_message":
        return `New message${providerName}. Tap to view and respond.`;
      case "system_announcement":
        return `System announcement: ${
          notification.message || "Important update from SRV team."
        }`;
      case "service_rescheduled":
        return `Service rescheduled${providerName}. Your appointment has been moved to a new time.`;
      case "promo_offer":
        return `Special offer available! ${
          notification.message || "Check out our latest promotions."
        }`;
      case "provider_on_the_way":
        return `Provider is on the way${providerName}. They should arrive shortly.`;
      case "review_reminder":
        return `Please review your experience${providerName}. Your feedback helps improve our service.`;
      default:
        return notification.message || "New notification from SRV";
    }
  };

  return (
    <div
      onClick={(e) => {
        if (selectable) {
          e.stopPropagation();
          onToggleSelect?.();
          return;
        }
        onClick();
      }}
      className={`relative flex items-start gap-4 p-4 transition-all duration-200 ${
        selectable ? "" : "hover:border-blue-200"
      } ${
        !notification.read
          ? "bg-blue-50 hover:bg-blue-100"
          : "bg-white hover:bg-gray-50"
      } ${
        notification.href && !selectable
          ? "cursor-pointer border border-transparent"
          : "cursor-default border border-transparent"
      }`}
      aria-selected={checked}
    >
      {selectable && (
        <div className="flex items-start pt-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label="Select notification"
          />
        </div>
      )}
      <div className="mt-1 flex-shrink-0">
        <NotificationIcon
          type={notification.type}
          metadata={notification.metadata}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-blue-900">
          {getEnhancedMessage()}
        </p>
        {notification.message &&
          notification.type !== "system_announcement" &&
          notification.type !== "promo_offer" &&
          notification.message !== getEnhancedMessage() && (
            <p className="mt-1 text-xs text-gray-600 italic">
              {notification.message}
            </p>
          )}
        <p className="mt-1 text-xs text-gray-500">
          {timeAgo(notification.timestamp)}
        </p>
      </div>
      <div className="ml-3 flex items-center gap-2">
        <div className="relative">
          <NotificationMenu
            id={notification.id}
            onDelete={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onMarkAsRead={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            isRead={notification.read}
          />
        </div>
      </div>
    </div>
  );
};

// SECTION: NotificationMenu — per-item action menu
const NotificationMenu: React.FC<{
  id: string;
  onDelete: (e: React.MouseEvent) => void;
  onMarkAsRead: (e: React.MouseEvent) => void;
  isRead: boolean;
}> = ({ id, onDelete, onMarkAsRead, isRead }) => {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  React.useEffect(() => {
    const onOtherOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string } | undefined;
      if (!detail) return;
      if (detail.id !== id) {
        setOpen(false);
      }
    };
    window.addEventListener(
      "notification-menu-open",
      onOtherOpen as EventListener,
    );
    return () =>
      window.removeEventListener(
        "notification-menu-open",
        onOtherOpen as EventListener,
      );
  }, [id]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = buttonRef.current;
    if (!btn) {
      setOpen((s) => !s);
      window.dispatchEvent(
        new CustomEvent("notification-menu-open", { detail: { id } }),
      );
      return;
    }
    const rect = btn.getBoundingClientRect();
    setCoords({ top: rect.bottom + 8, left: rect.right - 160 });
    setOpen((s) => {
      const next = !s;
      if (next) {
        window.dispatchEvent(
          new CustomEvent("notification-menu-open", { detail: { id } }),
        );
      }
      return next;
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(e);
    setOpen(false);
  };
  const menu = (
    <div
      ref={menuRef}
      style={
        coords
          ? { position: "fixed", top: coords.top, left: coords.left }
          : undefined
      }
      className="z-50 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        {!isRead && (
          <button
            onClick={(e) => {
              onMarkAsRead(e);
              setOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Mark as read
          </button>
        )}
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Notification options"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open && createPortal(menu, document.body)}
    </>
  );
};

const NotificationsPage = () => {
  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    unreadCount,
    deleteNotification,
  } = useNotifications();
  const navigate = useNavigate();

  const [deletedIds, setDeletedIds] = React.useState<string[]>([]);
  const [editMode, setEditMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const mobileMenuRef = React.useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = React.useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        mobileMenuButtonRef.current &&
        !mobileMenuButtonRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const handleLocalDelete = (id: string) => {
    setDeletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    deleteNotification(id);
  };

  const handleSelectAll = () => {
    const visibleIds = notifications
      .filter((n) => !deletedIds.includes(n.id))
      .map((n) => n.id);
    if (!editMode) {
      setSelectedIds(visibleIds);
      setEditMode(true);
      return;
    }
    if (selectedIds.length === visibleIds.length && visibleIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const bulkMarkAsRead = () => {
    selectedIds.forEach((id) => markAsRead(id));
    clearSelection();
    setEditMode(false);
  };

  const bulkDeleteSelected = () => {
    selectedIds.forEach((id) => {
      try {
        deleteNotification(id);
      } catch (e) {
        console.error("bulk delete failed for", id, e);
      }
    });
    setDeletedIds((prev) => Array.from(new Set([...prev, ...selectedIds])));
    clearSelection();
    setEditMode(false);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (!notification.href) return;

    navigate(notification.href);
  };

  const { unread, read } = useMemo(() => {
    const filtered = notifications.filter((n) => !deletedIds.includes(n.id));
    return filtered.reduce<{
      unread: Notification[];
      read: Notification[];
    }>(
      (acc, notif) => {
        if (notif.read) {
          acc.read.push(notif);
        } else {
          acc.unread.push(notif);
        }
        return acc;
      },
      { unread: [], read: [] },
    );
  }, [notifications, deletedIds]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 pb-20">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div
          className={`w-full px-4 py-3 ${
            notifications.length === 0
              ? "flex items-center justify-center"
              : "relative flex items-center justify-between"
          }`}
        >
          <h1
            className={`text-2xl font-extrabold tracking-tight text-black ${
              notifications.length === 0 && unreadCount > 0
                ? "sm:absolute sm:left-1/2 sm:-translate-x-1/2"
                : ""
            }`}
          >
            Notifications
          </h1>
          {notifications.length > 0 && (
            <>
              <div className="hidden sm:block" aria-hidden="true" />

              <div className="hidden items-center gap-2 sm:flex">
                <button
                  onClick={() => {
                    if (!editMode) {
                      setEditMode(true);
                      clearSelection();
                    } else {
                      setEditMode(false);
                      clearSelection();
                    }
                  }}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  {editMode ? "Done" : "Edit"}
                </button>
                <button
                  onClick={handleSelectAll}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  {selectedIds.length > 0 &&
                  selectedIds.length ===
                    notifications.filter((n) => !deletedIds.includes(n.id))
                      .length
                    ? "Clear"
                    : "Select all"}
                </button>
                {unread.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold whitespace-nowrap text-blue-700 shadow-sm hover:bg-blue-200 hover:text-blue-900"
                  >
                    <EnvelopeOpenIcon className="mr-1.5 h-4 w-4" />
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="relative sm:hidden">
                <button
                  ref={mobileMenuButtonRef}
                  onClick={() => setMobileMenuOpen((s) => !s)}
                  className="text-black-600 rounded-full p-2 hover:bg-gray-100"
                  aria-haspopup="true"
                  aria-expanded={mobileMenuOpen}
                >
                  <EllipsisVerticalIcon className="h-6 w-6" />
                </button>

                {mobileMenuOpen && (
                  <div
                    ref={mobileMenuRef}
                    className="ring-opacity-5 absolute top-full right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-blue-500"
                  >
                    <div className="py-1" role="menu">
                      <button
                        onClick={() => {
                          if (!editMode) {
                            setEditMode(true);
                            clearSelection();
                          } else {
                            setEditMode(false);
                            clearSelection();
                          }
                          setMobileMenuOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        {editMode ? "Done" : "Edit"}
                      </button>

                      <button
                        onClick={() => {
                          handleSelectAll();
                          setMobileMenuOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        {selectedIds.length > 0 &&
                        selectedIds.length ===
                          notifications.filter(
                            (n) => !deletedIds.includes(n.id),
                          ).length
                          ? "Clear selection"
                          : "Select all"}
                      </button>

                      {unread.length > 0 && (
                        <button
                          onClick={() => {
                            markAllAsRead();
                            setMobileMenuOpen(false);
                          }}
                          className="flex w-full items-center px-4 py-2 text-left text-sm font-medium text-blue-700 hover:bg-gray-100"
                          role="menuitem"
                        >
                          <EnvelopeOpenIcon className="mr-2 h-4 w-4" />
                          Mark all as read
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {editMode && (
        <div className="sticky top-14 z-30 mx-auto mt-2 flex max-w-2xl items-center justify-between gap-2 rounded-lg bg-white px-4 py-3 shadow">
          <div className="text-sm text-gray-700">
            {selectedIds.length} selected
          </div>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button
                onClick={bulkMarkAsRead}
                disabled={selectedIds.length === 0}
                className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"
              >
                Mark as read
              </button>
            )}
            <button
              onClick={bulkDeleteSelected}
              disabled={selectedIds.length === 0}
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                clearSelection();
              }}
              className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 pb-24">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading notifications…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500">{String(error)}</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center p-10 text-center text-gray-500">
            <InboxIcon className="mb-4 h-16 w-16 text-gray-300" />
            <h3 className="text-lg font-semibold">No Notifications Yet</h3>
            <p className="text-sm">
              We'll let you know when something important happens.
            </p>
          </div>
        ) : (
          <div className="mx-auto mt-6 max-w-2xl">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
              {unread.length > 0 && (
                <section>
                  <h2 className="border-b bg-gradient-to-r from-blue-500 to-blue-400 px-4 py-2 text-sm font-semibold tracking-wide text-white shadow-sm">
                    New
                  </h2>
                  <div className="divide-y divide-blue-100">
                    {unread.map((notif, idx) => (
                      <Appear
                        key={notif.id}
                        delayMs={idx * 25}
                        variant="fade-up"
                      >
                        <NotificationItem
                          notification={notif}
                          onClick={() => handleNotificationClick(notif)}
                          onDelete={() => handleLocalDelete(notif.id)}
                          onMarkAsRead={() => markAsRead(notif.id)}
                          selectable={editMode}
                          checked={selectedIds.includes(notif.id)}
                          onToggleSelect={() => toggleSelect(notif.id)}
                        />
                      </Appear>
                    ))}
                  </div>
                </section>
              )}
              {unread.length > 0 && read.length > 0 && <div className="my-4" />}
              {read.length > 0 && (
                <section>
                  <h2 className="bg-gradient-to-r from-gray-200 to-gray-100 px-4 py-2 text-sm font-semibold tracking-wide text-gray-700 shadow-sm">
                    Earlier
                  </h2>
                  <div className="divide-y divide-gray-100">
                    {read.map((notif, idx) => (
                      <Appear
                        key={notif.id}
                        delayMs={idx * 25}
                        variant="fade-up"
                      >
                        <NotificationItem
                          notification={notif}
                          onClick={() => handleNotificationClick(notif)}
                          onDelete={() => handleLocalDelete(notif.id)}
                          onMarkAsRead={() => markAsRead(notif.id)}
                          selectable={editMode}
                          checked={selectedIds.includes(notif.id)}
                          onToggleSelect={() => toggleSelect(notif.id)}
                        />
                      </Appear>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 z-30 w-full">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default NotificationsPage;
