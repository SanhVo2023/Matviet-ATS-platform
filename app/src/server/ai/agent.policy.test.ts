import { describe, expect, it } from "vitest";
import { TOOLS, TOOL_POLICY } from "./agent";

/**
 * Authority parity guard (Sanh, 2026-07-06: "the agent gets the authority of
 * the user, be strictly"). The executor fails closed — a tool without a
 * policy entry can never run — but this test catches the drift at build time
 * instead of as a mysteriously missing tool in production.
 */
describe("agent tool policy", () => {
  it("every tool has a policy entry", () => {
    const missing = TOOLS.map((t) => t.name).filter((n) => !TOOL_POLICY[n]);
    expect(missing).toEqual([]);
  });

  it("every policy entry corresponds to a real tool", () => {
    const toolNames = new Set(TOOLS.map((t) => t.name));
    const orphaned = Object.keys(TOOL_POLICY).filter((n) => !toolNames.has(n));
    expect(orphaned).toEqual([]);
  });

  it("every policy grants at least one role and never exceeds admin/hr today", () => {
    for (const [name, p] of Object.entries(TOOL_POLICY)) {
      expect(p.roles.length, name).toBeGreaterThan(0);
      for (const role of p.roles) {
        expect(["admin", "hr"], `${name} grants unexpected role ${role}`).toContain(role);
      }
    }
  });

  it("mutating tools requiring confirmation say so in their description", () => {
    // The confirmed=true contract is enforced server-side; the description
    // must teach the model to ask first, or it will burn a turn on the error.
    const CONFIRM_TOOLS = [
      "create_job",
      "update_job",
      "set_job_status",
      "cancel_interview",
      "move_candidate_stage",
    ];
    for (const name of CONFIRM_TOOLS) {
      const tool = TOOLS.find((t) => t.name === name);
      expect(tool, name).toBeTruthy();
      expect(tool!.description, `${name} description must mention xác nhận`).toMatch(
        /xác nhận|confirmed/i,
      );
      expect(TOOL_POLICY[name]!.mutates, `${name} must be flagged as mutating`).toBe(true);
    }
  });
});
