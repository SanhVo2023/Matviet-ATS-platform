"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { selectTriggerClass, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ComboboxProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Allow clearing back to "" with an × on the trigger. */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** Diacritic-insensitive contains match ("nguyen" finds "Nguyễn"). */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Searchable single-select for long people/thing lists (employees, managers,
 * candidates). A plain Select is fine up to ~15 rows; past that, scrolling a
 * popup on a phone is misery — type three letters instead. Keyboard: ↑↓ move,
 * Enter picks, Esc closes. Rows are 40px on touch.
 */
export function Combobox({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Chọn…",
  searchPlaceholder = "Tìm…",
  emptyText = "Không có kết quả",
  clearable = false,
  disabled,
  className,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = React.useMemo(() => {
    const q = fold(query.trim());
    if (!q) return options;
    return options.filter((o) => fold(o.label).includes(q));
  }, [options, query]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);
  React.useEffect(() => {
    setActive(0);
  }, [query]);

  function pick(v: string) {
    onValueChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[active];
      if (o && !o.disabled) pick(o.value);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(selectTriggerClass, "font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-slate-400")}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected && !disabled ? (
              <span
                role="button"
                tabIndex={0}
                aria-label="Bỏ chọn"
                className="-mr-1 flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onValueChange("");
                  }
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 text-slate-500" aria-hidden />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            aria-activedescendant={
              filtered[active] ? `${listId}-${filtered[active].value}` : undefined
            }
            className="h-10 w-full bg-transparent text-base outline-none placeholder:text-slate-400 md:text-sm"
          />
        </div>
        <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-500">{emptyText}</li>
          ) : (
            filtered.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${listId}-${o.value}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    if (!o.disabled) pick(o.value);
                  }}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-base md:min-h-9 md:py-1.5 md:text-sm",
                    i === active && "bg-slate-100",
                    o.disabled && "pointer-events-none opacity-50",
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-brand-700",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{o.label}</span>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
