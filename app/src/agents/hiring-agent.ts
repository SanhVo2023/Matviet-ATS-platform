import { Agent } from "agents";

/**
 * HiringAgent — one Durable Object per job opening (ADR 0020).
 *
 * Deliberately DUMB: it keeps per-candidate follow-up timers and nothing else.
 * All business logic (what counts as stale, what to propose, AI calls, D1
 * writes) lives in the Next.js server context, reached through the SELF
 * service binding — the same Bearer-CRON_SECRET in-process pattern the cron
 * drains use. D1 is the single system of record; this DO's state is
 * disposable and re-armed by the next event.
 *
 * Instance name = job id (`getAgentByName(env.HIRING_AGENT, jobId)`).
 * Callers (emitters in Next ctx) decide WHETHER and WHEN a candidate needs a
 * follow-up check — the agent only remembers and fires.
 *
 * ⚠️ No imports from `@/...` here: this file is bundled by wrangler via
 * custom-worker.ts, outside the Next.js build.
 */

type WatchEntry = {
  stage: string;
  /** ISO timestamp of the event that armed this watch. */
  eventAt: string;
  /** Pending stale-check timer for this candidate (cancel target). */
  scheduleId?: string;
};

type HiringState = {
  watch: Record<string, WatchEntry>;
};

type HiringEvent = {
  candidateId: string;
  stage: string;
  /**
   * Seconds until the stale check should fire, or null to stop watching
   * (candidate reached a terminal/closed stage). Chosen by the caller —
   * stage semantics stay out of the DO.
   */
  checkAfterSeconds: number | null;
};

export class HiringAgent extends Agent<CloudflareEnv, HiringState> {
  initialState: HiringState = { watch: {} };

  /**
   * `this.env` is provided at runtime by the DurableObject base class, but
   * the project's tsconfig can't load workers-types' `cloudflare:workers`
   * module declaration (its global entrypoint conflicts with `lib: ["dom"]`
   * in a Next.js app), so the inherited member is invisible to tsc.
   */
  private get bindings(): CloudflareEnv {
    return (this as unknown as { env: CloudflareEnv }).env;
  }

  /**
   * Internal HTTP surface for the Next side of the app (agent-link.ts calls
   * the raw DO stub's fetch — importing the `agents` package from Next code
   * is impossible because webpack can't bundle `cloudflare:*` scheme imports).
   * Reachable ONLY via env.HIRING_AGENT stubs — the public worker fetch never
   * routes here.
   */
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname.endsWith("/event")) {
      const e = (await request.json()) as HiringEvent;
      if (!e || typeof e.candidateId !== "string") {
        return Response.json({ error: "bad event" }, { status: 400 });
      }
      await this.onEvent(e);
      return Response.json({ ok: true });
    }
    if (request.method === "GET" && url.pathname.endsWith("/snapshot")) {
      return Response.json(await this.snapshot());
    }
    return Response.json({ error: "not found" }, { status: 404 });
  }

  /** Debug/ops introspection (used by /api/agent/ping GET). */
  async snapshot(): Promise<{
    watch: Record<string, WatchEntry>;
    schedules: Array<{ id: string; time: number; payload: unknown }>;
  }> {
    return {
      watch: this.state.watch,
      schedules: this.getSchedules().map((s) => ({
        id: s.id,
        time: s.time,
        payload: s.payload,
      })),
    };
  }

  /** Called from Next ctx on every pipeline event for this job. */
  async onEvent(e: HiringEvent): Promise<void> {
    // One pending check per candidate: cancel the previous timer directly
    // (its id lives in the watch entry — no full getSchedules() scan).
    const prev = this.state.watch[e.candidateId]?.scheduleId;
    if (prev) await this.cancelSchedule(prev).catch(() => {});

    const watch = { ...this.state.watch };
    if (e.checkAfterSeconds == null) {
      delete watch[e.candidateId];
      this.setState({ watch });
      return;
    }
    const scheduled = await this.schedule(e.checkAfterSeconds, "checkStale", {
      candidateId: e.candidateId,
    });
    watch[e.candidateId] = {
      stage: e.stage,
      eventAt: new Date().toISOString(),
      scheduleId: scheduled.id,
    };
    this.setState({ watch });
  }

  /**
   * Timer fired — ask the app (Next ctx) to evaluate the candidate against
   * live D1 data. The sweep decides whether anything is actually stale and
   * whether to create a proposal; a no-op response is normal.
   */
  async checkStale(payload: { candidateId: string }): Promise<void> {
    const env = this.bindings;
    const base = env.NEXT_PUBLIC_APP_URL || "https://hr.matviet.com.vn";
    const url = new URL("/api/agent/sweep", base);
    url.searchParams.set("job", this.name);
    url.searchParams.set("candidate", payload.candidateId);
    try {
      const res = await env.SELF.fetch(url.toString(), {
        headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
      });
      if (res.status !== 200) {
        console.error(`[HiringAgent ${this.name}] sweep -> ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      console.error(`[HiringAgent ${this.name}] sweep failed:`, err);
    }
  }
}
