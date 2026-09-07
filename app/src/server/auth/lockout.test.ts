import { describe, expect, it } from "vitest";
import { computeNextOnFailure, lockRemainingMs, type AttemptRow } from "./lockout";

const T0 = Date.parse("2026-09-07T03:00:00.000Z");
const MIN = 60_000;

/** Run n consecutive failures spaced `gapMs` apart, starting at T0. */
function fails(n: number, gapMs = 1_000, start = T0): { row: AttemptRow; at: number } {
  let row: AttemptRow | null = null;
  let at = start;
  for (let i = 0; i < n; i++) {
    at = start + i * gapMs;
    row = computeNextOnFailure(row, at);
  }
  return { row: row!, at };
}

describe("computeNextOnFailure", () => {
  it("counts failures inside the window without locking below the threshold", () => {
    const { row } = fails(4);
    expect(row.fail_count).toBe(4);
    expect(row.locked_until).toBeNull();
  });

  it("locks for 15 minutes on the 5th failure", () => {
    const { row, at } = fails(5);
    expect(row.fail_count).toBe(5);
    expect(row.locked_until).not.toBeNull();
    expect(Date.parse(row.locked_until!) - at).toBe(15 * MIN);
  });

  it("resets the count when the previous failure is outside the 15-minute window", () => {
    const first = computeNextOnFailure(null, T0);
    const later = computeNextOnFailure(first, T0 + 16 * MIN);
    expect(later.fail_count).toBe(1);
    expect(later.locked_until).toBeNull();
  });

  it("doubles the lock on subsequent locks (15m -> 30m), capped at 2h", () => {
    // 5 fails -> 15m lock; failure shortly after lock expiry keeps the streak.
    const { row: lock1, at } = fails(5);
    const lock1End = Date.parse(lock1.locked_until!);
    let row = lock1;
    let now = lock1End + 1_000;
    for (let i = 0; i < 5; i++) {
      row = computeNextOnFailure(row, now);
      now += 1_000;
    }
    expect(row.fail_count).toBe(10);
    expect(Date.parse(row.locked_until!) - (now - 1_000)).toBe(30 * MIN);
    expect(at).toBeLessThan(now);

    // Cap: a hypothetical 40th failure would want 2^7*15m — clamp to 2h.
    const capped = computeNextOnFailure({ ...row, fail_count: 39 }, now);
    expect(Date.parse(capped.locked_until!) - now).toBe(2 * 60 * MIN);
  });

  it("anchors the window on lock expiry so post-lock failures escalate", () => {
    const { row: locked } = fails(5);
    const lockEnd = Date.parse(locked.locked_until!);
    // 14 minutes AFTER the lock ends (29m after last_fail_at) is still in-window.
    const next = computeNextOnFailure(locked, lockEnd + 14 * MIN);
    expect(next.fail_count).toBe(6);
  });
});

describe("lockRemainingMs", () => {
  it("returns 0 for no row / no lock / expired lock", () => {
    expect(lockRemainingMs(null, T0)).toBe(0);
    expect(lockRemainingMs({ fail_count: 2, last_fail_at: null, locked_until: null }, T0)).toBe(0);
    expect(
      lockRemainingMs(
        { fail_count: 5, last_fail_at: null, locked_until: new Date(T0 - 1).toISOString() },
        T0,
      ),
    ).toBe(0);
  });

  it("returns the remaining time for an active lock", () => {
    const until = new Date(T0 + 7 * MIN).toISOString();
    expect(lockRemainingMs({ fail_count: 5, last_fail_at: null, locked_until: until }, T0)).toBe(
      7 * MIN,
    );
  });
});
