import { cn } from "@/lib/utils";

/**
 * Empty-state illustration set (asset kit A4). Seven small two-tone scenes —
 * navy-tinted slate shapes with one gold accent — so every module's "nothing
 * here yet" reads as the same product, calm rather than clip-art. Inline SVG,
 * token classes only, `aria-hidden` (the EmptyState title carries meaning).
 */
export type IllustrationKind =
  | "people"
  | "calendar"
  | "inbox"
  | "documents"
  | "building"
  | "check"
  | "search";

const VB = "0 0 160 120";

function People() {
  return (
    <svg viewBox={VB} aria-hidden>
      <rect x="18" y="26" width="124" height="74" rx="12" className="fill-white stroke-slate-200" />
      {[46, 80, 114].map((cx, i) => (
        <g key={cx}>
          <circle
            cx={cx}
            cy="52"
            r="11"
            className={i === 1 ? "fill-accent-400" : "fill-slate-200"}
          />
          <path
            d={`M${cx - 18} 88c0-11 8-18 18-18s18 7 18 18`}
            className={i === 1 ? "fill-accent-100" : "fill-slate-100"}
          />
        </g>
      ))}
      <circle cx="132" cy="34" r="5" className="fill-accent-400" />
    </svg>
  );
}

function CalendarScene() {
  return (
    <svg viewBox={VB} aria-hidden>
      <rect x="30" y="22" width="100" height="84" rx="10" className="fill-white stroke-slate-200" />
      <rect x="30" y="22" width="100" height="22" rx="10" className="fill-slate-200" />
      <rect x="30" y="34" width="100" height="10" className="fill-slate-200" />
      {Array.from({ length: 12 }).map((_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 46 + col * 22;
        const y = 56 + row * 16;
        const hot = i === 6;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="12"
            height="10"
            rx="3"
            className={hot ? "fill-accent-400" : "fill-slate-100"}
          />
        );
      })}
      <circle cx="52" cy="17" r="4" className="fill-slate-300" />
      <circle cx="108" cy="17" r="4" className="fill-slate-300" />
    </svg>
  );
}

function Inbox() {
  return (
    <svg viewBox={VB} aria-hidden>
      <path
        d="M28 62l14-30h76l14 30v34a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8z"
        className="fill-white stroke-slate-200"
      />
      <path
        d="M28 62h34l6 12h24l6-12h34v34a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8z"
        className="fill-slate-100"
      />
      <rect x="58" y="18" width="44" height="30" rx="6" className="fill-white stroke-slate-200" />
      <rect x="66" y="27" width="28" height="3" rx="1.5" className="fill-slate-200" />
      <rect x="66" y="35" width="20" height="3" rx="1.5" className="fill-slate-200" />
      <path d="M124 14l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" className="fill-accent-400" />
    </svg>
  );
}

function Documents() {
  return (
    <svg viewBox={VB} aria-hidden>
      <rect
        x="56"
        y="30"
        width="62"
        height="78"
        rx="8"
        className="fill-slate-100 stroke-slate-200"
      />
      <rect x="44" y="18" width="62" height="78" rx="8" className="fill-white stroke-slate-200" />
      {[34, 44, 54, 64].map((y, i) => (
        <rect
          key={y}
          x="56"
          y={y}
          width={i === 3 ? 22 : 38}
          height="4"
          rx="2"
          className="fill-slate-200"
        />
      ))}
      <rect x="88" y="10" width="12" height="26" rx="6" className="fill-accent-400" />
      <rect x="91" y="13" width="6" height="20" rx="3" className="fill-white" />
    </svg>
  );
}

function Building() {
  return (
    <svg viewBox={VB} aria-hidden>
      <rect x="34" y="40" width="92" height="64" rx="6" className="fill-white stroke-slate-200" />
      <path d="M30 42l50-20 50 20v6H30z" className="fill-slate-200" />
      {[48, 72, 96].map((x) => (
        <rect key={x} x={x} y="56" width="14" height="12" rx="2" className="fill-slate-100" />
      ))}
      <rect x="70" y="78" width="20" height="26" rx="3" className="fill-accent-400" />
      <circle cx="86" cy="91" r="1.5" className="fill-white" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox={VB} aria-hidden>
      <circle cx="80" cy="60" r="34" className="fill-white stroke-slate-200" />
      <circle cx="80" cy="60" r="24" className="fill-success-bg" />
      <path
        d="M67 61l9 9 18-20"
        className="fill-none stroke-success-fg"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [28, 30],
        [134, 26],
        [24, 92],
        [140, 90],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 4} className="fill-accent-400" />
      ))}
    </svg>
  );
}

function Search() {
  return (
    <svg viewBox={VB} aria-hidden>
      <rect x="24" y="26" width="84" height="66" rx="10" className="fill-white stroke-slate-200" />
      <rect x="36" y="42" width="44" height="5" rx="2.5" className="fill-slate-200" />
      <rect x="36" y="56" width="32" height="5" rx="2.5" className="fill-slate-200" />
      <rect x="36" y="70" width="52" height="5" rx="2.5" className="fill-slate-100" />
      <circle cx="112" cy="70" r="18" className="fill-white stroke-brand-300" strokeWidth="5" />
      <path d="M125 83l14 14" className="stroke-brand-300" strokeWidth="6" strokeLinecap="round" />
      <circle cx="112" cy="70" r="7" className="fill-accent-400" />
    </svg>
  );
}

const SCENES: Record<IllustrationKind, () => React.ReactElement> = {
  people: People,
  calendar: CalendarScene,
  inbox: Inbox,
  documents: Documents,
  building: Building,
  check: Check,
  search: Search,
};

export function Illustration({ kind, className }: { kind: IllustrationKind; className?: string }) {
  const Scene = SCENES[kind];
  return (
    <div className={cn("h-28 w-40", className)}>
      <Scene />
    </div>
  );
}
