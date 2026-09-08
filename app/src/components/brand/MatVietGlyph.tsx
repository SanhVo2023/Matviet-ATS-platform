import { cn } from "@/lib/utils";

/**
 * Mắt Việt brand glyph — the gold eye with a white iris holding a gold heart
 * (traced from public/brand/MV1.png). Inline SVG so it's crisp at any size,
 * ~1 KB, and recolourable: the eye follows the gold token, the iris is white.
 * Decorative by default (aria-hidden); pass `title` to make it announced.
 */
export function MatVietGlyph({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-8 w-8", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {/* eye */}
      <path d="M4 50C28 16 72 16 96 50C72 84 28 84 4 50Z" className="fill-accent-400" />
      {/* iris */}
      <circle cx="50" cy="50" r="22" className="fill-white" />
      {/* glint cut at the rim */}
      <circle cx="64" cy="36" r="6.5" className="fill-accent-400" />
      {/* heart */}
      <path
        d="M50 63C50 63 35.5 53 35.5 45.5C35.5 40.5 39.5 37.5 43.5 39C46 40 48.5 43 50 44.5C51.5 43 54 40 56.5 39C60.5 37.5 64.5 40.5 64.5 45.5C64.5 53 50 63 50 63Z"
        className="fill-accent-400"
      />
    </svg>
  );
}
