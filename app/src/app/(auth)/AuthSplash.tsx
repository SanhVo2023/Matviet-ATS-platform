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
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-950 via-brand-900 to-brand-800 px-4 py-10"
    >
      <div data-splash-logo className="mb-3">
        <Logo variant="on-dark" width={190} height={57} priority />
      </div>
      <div data-splash-rule className="mb-8 h-1 w-16 rounded-full bg-accent-400" aria-hidden />
      <div
        data-splash-card
        id="auth-card"
        className="w-full max-w-md rounded-lg bg-surface-raised p-8 shadow-xl"
      >
        {children}
      </div>
      <p className="mt-8 text-xs text-brand-300">Hệ thống tuyển dụng nội bộ — Mắt Việt</p>
    </div>
  );
}
