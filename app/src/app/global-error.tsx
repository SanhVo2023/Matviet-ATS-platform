"use client";

import { useEffect } from "react";

/**
 * Root error boundary (Next convention) — catches render errors the segment
 * error.tsx can't (e.g. in the root layout). Renovation R5: reports to the
 * console and, when a Sentry DSN is configured at build time, forwards the
 * error to Sentry's browser SDK if it's loaded (defensive — no hard SDK
 * dependency, so this never adds bundling risk to the Worker build).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
    const w = window as unknown as { Sentry?: { captureException?: (e: unknown) => void } };
    w.Sentry?.captureException?.(error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f5fa",
          color: "#11183a",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Đã xảy ra lỗi</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#667192" }}>
            Hệ thống gặp sự cố ngoài dự kiến. Vui lòng thử lại; nếu vẫn lỗi, liên hệ quản trị viên.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              borderRadius: 8,
              background: "#fbc312",
              color: "#0b1430",
              border: "none",
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
