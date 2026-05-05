import React, { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifications,
  Notification,
} from "../../hooks/useNotificationsWithPush";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import { InboxIcon, EnvelopeOpenIcon } from "@heroicons/react/24/solid";
import NotificationItem from "../../components/client/NotificationItemClient";
import SmartHeader from "../../components/common/SmartHeader";

const NotificationsPage = () => {
  const navigate = useNavigate();

  const {
    notifications,
    loading,
    error,
    markAsRead,
    deleteNotification,
    markAllAsRead,
  } = useNotifications();

  // Track processed notification IDs to prevent flickering from re-renders
  const [stableNotifications, setStableNotifications] = React.useState<
    Notification[]
  >([]);

  // Set the document title
  useEffect(() => {
    document.title = "Notifications | SRV";
  }, []);

  // Stabilize notifications similar to provider page to detect changes in read status, type, etc.
  const previousNotificationsRef = React.useRef<Map<string, string>>(new Map());

  React.useEffect(() => {
    if (loading) return;

    const nextMap = new Map<string, string>();
    notifications.forEach((n) => {
      try {
        nextMap.set(
          n.id,
          JSON.stringify({
            id: n.id,
            type: n.type,
            read: n.read,
            href: n.href,
          }),
        );
      } catch (e) {
        nextMap.set(n.id, String(n.id));
      }
    });

    const prevMap = previousNotificationsRef.current;
    let changed = false;
    if (prevMap.size !== nextMap.size) {
      changed = true;
    } else {
      for (const [id, sig] of nextMap.entries()) {
        if (prevMap.get(id) !== sig) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      previousNotificationsRef.current = nextMap;
      setStableNotifications(notifications);
    }
  }, [notifications, loading]);

  const [deletedIds, setDeletedIds] = React.useState<string[]>([]);

  // Tabs for categorizing notifications
  type NotificationTab = "All" | "Bookings" | "Ratings" | "System" | "Admin";

  const TAB_ITEMS: NotificationTab[] = [
    "All",
    "Bookings",
    "Ratings",
    "System",
    "Admin",
  ];

  const [activeTab, setActiveTab] = useState<NotificationTab>("All");

  // Edit / selection mode
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

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { id?: string } | undefined;
      const id = detail?.id;
      if (!id) return;
      setDeletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };
    window.addEventListener("notification-ui-delete", handler as EventListener);
    return () =>
      window.removeEventListener(
        "notification-ui-delete",
        handler as EventListener,
      );
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Determine if a notification should be displayed on the Notifications page.
  const isVisibleOnPage = (n: Notification) => {
    const hiddenTypes = new Set([
      "chat_message",
      "provider_message",
      "new_booking_request",
    ]);
    return !hiddenTypes.has(n.type);
  };

  // Helper to map notification type to a UI category
  const categoryOfType = (type: string) => {
    const bookingTypes = [
      "booking_accepted",
      "booking_declined",
      "booking_cancelled",
      "booking_completed",
      "payment_received",
      "payment_failed",
      "service_rescheduled",
      "service_reminder",
      "provider_on_the_way",
      "start_service",
      "start_navigation",
    ];
    const systemTypes = [
      "system_announcement",
      "promo_offer",
      "admin_message",
      "platform_update",
    ];
    if (bookingTypes.includes(type)) return "Bookings";
    if (type === "review_reminder") return "Ratings";
    if (systemTypes.includes(type)) return "System";
    if (type === "provider_message") return "Admin";
    if (type === "generic") return "Admin";
    return "All";
  };

  const getCountForTab = (tab: NotificationTab) => {
    const visible = stableNotifications.filter(
      (n) => !deletedIds.includes(n.id) && isVisibleOnPage(n),
    );
    if (tab === "All") return visible.length;
    return visible.filter((n) => categoryOfType(n.type) === tab).length;
  };

  const clearSelection = () => setSelectedIds([]);

  const handleSelectAll = () => {
    const visibleIds = stableNotifications
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

  const bulkMarkAsRead = async () => {
    const idsToMark = [...selectedIds];
    clearSelection();
    setEditMode(false);

    await Promise.all(idsToMark.map((id) => markAsRead(id)));
  };

  const bulkDeleteSelected = async () => {
    const idsToDelete = [...selectedIds];
    setDeletedIds((prev) => Array.from(new Set([...prev, ...idsToDelete])));
    clearSelection();
    setEditMode(false);

    await Promise.all(
      idsToDelete.map(async (id) => {
        try {
          await deleteNotification(id);
        } catch (e) {
          console.error(`Failed to delete notification ${id}:`, e);
        }
      }),
    );
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id).catch((e) =>
        console.error("Failed to mark notification as read:", e),
      );
    }

    if (!notification.href) return;

    navigate(notification.href);
  };

  const { unread, read } = useMemo(() => {
    const visible = stableNotifications.filter(
      (n) => !deletedIds.includes(n.id) && isVisibleOnPage(n),
    );

    const byTab =
      activeTab === "All"
        ? visible
        : visible.filter((n) => categoryOfType(n.type) === activeTab);

    return byTab.reduce<{
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
  }, [stableNotifications, deletedIds, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <SmartHeader
        title="Notifications"
        showBackButton={false}
        userRole="client"
        rightAction={undefined}
      />

      {/* Tabs navigation for notification categories */}
      <div className="mx-auto mb-6 mt-4 max-w-2xl px-4">
        <div className="hide-scrollbar flex overflow-x-auto whitespace-nowrap pb-2">
          <nav className="flex w-max space-x-2 rounded-xl border border-gray-100 bg-white p-1 shadow-sm sm:w-auto">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-1 items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 sm:flex-none ${
                  activeTab === tab
                    ? "bg-gray-100 text-blue-700 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {tab}
                <span
                  className={`ml-2 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    activeTab === tab
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {getCountForTab(tab)}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {stableNotifications.length > 0 && (
        <div className="mx-auto mb-4 max-w-2xl px-2 md:px-0">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-md">
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
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              {editMode ? "Done" : "Edit"}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                {selectedIds.length > 0 &&
                selectedIds.length ===
                  stableNotifications.filter((n) => !deletedIds.includes(n.id))
                    .length
                  ? "Clear"
                  : "Select all"}
              </button>
              {unread.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center whitespace-nowrap rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-200 hover:text-blue-900"
                >
                  <EnvelopeOpenIcon className="mr-1.5 h-4 w-4" />
                  Mark all as read
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editMode && (
        <div className="sticky top-14 z-30 mx-auto max-w-2xl px-2 md:px-0">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-md">
            <div className="text-sm text-gray-700 whitespace-nowrap">
              {selectedIds.length} selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
        </div>
      )}

      <main className="flex-1 px-2 pb-24 sm:px-4 md:px-8">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading notifications…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500">{String(error)}</div>
        ) : stableNotifications.length === 0 ? (
          <div className="flex flex-col items-center p-10 text-center text-gray-500">
            <InboxIcon className="mb-4 h-16 w-16 text-gray-300" />
            <h3 className="text-lg font-semibold">No Notifications Yet</h3>
            <p className="text-sm">
              We'll let you know when something important happens.
            </p>
          </div>
        ) : (
          <div className="mx-auto mt-6 max-w-2xl px-2 md:px-0">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
              {unread.length > 0 && (
                <section>
                  <h2 className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3 text-sm font-bold tracking-wide text-gray-900 shadow-sm">
                    <span>New</span>
                    <span
                      aria-label={`${unread.length} new notifications`}
                      className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-2 py-0.5 text-[11px] font-bold text-white"
                    >
                      {unread.length > 99 ? "99+" : unread.length}
                    </span>
                  </h2>
                  <div className="divide-y divide-gray-100">
                    {unread.map((notif, idx) => (
                      <Appear
                        key={notif.id}
                        delayMs={idx * 25}
                        variant="fade-up"
                      >
                        <NotificationItem
                          notification={notif}
                          onClick={() => handleNotificationClick(notif)}
                          onDelete={async () => {
                            try {
                              setDeletedIds((prev) => [...prev, notif.id]);
                              await deleteNotification(notif.id);
                            } catch (e) {
                              console.error(
                                "Failed to delete notification:",
                                e,
                              );
                              setDeletedIds((prev) =>
                                prev.filter((id) => id !== notif.id),
                              );
                            }
                          }}
                          onMarkAsRead={async () => {
                            try {
                              await markAsRead(notif.id);
                            } catch (e) {
                              console.error(
                                "Failed to mark notification as read:",
                                e,
                              );
                            }
                          }}
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
                  <h2 className="border-b border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold tracking-wide text-gray-900 shadow-sm">
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
                          onDelete={() => deleteNotification(notif.id)}
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

      <div className="fixed bottom-0 left-0 z-30 w-full"></div>
    </div>
  );
};

export default NotificationsPage;
