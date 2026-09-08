"use client";

/**
 * Trợ lý AI dock — floating gold button (bottom-right) opening a chat panel.
 * Admin/HR only (also enforced server-side at /api/agent). The agent DOES
 * things: search, move stages, schedule interviews, draft emails (drafts
 * always wait for human approval).
 *
 * The panel is a radix Dialog (R4 deferred item, now done): focus is trapped,
 * Esc + outside-tap close it, screen readers get a real dialog. Ctrl/Cmd+K
 * toggles it from anywhere except while typing in another field.
 */
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sparkles, X, SendHorizontal, Wrench } from "lucide-react";
import { MatVietGlyph } from "@/components/brand/MatVietGlyph";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/db";

// Markdown parser ships only when the chat actually renders a reply.
const AgentMarkdown = dynamic(() => import("./AgentMarkdown"), {
  ssr: false,
  loading: () => null,
});

type UserRole = Database["public"]["Enums"]["user_role"];

interface Msg {
  role: "user" | "assistant";
  content: string;
  actions?: Array<{ tool: string; summary: string }>;
}

/** Concrete, copy-pasteable asks — no "…" placeholders that read as broken. */
const SUGGESTIONS = [
  "Cần 2 nhân viên bán kính cho cửa hàng Quận 7, lương 8-12tr",
  "Tin tuyển dụng nào đang có ứng viên chờ tôi xử lý?",
  "So sánh 3 ứng viên điểm cao nhất của tin mới nhất trong một bảng",
  "Tìm trong kho CV ai biết tiếng Anh và có kinh nghiệm bán lẻ",
  "Nguồn CV nào hiệu quả nhất 90 ngày qua?",
];

function isTypingElsewhere(target: EventTarget | null, dock: HTMLElement | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (dock?.contains(target)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function AgentDock({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  // Command-bar promotion (ADR 0020): Ctrl+K / Cmd+K toggles the assistant
  // from anywhere — unless the user is typing in some other field (browsers
  // and editors own Ctrl+K there). Esc is handled by the dialog itself.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        if (isTypingElsewhere(e.target, panelRef.current)) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (role !== "admin" && role !== "hr") return null;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role: r, content: c }) => ({ role: r, content: c })),
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        actions?: Msg["actions"];
        error?: string;
      };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "Trợ lý gặp lỗi.");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply!, actions: data.actions },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trợ lý gặp lỗi, thử lại.");
      setMessages(next); // keep the user's message so retry is easy
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* Floating trigger — above the mobile bottom tab bar */}
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={open ? "Đóng Trợ lý AI" : "Mở Trợ lý AI"}
          className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent-400 text-brand-900 shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:bottom-6 lg:right-6"
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Sparkles className="h-5 w-5" aria-hidden />
          )}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-brand-900/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          ref={panelRef}
          aria-describedby={undefined}
          className="fixed bottom-[calc(8rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-[min(560px,calc(100dvh-12rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4 motion-reduce:animate-none lg:bottom-24 lg:right-6"
        >
          <header className="flex items-center gap-2.5 bg-brand-900 px-4 py-3 text-white">
            <MatVietGlyph className="h-7 w-7 shrink-0" />
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-sm font-bold">
                Trợ lý Mắt Việt HR
              </DialogPrimitive.Title>
              <p className="truncate text-2xs text-brand-300">
                Tạo vị trí bằng 1 câu · tìm ứng viên · đặt lịch · soạn email
              </p>
            </div>
            <kbd className="hidden rounded border border-brand-600 px-1.5 py-0.5 text-2xs text-brand-300 lg:block">
              Ctrl K
            </kbd>
            <DialogPrimitive.Close
              aria-label="Đóng"
              className="flex h-9 w-9 items-center justify-center rounded-md text-brand-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">
                  Tôi có thể làm việc trực tiếp trên hệ thống. Thử hỏi:
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="block min-h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "whitespace-pre-wrap rounded-br-sm bg-brand-700 text-white"
                      : "rounded-bl-sm bg-slate-100 text-slate-900",
                  )}
                >
                  {m.role === "assistant" ? <AgentMarkdown text={m.content} /> : m.content}
                  {m.actions && m.actions.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                      {m.actions.map((a, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs text-slate-500">
                          <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-accent-600" aria-hidden />
                          {a.summary}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {busy && <ThinkingIndicator />}
            {error && (
              <p role="alert" className="rounded-md bg-error-bg/50 px-3 py-2 text-xs text-error-fg">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn cho trợ lý…"
              aria-label="Nhắn cho trợ lý"
              disabled={busy}
              autoFocus
              className="h-10 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-base placeholder:text-slate-400 focus-visible:border-brand-500 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Gửi"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-400 text-brand-900 shadow-sm transition-colors hover:bg-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            >
              <SendHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Kimi is a reasoning model — 15-40s before the first token is normal.
 * Rotating status lines + an elapsed counter tell the user the assistant is
 * alive and working, not hung.
 */
function ThinkingIndicator() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  const phase =
    seconds < 6
      ? "Đang suy nghĩ…"
      : seconds < 15
        ? "Đang tra cứu dữ liệu tuyển dụng…"
        : seconds < 30
          ? "Đang soạn câu trả lời…"
          : "Câu hỏi khó — cần thêm chút thời gian…";
  return (
    <div
      className="flex w-fit items-center gap-2.5 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2"
      role="status"
    >
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-700/70"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="text-xs text-slate-500">{phase}</span>
      <span className="text-2xs tabular-nums text-slate-400">{seconds}s</span>
    </div>
  );
}
