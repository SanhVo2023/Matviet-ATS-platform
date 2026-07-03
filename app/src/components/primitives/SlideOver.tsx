"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Right-side slide-over panel for data-heavy forms (job CRUD, candidate detail,
 * email compose). Built on Radix Dialog so focus management, Esc-to-close,
 * and overlay click are correct out of the box.
 *
 * Usage:
 *   <SlideOver open={open} onOpenChange={setOpen} title="Tạo tin tuyển dụng" width="lg">
 *     <SlideOver.Body>...form sections...</SlideOver.Body>
 *     <SlideOver.Footer>...sticky save bar...</SlideOver.Footer>
 *   </SlideOver>
 */

type Width = "md" | "lg" | "xl";
const WIDTH_CLASS: Record<Width, string> = {
  md: "w-full max-w-md", // 448
  lg: "w-full max-w-xl", // 576
  xl: "w-full max-w-2xl", // 672 — used for the 9-section job form
};

interface SlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  width?: Width;
  children: React.ReactNode;
}

export function SlideOver({
  open,
  onOpenChange,
  title,
  description,
  width = "lg",
  children,
}: SlideOverProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-brand-950/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex flex-col border-l border-slate-200 bg-white shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            // Spring-feel entrance: overshoot cubic-bezier (design-language §4);
            // global prefers-reduced-motion CSS collapses these animations.
            "data-[state=open]:duration-500 data-[state=open]:[animation-timing-function:cubic-bezier(0.16,1.3,0.3,1)]",
            "data-[state=closed]:duration-200 data-[state=closed]:ease-in",
            WIDTH_CLASS[width],
          )}
        >
          {/* Sticky header — body scrolls beneath it */}
          <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-lg font-bold text-brand-900">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-sm text-slate-500">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

SlideOver.Body = function SlideOverBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-thin flex-1 overflow-y-auto overscroll-contain px-6 py-5",
        className,
      )}
    >
      {children}
    </div>
  );
};

SlideOver.Footer = function SlideOverFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
};
