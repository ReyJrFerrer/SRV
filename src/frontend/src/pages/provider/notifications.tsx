import React, { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useProviderNotifications,
  ProviderNotification,
} from "../../hooks/useProviderNotificationsWithPush";
import BottomNavigation from "../../components/provider/NavigationBar";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import { EnvelopeOpenIcon, InboxIcon } from "@heroicons/react/24/solid";
import NotificationItem from "../../components/provider/NotificationItem";

const NotificationsPageSP = () => {
  const navigate = useNavigate();

  // Use the new provider notifications hook
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    deleteNotification,
    markAllAsRead,
  } = useProviderNotifications();

  // Set the document title
  useEffect(() => {
    document.title = "Notifications | SRV";
  }, []);

  // Local-only deleted ids (UI only for now). Backend delete will be wired later.
  const [deletedIds, setDeletedIds] = React.useState<string[]>([]);

  // Edit / selection mode
  const [editMode, setEditMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

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

  const clearSelection = () => setSelectedIds([]);

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
      } catch (e) {
        console.error("bulk delete failed for", id, e);
      }
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
    const filtered = notifications.filter((n) => !deletedIds.includes(n.id));
    return filtered.reduce<{
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
            className={`text-md font-extrabold tracking-tight text-black sm:text-xl lg:text-2xl ${
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
              <div className="flex items-center gap-2">
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
                    className="flex items-center whitespace-nowrap rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-200 hover:text-blue-900"
                  >
                    <EnvelopeOpenIcon className="mr-1.5 h-4 w-4" />
                    Mark all as read
                  </button>
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

      <main className="flex-1 px-2 pb-24 sm:px-4 md:px-8">
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
