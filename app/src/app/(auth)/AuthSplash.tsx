"use client";

/**
 * Auth splash entrance — the one GSAP moment in the app (design-language §4.4):
 * navy chrome, gold underline sweep, logo drop + card rise on load.
 * Skips entirely under prefers-reduced-motion.
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Logo } from "@/components/layout/Logo";

export function AuthSplash({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-splash-logo]", { y: -28, opacity: 0, duration: 0.6 })
        .from("[data-splash-rule]", { scaleX: 0, transformOrigin: "left", duration: 0.5 }, "-=0.25")
        .from("[data-splash-card]", { y: 24, opacity: 0, duration: 0.55 }, "-=0.2");
    }, scope);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={scope}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-brand-950 via-brand-900 to-brand-800 px-4 py-10"
    >
      {/* Brand texture (asset kit A6): faint concentric "lens" rings — the
          eye-care motif — behind the card, never competing with the form. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] text-accent-400 opacity-[0.07]"
        viewBox="0 0 400 400"
        fill="none"
      >
        {[60, 110, 160, 200].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} stroke="currentColor" strokeWidth="1.5" />
        ))}
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -left-52 h-[36rem] w-[36rem] text-white opacity-[0.04]"
        viewBox="0 0 400 400"
        fill="none"
      >
        {[80, 130, 180].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} stroke="currentColor" strokeWidth="1.5" />
        ))}
      </svg>
      <div data-splash-logo className="relative mb-3">
        <Logo variant="on-dark" width={190} height={57} priority />
      </div>
      <div
        data-splash-rule
        className="relative mb-8 h-1 w-16 rounded-full bg-accent-400"
        aria-hidden
      />
      <div
        data-splash-card
        id="auth-card"
        className="relative w-full max-w-md rounded-lg bg-white p-8 shadow-xl"
      >
        {children}
      </div>
      <p className="relative mt-8 text-xs text-brand-300">
        Hệ thống nhân sự & tuyển dụng nội bộ — Mắt Việt
      </p>
    </div>
  );
}
