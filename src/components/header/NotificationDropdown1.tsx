"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { apiGet, apiPatch, apiPost } from "@/utils/api";
import { Dropdown } from "../ui/dropdown/Dropdown";

interface AdminNotification {
  id: number;
  notification_type?: string;
  type?: string;
  title?: string;
  message?: string;
  body?: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

interface NotificationsResponse {
  count?: number;
  unread_count?: number;
  results?: AdminNotification[];
}

const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
};

const getNotificationMeta = (type: string) => {
  switch (type) {
    case "admin_kyc_submitted":
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        ),
        color: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
        href: "/unverified-users",
        label: "KYC",
      };
    case "admin_product_pending":
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        ),
        color: "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
        href: "/products",
        label: "Product",
      };
    case "admin_ticket_created":
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
        ),
        color: "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
        href: "/support-tickets",
        label: "Ticket",
      };
    case "admin_subscription_expiring":
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        ),
        color: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
        href: "/subscriptions",
        label: "Subscription",
      };
    default:
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        ),
        color: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400",
        href: "/",
        label: "Alert",
      };
  }
};

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/notifications/admin/");
      const d: NotificationsResponse = res.data?.data ?? res.data;
      const list: AdminNotification[] = Array.isArray(d)
        ? d
        : (d?.results ?? []);
      setNotifications(list);
      setUnreadCount(
        d?.unread_count ?? list.filter((n) => !n.is_read).length
      );
    } catch {
      // silently fail — header must not break
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchNotifications();
    }
    // Poll every 60 s for new notifications
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await apiPatch(`/notifications/admin/${id}/read/`, {});
    } catch {
      // revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
      setUnreadCount((c) => c + 1);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await apiPost("/notifications/admin/read-all/", {});
    } catch {
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (n: AdminNotification) => {
    const type = n.notification_type ?? n.type ?? "";
    const { href } = getNotificationMeta(type);
    if (!n.is_read) await markRead(n.id);
    setIsOpen(false);
    router.push(href);
  };

  return (
    <div className="relative">
      <button
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Notifications"
      >
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 mt-3 flex h-[480px] w-[360px] flex-col rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Notifications
            </h5>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {loading && notifications.length === 0 ? (
            <li className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </li>
          ) : notifications.length === 0 ? (
            <li className="flex h-32 items-center justify-center text-sm text-gray-400">
              No notifications
            </li>
          ) : (
            notifications.map((n) => {
              const type = n.notification_type ?? n.type ?? "";
              const meta = getNotificationMeta(type);
              const title = n.title ?? meta.label;
              const body = n.message ?? n.body ?? "";
              return (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                      !n.is_read ? "bg-blue-50/40 dark:bg-blue-500/5" : ""
                    }`}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                      {meta.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`text-sm font-medium ${!n.is_read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                          {title}
                        </span>
                        {!n.is_read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </span>
                      {body && (
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {body}
                        </span>
                      )}
                      <span className="mt-1 block text-xs text-gray-400">
                        {getTimeAgo(n.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <button
            onClick={() => { setIsOpen(false); fetchNotifications(); }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </Dropdown>
    </div>
  );
}
