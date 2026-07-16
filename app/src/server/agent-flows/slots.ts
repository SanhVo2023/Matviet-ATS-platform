import "server-only";
import { graphPost } from "@/lib/graph/client";

/**
 * Interview slot proposals (ADR 0020) — 3 candidate slots inside Vietnamese
 * business hours, checked against the interviewers' Outlook calendars via
 * Graph getSchedule when configured. Graph being down/unconfigured never
 * blocks a proposal: we fall back to the same business-hour grid unchecked
 * (the card says the calendar wasn't verified).
 */

export interface SlotOption {
  /** ISO UTC start. */
  start: string;
  /** Whether every interviewer's calendar showed free at proposal time. */
  calendar_checked: boolean;
}

const VN_UTC_OFFSET_H = 7;
/** Candidate local start times (VN) tried per business day, in preference order. */
const DAY_GRID_VN_HOURS: Array<{ h: number; m: number }> = [
  { h: 9, m: 30 },
  { h: 14, m: 0 },
  { h: 16, m: 0 },
];

/** Next N business days (Mon–Sat — retail chain works Saturdays), starting tomorrow. */
function businessDayGrid(days: number, durationMin: number): Array<{ start: Date; end: Date }> {
  const out: Array<{ start: Date; end: Date }> = [];
  const now = new Date();
  const cursor = new Date(now);
  while (out.length < days * DAY_GRID_VN_HOURS.length) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    // VN weekday of cursor date
    const vn = new Date(cursor.getTime() + VN_UTC_OFFSET_H * 3600_000);
    const weekday = vn.getUTCDay(); // 0=Sun
    if (weekday === 0) continue;
    for (const { h, m } of DAY_GRID_VN_HOURS) {
      const start = new Date(
        Date.UTC(
          vn.getUTCFullYear(),
          vn.getUTCMonth(),
          vn.getUTCDate(),
          h - VN_UTC_OFFSET_H,
          m,
          0,
          0,
        ),
      );
      if (start.getTime() <= now.getTime()) continue;
      out.push({ start, end: new Date(start.getTime() + durationMin * 60_000) });
    }
  }
  return out;
}

interface GetScheduleResponse {
  value?: Array<{
    scheduleId?: string;
    scheduleItems?: Array<{
      status?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    }>;
  }>;
}

/** True when [start,end) overlaps any busy block of any interviewer. */
function overlapsBusy(
  start: Date,
  end: Date,
  busy: Array<{ start: number; end: number }>,
): boolean {
  return busy.some((b) => start.getTime() < b.end && end.getTime() > b.start);
}

export async function proposeInterviewSlots(args: {
  interviewerEmails: string[];
  durationMin: number;
  count?: number;
}): Promise<SlotOption[]> {
  const count = args.count ?? 3;
  const grid = businessDayGrid(4, args.durationMin);

  if (args.interviewerEmails.length > 0) {
    try {
      const windowStart = grid[0]!.start;
      const windowEnd = grid[grid.length - 1]!.end;
      const res = await graphPost(
        `/users/${encodeURIComponent(args.interviewerEmails[0]!)}/calendar/getSchedule`,
        {
          schedules: args.interviewerEmails,
          startTime: { dateTime: windowStart.toISOString(), timeZone: "UTC" },
          endTime: { dateTime: windowEnd.toISOString(), timeZone: "UTC" },
          availabilityViewInterval: 30,
        },
      );
      const data = (await res.json()) as GetScheduleResponse;
      const busy: Array<{ start: number; end: number }> = [];
      for (const sched of data.value ?? []) {
        for (const item of sched.scheduleItems ?? []) {
          if (item.status === "free" || !item.start?.dateTime || !item.end?.dateTime) continue;
          // Graph returns naive datetimes in the requested timeZone (UTC here).
          busy.push({
            start: Date.parse(`${item.start.dateTime}Z`),
            end: Date.parse(`${item.end.dateTime}Z`),
          });
        }
      }
      const free = grid.filter((s) => !overlapsBusy(s.start, s.end, busy)).slice(0, count);
      if (free.length > 0) {
        return free.map((s) => ({ start: s.start.toISOString(), calendar_checked: true }));
      }
    } catch (err) {
      console.warn("[agent-flows] free/busy unavailable, falling back:", err);
    }
  }

  return grid
    .slice(0, count)
    .map((s) => ({ start: s.start.toISOString(), calendar_checked: false }));
}
