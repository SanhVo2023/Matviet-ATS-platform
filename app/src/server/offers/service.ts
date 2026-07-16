import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, jobs, stage_history } from "@/db/schema";
import { publicEnv } from "@/types/env";
import { notifyRoles } from "@/server/notifications/service";
import { emitAgentEventInBackground } from "@/server/agent-flows/events";

/**
 * Offer magic link (G12) — the candidate-facing accept/decline flow.
 *
 * Same opaque-token philosophy as assessment invites: a random 32-byte
 * base64url token stored on the candidates row (one active offer per
 * candidate). The link lands on the public /nhan-viec/[token] page.
 * Accept → stage 'hired'; decline → stage 'rejected'; both record
 * offer_response so reports can tell offer-declines from normal rejects.
 */

export const OFFER_TOKEN_TTL_DAYS = 7;

export interface OfferView {
  candidate_id: string;
  candidate_name: string;
  job_title: string;
  /** Already answered → the page shows the recorded outcome instead of buttons. */
  responded: "accepted" | "declined" | null;
  expired: boolean;
}

/**
 * Reuse the live token if the candidate hasn't answered yet; otherwise mint a
 * fresh one. Called from composeFromTemplate when the 'offer' template is
 * queued, so every offer email carries a working link automatically.
 */
export async function getOrCreateOfferToken(
  candidateId: string,
): Promise<{ token: string; url: string; expires_at: string }> {
  const db = await getDb();
  const row = await db
    .select({
      offer_token: candidates.offer_token,
      offer_token_expires_at: candidates.offer_token_expires_at,
      offer_response: candidates.offer_response,
    })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!row) throw new Error("Không tìm thấy ứng viên");

  const nowIso = new Date().toISOString();
  if (
    row.offer_token &&
    !row.offer_response &&
    row.offer_token_expires_at &&
    row.offer_token_expires_at > nowIso
  ) {
    return {
      token: row.offer_token,
      url: `${publicEnv.appUrl}/nhan-viec/${row.offer_token}`,
      expires_at: row.offer_token_expires_at,
    };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + OFFER_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db
    .update(candidates)
    .set({ offer_token: token, offer_token_expires_at: expiresAt })
    .where(eq(candidates.id, candidateId));
  return { token, url: `${publicEnv.appUrl}/nhan-viec/${token}`, expires_at: expiresAt };
}

/** Resolve a token for the public page. Null → unknown token (render 404-ish). */
export async function getOfferByToken(token: string): Promise<OfferView | null> {
  if (!token || token.length > 128) return null;
  const db = await getDb();
  const row = await db
    .select({
      id: candidates.id,
      full_name: candidates.full_name,
      offer_response: candidates.offer_response,
      offer_token_expires_at: candidates.offer_token_expires_at,
      job_title: jobs.title,
    })
    .from(candidates)
    .innerJoin(jobs, eq(jobs.id, candidates.job_id))
    .where(and(eq(candidates.offer_token, token), eq(candidates.is_archived, false)))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!row) return null;
  return {
    candidate_id: row.id,
    candidate_name: row.full_name,
    job_title: row.job_title,
    responded: row.offer_response,
    expired:
      !row.offer_response &&
      (!row.offer_token_expires_at || row.offer_token_expires_at <= new Date().toISOString()),
  };
}

export interface OfferDecisionInput {
  decision: "accepted" | "declined";
  /** Candidate-confirmed start date (accept only), yyyy-MM-dd. */
  expected_start_date?: string | null;
  note?: string | null;
}

/**
 * Record the candidate's decision. Idempotent: a second submit (double-click,
 * revisit) returns the already-recorded outcome without changing anything.
 */
export async function respondToOffer(
  token: string,
  input: OfferDecisionInput,
): Promise<{ ok: true; outcome: "accepted" | "declined" } | { ok: false; error: string }> {
  const offer = await getOfferByToken(token);
  if (!offer) return { ok: false, error: "Liên kết không hợp lệ" };
  if (offer.responded) return { ok: true, outcome: offer.responded };
  if (offer.expired)
    return { ok: false, error: "Liên kết đã hết hạn — vui lòng liên hệ Phòng Nhân sự Mắt Việt" };

  const db = await getDb();
  const nowIso = new Date().toISOString();
  const nextStage = input.decision === "accepted" ? ("hired" as const) : ("rejected" as const);
  const startDate =
    input.decision === "accepted" && input.expected_start_date?.match(/^\d{4}-\d{2}-\d{2}$/)
      ? input.expected_start_date
      : null;

  // Guarded on still-unanswered — protects against a double-submit race.
  const prev = await db
    .select({ current_stage: candidates.current_stage })
    .from(candidates)
    .where(eq(candidates.id, offer.candidate_id))
    .limit(1)
    .then((r) => r[0] ?? null);
  const updated = await db
    .update(candidates)
    .set({
      offer_response: input.decision,
      offer_responded_at: nowIso,
      offer_response_note: input.note?.trim().slice(0, 500) || null,
      expected_start_date: startDate,
      current_stage: nextStage,
    })
    .where(
      and(
        eq(candidates.offer_token, token),
        eq(candidates.is_archived, false),
        isNull(candidates.offer_response), // double-submit race guard
      ),
    )
    .returning({ id: candidates.id });
  // Lost the race → someone (this candidate, another tab) answered first.
  if (updated.length === 0) {
    const current = await getOfferByToken(token);
    if (current?.responded) return { ok: true, outcome: current.responded };
    return { ok: false, error: "Liên kết không hợp lệ" };
  }

  await db.insert(stage_history).values({
    candidate_id: offer.candidate_id,
    from_stage: prev?.current_stage ?? null,
    to_stage: nextStage,
    actor_user_id: null,
    notes:
      input.decision === "accepted" ? "Ứng viên nhận việc qua liên kết" : "Ứng viên từ chối offer",
  });

  // ADR 0020: terminal stage — the job agent stops watching this candidate
  // and open proposals get superseded.
  emitAgentEventInBackground({
    type: "offer_responded",
    candidateId: offer.candidate_id,
    accepted: input.decision === "accepted",
  });

  await notifyRoles(["hr", "admin"], {
    type: "offer_response",
    title:
      input.decision === "accepted"
        ? `🎉 ${offer.candidate_name} đã NHẬN việc`
        : `${offer.candidate_name} đã từ chối offer`,
    body:
      input.decision === "accepted"
        ? startDate
          ? `Vị trí ${offer.job_title} · Ngày bắt đầu mong muốn: ${startDate}`
          : `Vị trí ${offer.job_title}`
        : input.note?.trim()
          ? `Lý do: ${input.note.trim().slice(0, 140)}`
          : `Vị trí ${offer.job_title}`,
    link: `/ung-vien/${offer.candidate_id}`,
  });

  return { ok: true, outcome: input.decision };
}
