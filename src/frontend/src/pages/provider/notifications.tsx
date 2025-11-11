import React, { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useProviderNotifications,
  ProviderNotification,
} from "../../hooks/useProviderNotificationsWithPush";
import BottomNavigation from "../../components/provider/NavigationBar";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import {
  EnvelopeOpenIcon,
  InboxIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/solid";
import NotificationItem from "../../components/provider/NotificationItem";

const NotificationsPageSP = () => {
  const navigate = useNavigate();

  // Use the new provider notifications hook
  const {
    notifications,
    loading,
    error,
    markAsRead,
    deleteNotification,
    markAllAsRead,
  } = useProviderNotifications();
  // Track processed notification IDs to prevent flickering from re-renders
  const [stableNotifications, setStableNotifications] = React.useState<
    ProviderNotification[]
  >([]);

  // Set the document title
  useEffect(() => {
    document.title = "Notifications | SRV";
  }, []);

  // Stabilize notifications similar to client page to detect changes in read status, type, etc.
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

    if (changed || notifications.length === 0) {
      previousNotificationsRef.current = nextMap;
      setStableNotifications(notifications);
    }
  }, [notifications, loading]);

  // Local-only deleted ids (UI only for now). Backend delete will be wired later.
  const [deletedIds, setDeletedIds] = React.useState<string[]>([]);

  // Tabs for categorizing notifications
  type NotificationTab = "All" | "Bookings" | "Chat" | "Ratings" | "Admin";

  const TAB_ITEMS: NotificationTab[] = [
    "All",
    "Bookings",
    "Chat",
    "Ratings",
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

  // Helper to map notification type to a UI category
  const categoryOfType = (type: string) => {
    const bookingTypes = [
      "new_booking_request",
      "booking_confirmation",
      "booking_cancelled",
      "booking_rescheduled",
      "client_no_show",
      "service_completion_reminder",
      "service_reminder",
    ];
    const adminTypes = [
      "system_announcement",
      "admin_message",
      "admin_announcement",
      "platform_update",
    ];
    if (bookingTypes.includes(type)) return "Bookings";
    if (type === "chat_message") return "Chat";
    if (type === "review_request") return "Ratings";
    if (adminTypes.includes(type)) return "Admin";
    return "All";
  };

  const getCountForTab = (tab: NotificationTab) => {
    const visible = stableNotifications.filter(
      (n) => !deletedIds.includes(n.id),
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

  const bulkMarkAsRead = () => {
    selectedIds.forEach((id) => markAsRead(id));
    clearSelection();
    setEditMode(false);
  };

  const bulkDeleteSelected = () => {
    // Use the same delete function as the single-item delete (three-dot menu)
    // Call deleteNotification for each selected id and optimistically hide them
    selectedIds.forEach((id) => {
      try {
        deleteNotification(id);
      } catch (e) {}
    });
    setDeletedIds((prev) => Array.from(new Set([...prev, ...selectedIds])));
    clearSelection();
    setEditMode(false);
  };

  const handleNotificationClick = (notification: ProviderNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Only navigate if href exists (null href means non-clickable)
    if (!notification.href) {
      return;
    }

    // Navigate based on notification type
    switch (notification.type) {
      case "new_booking_request":
      case "booking_confirmation":
      case "service_completion_reminder":
      case "review_request":
      case "booking_cancelled":
      case "booking_rescheduled":
      case "payment_completed":
      case "client_no_show":
      case "payment_issue":
        navigate(notification.href);
        break;
      case "chat_message":
        navigate(notification.href);
        break;
      default:
        navigate(notification.href);
        break;
    }
  };

  const { unread, read } = useMemo(() => {
    // First filter out locally deleted items
    const visible = stableNotifications
      .filter((n) => !deletedIds.includes(n.id))
      // Hide chat messages and new booking requests from the Notifications page
      .filter((n) => n.type !== "chat_message" && n.type !== "new_booking_request");

    // Then filter by active tab (category) if not 'All'
    const byTab =
      activeTab === "All"
        ? visible
        : visible.filter((n) => categoryOfType(n.type) === activeTab);

    return byTab.reduce<{
      unread: ProviderNotification[];
      read: ProviderNotification[];
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 pb-20">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative flex min-h-[57px] w-full items-center justify-center px-4 py-3">
          <h1 className="absolute text-center text-xl font-extrabold tracking-tight text-black lg:text-2xl">
            Notifications
          </h1>
          {stableNotifications.length > 0 && (
            <div className="ml-auto flex items-center">
              <div className="hidden sm:block" aria-hidden="true" />

              <div
                className={`hidden items-center gap-2 transition-opacity duration-200 lg:flex ${
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
                className={`relative transition-opacity duration-200 lg:hidden ${
                  loading ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
              >
                <button
                  ref={mobileMenuButtonRef}
                  onClick={() => setMobileMenuOpen((s) => !s)}
                  className="rounded-full p-2 text-black hover:bg-gray-100"
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
            </div>
          )}
        </div>
      </header>

      {/* Tabs navigation for notification categories */}
      <div className="sticky top-[57px] z-10 mb-5 border-b border-gray-200 bg-white">
        <div className="hide-scrollbar flex justify-start overflow-x-auto whitespace-nowrap p-2 sm:justify-center">
          <nav className="flex space-x-4 overflow-x-auto px-4 py-3">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold sm:text-sm ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-600 hover:bg-yellow-200"
                }`}
              >
                {tab} ({getCountForTab(tab)})
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

      <div className="fixed bottom-0 left-0 z-30 w-full">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default NotificationsPageSP;
