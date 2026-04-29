import Image from "next/image";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

/**
 * Brand logo lockup. Picks the right MV*.png variant based on the surface.
 * See app/public/brand/README.md for the canonical use-case mapping.
 *
 * Variants:
 *   primary       — yellow eye + navy wordmark; for white/light backgrounds (default)
 *   on-dark       — white eye + yellow wordmark; for navy backgrounds (sidebar header)
 *   on-yellow     — white eye + navy wordmark; for yellow accent backgrounds
 *   mono-yellow   — yellow eye + yellow wordmark; for accent placements
 *   wordmark-navy — text-only navy wordmark
 *   wordmark-yellow — text-only yellow wordmark
 */
export type LogoVariant =
  | "primary"
  | "on-dark"
  | "on-yellow"
  | "mono-yellow"
  | "wordmark-navy"
  | "wordmark-yellow";

const VARIANT_TO_FILE: Record<LogoVariant, string> = {
  primary: "/brand/MV2.png",
  "on-dark": "/brand/MV6.png",
  "on-yellow": "/brand/MV4.png",
  "mono-yellow": "/brand/MV1.png",
  "wordmark-navy": "/brand/MV3.png",
  "wordmark-yellow": "/brand/MV5.png",
};

interface LogoProps {
  variant?: LogoVariant;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({
  variant = "primary",
  width = 160,
  height = 48,
  className,
  priority = false,
}: LogoProps) {
  return (
    <Image
      src={VARIANT_TO_FILE[variant]}
      alt={`${t.app.name} — ${t.app.description}`}
      width={width}
      height={height}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}
