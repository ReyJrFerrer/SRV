import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";

type Props = {
  id: string;
  onDelete: (e: React.MouseEvent) => void;
  onMarkAsRead: (e: React.MouseEvent) => void;
  isRead: boolean;
};

const NotificationMenu: React.FC<Props> = ({
  id,
  onDelete,
  onMarkAsRead,
  isRead,
}) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  useEffect(() => {
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

export default NotificationMenu;
