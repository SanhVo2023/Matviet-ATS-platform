"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatRelative } from "@/lib/vi-format";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const POLL_MS = 60_000;

/** applicationServerKey wants raw bytes, the API hands out base64url. */
function urlBase64ToUint8Array(base64url: string): Uint8Array {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const raw = atob(b64 + pad);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Notification bell — unread badge, dropdown list, mark-read, and the browser
 * push opt-in toggle. Polls /api/notifications every minute plus on tab
 * refocus; Web Push covers the closed-tab case. Lives in the SideNav footer
 * (navy rail) since the TopBar was removed — `expanded` mirrors the rail's
 * hover state so the label collapses with it.
 */
export function NotificationBell({ expanded = true }: { expanded?: boolean }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pushKey, setPushKey] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const openRef = useRef(false);

  const pushSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        unread: number;
        items: NotificationItem[];
        pushKey: string | null;
      };
      setUnread(data.unread);
      setItems(data.items);
      setPushKey(data.pushKey);
    } catch {
      // offline — keep last state
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Reflect whether THIS browser already has a push subscription
  useEffect(() => {
    if (!pushSupported) return;
    void navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setPushOn(!!sub))
      .catch(() => {});
  }, [pushSupported]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    try {
      await fetch("/api/notifications/read", { method: "POST", body: "{}" });
    } catch {
      /* next poll re-syncs */
    }
  }, []);

  const openItem = useCallback(
    async (item: NotificationItem) => {
      if (!item.read_at) {
        setUnread((u) => Math.max(0, u - 1));
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)),
        );
        void fetch("/api/notifications/read", {
          method: "POST",
          body: JSON.stringify({ ids: [item.id] }),
        }).catch(() => {});
      }
      if (item.link) router.push(item.link);
    },
    [router],
  );

  const enablePush = useCallback(async () => {
    if (!pushKey || !pushSupported) return;
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Trình duyệt đã chặn thông báo — hãy cho phép trong cài đặt trang web");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushKey) as BufferSource,
        }));
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error(`subscribe ${res.status}`);
      setPushOn(true);
      toast.success("Đã bật thông báo đẩy trên thiết bị này");
    } catch (err) {
      console.error("[push] enable failed:", err);
      toast.error("Không bật được thông báo đẩy");
    } finally {
      setPushBusy(false);
    }
  }, [pushKey, pushSupported]);

  const disablePush = useCallback(async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setPushOn(false);
      toast.success("Đã tắt thông báo đẩy trên thiết bị này");
    } catch (err) {
      console.error("[push] disable failed:", err);
    } finally {
      setPushBusy(false);
    }
  }, []);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        openRef.current = open;
        if (open) void refresh();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Thông báo"
          title={expanded ? undefined : "Thông báo"}
          className={
            expanded
              ? "flex w-full items-center gap-3 rounded-md p-1.5 text-left text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
              : "flex h-10 w-10 items-center justify-center rounded-md text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
          }
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <Bell className="h-5 w-5" aria-hidden />
            {unread > 0 && (
              <span
                className="absolute -top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
                aria-label={`${unread} thông báo chưa đọc`}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
          {expanded && <span className="truncate text-sm font-medium">Thông báo</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" className="w-96 max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-brand-900">
            Thông báo
          </DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Đọc tất cả
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">Chưa có thông báo nào</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void openItem(n)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-slate-50",
                  !n.read_at && "bg-primary-50/60",
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm leading-snug text-slate-800",
                      !n.read_at && "font-semibold text-brand-900",
                    )}
                  >
                    {n.title}
                  </span>
                  {!n.read_at && (
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500"
                      aria-hidden
                    />
                  )}
                </span>
                {n.body && <span className="text-xs leading-snug text-slate-500">{n.body}</span>}
                <span className="text-[11px] text-slate-400">{formatRelative(n.created_at)}</span>
              </button>
            ))
          )}
        </div>
        {pushSupported && pushKey && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => void (pushOn ? disablePush() : enablePush())}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {pushBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : pushOn ? (
                <BellOff className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <BellRing className="h-3.5 w-3.5 text-primary-600" aria-hidden />
              )}
              {pushOn
                ? "Tắt thông báo đẩy trên thiết bị này"
                : "Bật thông báo đẩy trên thiết bị này"}
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
