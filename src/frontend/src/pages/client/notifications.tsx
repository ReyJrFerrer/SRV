// SECTION: Imports — dependencies for this page
import React, { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifications,
  Notification,
} from "../../hooks/useNotificationsWithPush";
import BottomNavigation from "../../components/client/NavigationBar";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import EmptyState from "../../components/common/EmptyState";
import {
  EnvelopeOpenIcon,
  InboxIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/solid";
import NotificationItem from "../../components/client/NotificationItemClient";

// NotificationItem and NotificationMenu moved to components/notifications

const NotificationsPage = () => {
  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const navigate = useNavigate();

  // Track processed notification IDs to prevent flickering from re-renders
  const processedNotificationsRef = React.useRef<Set<string>>(new Set());
  const [stableNotifications, setStableNotifications] = React.useState<
    Notification[]
  >([]);

  // Track if this is the initial load
  const isInitialLoadRef = React.useRef(true);

  // Stabilize notifications array to prevent flickering
  React.useEffect(() => {
    // On initial load, wait for loading to finish before showing anything
    if (isInitialLoadRef.current && loading) {
      return;
    }

    // After initial load completes, mark it as done
    if (isInitialLoadRef.current && !loading) {
      isInitialLoadRef.current = false;
    }

    // If loading again after initial load, keep showing stable notifications
    if (loading && !isInitialLoadRef.current) {
      return;
    }

    // Check if there are new notifications that haven't been processed
    const newNotifications = notifications.filter(
      (n) => !processedNotificationsRef.current.has(n.id),
    );

    if (newNotifications.length > 0 || notifications.length === 0) {
      // Mark all current notifications as processed
      notifications.forEach((n) => {
        processedNotificationsRef.current.add(n.id);
      });

      // Update stable notifications only when there are actual changes
      setStableNotifications(notifications);
    }
  }, [notifications, loading]);

  // Local-only deleted ids (UI only for now). Backend delete will be wired later.
  const [deletedIds, setDeletedIds] = React.useState<string[]>([]);

  // Stabilize notifications like the provider page to avoid flicker and
  // ensure client-side filtering reacts to meaningful changes (read flag,
  // type, href, etc.) even if the upstream hook mutates the array in place.
  const previousNotificationsRef = React.useRef<Map<string, string>>(new Map());

  // Stabilize incoming notifications similar to provider page.
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

    if (changed || notifications.length === 0) {
      previousNotificationsRef.current = nextMap;
      setStableNotifications(notifications);
    }
  }, [notifications, loading]);

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

  // Determine if a notification should be displayed on the Notifications page.
  // We intentionally hide chat messages here, but include booking accepts per new UX.
  const isVisibleOnPage = (n: Notification) => {
    const hiddenTypes = new Set([
      "chat_message",
      "provider_message",
      // new_booking_request is client-irrelevant; keep hidden
      "new_booking_request",
      // booking_accepted is now included as a visible notification
    ]);
    return !hiddenTypes.has(n.type);
  };

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
      } catch (e) {}
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

  const { unread, read } = useMemo(() => {
    // First filter out locally deleted items and types we purposely hide from this page
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
      <header className="sticky top-0 z-20 bg-white">
        <div className="relative flex w-full items-center justify-center px-4 py-3">
          <h1 className="text-center text-xl font-extrabold tracking-tight text-black lg:text-2xl">
            Notifications
          </h1>
          {stableNotifications.length > 0 && (
            <>
              <div className="hidden sm:block" aria-hidden="true" />

              <div
                className={`absolute inset-y-0 right-4 hidden items-center gap-2 transition-opacity duration-200 lg:flex ${
                  loading ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
              >
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
                    stableNotifications.filter(
                      (n) => !deletedIds.includes(n.id),
                    ).length
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

              <div
                className={`absolute inset-y-0 right-4 flex items-center transition-opacity duration-200 lg:hidden ${
                  loading ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
              >
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
                    className="absolute right-0 top-full z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-blue-500 ring-opacity-5"
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
                          stableNotifications.filter(
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

      {/* Tabs navigation for notification categories */}
      <div className="mx-auto mb-6 mt-4 max-w-2xl px-4">
        <div className="hide-scrollbar flex overflow-x-auto whitespace-nowrap pb-2">
          <nav className="flex w-full space-x-2 rounded-xl border border-gray-100 bg-white p-1 shadow-sm sm:w-auto">
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
        {loading && stableNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Loading notifications…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500">{String(error)}</div>
        ) : unread.length === 0 && read.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<InboxIcon className="h-12 w-12" />}
              title="No Notifications Yet"
              message="We'll let you know when something important happens."
            />
          </div>
        ) : (
          <div className="mx-auto mt-6 max-w-2xl">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
              {unread.length > 0 && (
                <section>
                  <h2 className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold tracking-wide text-gray-900">
                    <span>New</span>
                    <span
                      aria-label={`${unread.length} new notifications`}
                      className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-yellow-500 px-2 py-0.5 text-[11px] font-bold text-white"
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
                  <h2 className="border-b border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold tracking-wide text-gray-900">
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
