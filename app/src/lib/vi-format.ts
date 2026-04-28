/**
 * Vietnamese formatting helpers — currency, dates, relative time.
 */
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function formatVND(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function formatPercent(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: vi });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "HH:mm — dd/MM/yyyy", { locale: vi });
}

export function formatRelative(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return formatDistanceToNow(new Date(d), { addSuffix: true, locale: vi });
}

export function initials(name: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(-2)
    .join("");
}

export function pluralizeVN(n: number, singular: string, plural?: string): string {
  // Vietnamese has no plural inflection — but allow override
  return `${formatNumber(n)} ${plural ?? singular}`;
}
