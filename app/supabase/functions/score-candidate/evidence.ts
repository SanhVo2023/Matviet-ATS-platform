// Mirror of app/src/server/scoring/evidence.ts (Deno-compatible).

import Fuse from "fuse.js";
import {
  CRITERION_CODES,
  type ParsedCv,
  type ScoreResult,
  type VerifiedCriteria,
} from "./types.ts";

const FUSE_THRESHOLD = 0.3;
const VERIFY_SCORE_BAR = 0.05;
const SENTENCE_SPLIT_RE = /(?<=[.!?…\n])\s+/u;

function norm(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

function splitSentences(rawText: string): string[] {
  return rawText
    .split(SENTENCE_SPLIT_RE)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

export function validateEvidence(scored: ScoreResult, cvRawText: string): VerifiedCriteria {
  const sentences = splitSentences(cvRawText);
  const haystack = norm(cvRawText);
  const fuse = new Fuse(sentences, {
    includeScore: true,
    threshold: FUSE_THRESHOLD,
    ignoreLocation: true,
    getFn: (obj) => norm(String(obj)),
  });

  const result: Partial<VerifiedCriteria> = {};
  for (const k of CRITERION_CODES) {
    const c = scored.per_criterion[k];
    const verifiedQuotes = (c.evidence_quotes ?? []).map((q) => {
      const nq = norm(q);
      if (nq.length === 0) return { text: q, verified: false };
      if (haystack.includes(nq)) return { text: q, verified: true };
      const hits = fuse.search(nq);
      if (hits.length > 0 && hits[0]!.score !== undefined && hits[0]!.score < VERIFY_SCORE_BAR) {
        return { text: q, verified: true };
      }
      return { text: q, verified: false };
    });
    result[k] = {
      score: c.score,
      reasoning: c.reasoning,
      evidence_quotes: verifiedQuotes,
    };
  }
  return result as VerifiedCriteria;
}

export function synthesizeRawText(parsed: Omit<ParsedCv, "_raw_text">): string {
  const parts: string[] = [];
  if (parsed.personal.full_name) parts.push(parsed.personal.full_name);
  if (parsed.personal.location) parts.push(parsed.personal.location);
  for (const e of parsed.experience) {
    parts.push(`${e.title} tại ${e.company}.`);
    if (e.description) parts.push(e.description);
  }
  for (const ed of parsed.education) {
    parts.push(`${ed.degree ?? ""} ${ed.field ?? ""} tại ${ed.institution}`.trim() + ".");
  }
  if (parsed.skills.length) parts.push("Kỹ năng: " + parsed.skills.join(", ") + ".");
  if (parsed.certifications.length) {
    parts.push("Chứng chỉ: " + parsed.certifications.map((c) => c.name).join(", ") + ".");
  }
  if (parsed.languages.length) {
    parts.push("Ngoại ngữ: " + parsed.languages.map((l) => l.name).join(", ") + ".");
  }
  return parts.join(" ");
}
