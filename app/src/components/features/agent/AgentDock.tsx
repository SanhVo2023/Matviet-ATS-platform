"use client";

/**
 * Trợ lý AI dock — floating gold button (bottom-right) opening a chat panel.
 * Admin/HR only (also enforced server-side at /api/agent). The agent DOES
 * things: search, move stages, schedule interviews, draft emails (drafts
 * always wait for human approval).
 */
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, X, SendHorizontal, Wrench } from "lucide-react";
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

const SUGGESTIONS = [
  "Tổng quan tuyển dụng của tin … đang thế nào?",
  "So sánh 3 ứng viên điểm cao nhất trong một bảng",
  "Tìm trong kho CV ai biết tiếng Anh",
  "Tạo vị trí Nhân viên bán kính tại …",
  "Có ứng viên cũ nào phù hợp tin … không?",
  "Nguồn CV nào hiệu quả nhất 90 ngày qua?",
];

export function AgentDock({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

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
    <>
      {/* Floating trigger — above the mobile bottom tab bar */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Đóng Trợ lý AI" : "Mở Trợ lý AI"}
        className="h-13 w-13 fixed bottom-20 right-4 z-40 flex items-center justify-center rounded-full bg-accent-400 p-3.5 text-brand-900 shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:bottom-6 lg:right-6"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden />
        ) : (
          <Sparkles className="h-5 w-5" aria-hidden />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Trợ lý AI Mắt Việt"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-36 right-4 z-40 flex h-[min(560px,calc(100dvh-11rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl lg:bottom-24 lg:right-6"
          >
            <header className="flex items-center gap-2 bg-brand-900 px-4 py-3 text-white">
              <Sparkles className="h-4 w-4 text-accent-400" aria-hidden />
              <div className="flex-1">
                <p className="text-sm font-bold">Trợ lý Mắt Việt HR</p>
                <p className="text-[11px] text-brand-300">
                  Tìm ứng viên · đặt lịch · soạn email (chờ duyệt)
                </p>
              </div>
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
                      className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:border-brand-300 hover:bg-brand-50"
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
                            <Wrench
                              className="mt-0.5 h-3 w-3 shrink-0 text-accent-600"
                              aria-hidden
                            />
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
                <p
                  role="alert"
                  className="rounded-md bg-error-bg/50 px-3 py-2 text-xs text-error-fg"
                >
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
                className="h-10 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Gửi"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-400 text-brand-900 shadow-sm transition-colors hover:bg-accent-300 disabled:opacity-40"
              >
                <SendHorizontal className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
    <div className="flex w-fit items-center gap-2.5 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2">
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
      <span className="text-[10px] tabular-nums text-slate-400">{seconds}s</span>
    </div>
  );
}
