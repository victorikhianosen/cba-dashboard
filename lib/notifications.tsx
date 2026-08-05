"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "react-toastify";
import {
  getNotificationsAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/actions/notification.action";
import { getEcho } from "@/lib/echo";
import { usePermissions } from "@/lib/permissions";

export type AppNotification = {
  id: string;
  type: string;
  data: {
    module: string;
    subject_id: number | string;
    title: string;
    body: string;
  };
  read_at: string | null;
  created_at: string;
};

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

// Mounted once inside ClientShell (nested under PermissionsProvider) so the whole
// authenticated session shares one WebSocket connection instead of reconnecting per page.
// The only REST call here is the one-time hydration on mount — every notification after
// that arrives live over the user's own private Reverb channel, never polled.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = usePermissions();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);

  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const result: any = await getNotificationsAction();
      if (result?.status === "success") {
        setNotifications(Array.isArray(result.data) ? result.data : []);
        setUnreadCount(result.meta?.unread_count ?? 0);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.id || hydrated.current) return;
    hydrated.current = true;

    hydrate();

    const echo = getEcho();
    const channel = echo.private(`App.Models.User.${currentUser.id}`);

    channel.notification((notification: AppNotification["data"] & { id?: string }) => {
      const incoming: AppNotification = {
        id: notification.id ?? crypto.randomUUID(),
        type: "App\\Notifications\\GenericAlertNotification",
        data: notification,
        read_at: null,
        created_at: new Date().toISOString(),
      };

      setNotifications((current) => [incoming, ...current]);
      setUnreadCount((count) => count + 1);
      toast.info(notification.title);
    });

    return () => {
      echo.leave(`App.Models.User.${currentUser.id}`);
      hydrated.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  async function markAsRead(id: string) {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    await markNotificationAsReadAction(id);
  }

  async function markAllAsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, read_at: new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsAsReadAction();
  }

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
