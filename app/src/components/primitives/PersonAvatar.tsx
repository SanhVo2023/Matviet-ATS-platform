import { cn } from "@/lib/utils";

/**
 * PersonAvatar — one avatar for candidates, employees, interviewers and
 * account menus (asset kit A7). Deterministic tint from the name so the same
 * person looks the same on every screen; initials follow Vietnamese reading
 * order (family + given: "Nguyễn Văn An" → "NA"). Optional photo.
 */

const TINTS = [
  "bg-brand-50 text-brand-700",
  "bg-accent-100 text-accent-700",
  "bg-success-bg text-success-fg",
  "bg-info-bg text-info-fg",
  "bg-warning-bg text-warning-fg",
  "bg-slate-200 text-slate-700",
] as const;

const SIZES = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-lg",
} as const;

export type AvatarSize = keyof typeof SIZES;

/** Family-name initial + given-name initial; single word → first two letters. */
export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function tintFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

export function PersonAvatar({
  name,
  size = "md",
  photoUrl,
  ring,
  className,
}: {
  name: string;
  size?: AvatarSize;
  photoUrl?: string | null;
  /** Gold ring — used on the profile header to mark the subject of the page. */
  ring?: boolean;
  className?: string;
}) {
  const base = cn(
    "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold leading-none",
    SIZES[size],
    ring && "ring-2 ring-accent-400 ring-offset-2 ring-offset-white",
    className,
  );
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" className={cn(base, "object-cover")} />
    );
  }
  return (
    <span className={cn(base, tintFor(name))} aria-hidden>
      {personInitials(name)}
    </span>
  );
}
