"use client";

import * as React from "react";
import { TabList, Tab } from "@astryxdesign/core/TabList";
import { cn } from "@/lib/utils";

/**
 * Dashboard reference zone (2026-07-16 compact redesign): positions / newest
 * CVs / today's interviews live behind tabs so the page above the fold is
 * ONLY what needs action (agent feed + inbox). Panels arrive server-rendered
 * as slots; this component just switches between them.
 */
export function DashboardTabs({
  positions,
  candidates,
  interviews,
  counts,
}: {
  positions: React.ReactNode;
  candidates: React.ReactNode;
  interviews: React.ReactNode;
  counts: { positions: number; candidates: number; interviews: number };
}) {
  const [tab, setTab] = React.useState("positions");
  return (
    <section aria-label="Thông tin tuyển dụng">
      <TabList value={tab} onChange={setTab} hasDivider size="md">
        <Tab
          value="positions"
          label="Vị trí đang tuyển"
          endContent={<CountChip n={counts.positions} />}
        />
        <Tab
          value="candidates"
          label="CV mới nhất"
          endContent={<CountChip n={counts.candidates} />}
        />
        <Tab
          value="interviews"
          label="PV hôm nay"
          endContent={<CountChip n={counts.interviews} highlight={counts.interviews > 0} />}
        />
      </TabList>
      <div className="pt-4">
        {tab === "positions" ? positions : tab === "candidates" ? candidates : interviews}
      </div>
    </section>
  );
}

function CountChip({ n, highlight }: { n: number; highlight?: boolean }) {
  return (
    <span
      className={cn(
        "ml-1.5 rounded-full px-1.5 py-0.5 text-2xs font-semibold tabular-nums",
        highlight ? "bg-accent-100 text-accent-700" : "bg-slate-100 text-slate-500",
      )}
    >
      {n}
    </span>
  );
}
