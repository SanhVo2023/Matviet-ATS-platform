/**
 * Evidence-quote validation.
 *
 * Gemini hallucinates citations 30-94% of the time per published research.
 * After a score pass, we fuzzy-match every evidence quote against the parsed
 * CV's raw text. Verified quotes get a green check in the UI; unverified get
 * an amber warning + tooltip — but unverified does NOT block the score, it
 * just nudges HR to spot-check.
 *
 * Implementation:
 * - Tokenize CV text into sentences.
 * - For each quote: substring exact match → verified=true.
 *   Else fuzzy via Fuse.js: best.score < 0.05 (≈90% similar) → verified=true.
 *   Else verified=false.
 * - Vietnamese diacritics handled by lowercase-and-NFC-normalize before compare.
 */
import Fuse from "fuse.js";
import { CRITERION_CODES, type ScoreResult, type VerifiedCriteria } from "@/lib/ai/gemini/types";

const FUSE_THRESHOLD = 0.3; // search range — wider so fuzzy candidates surface
const VERIFY_SCORE_BAR = 0.05; // Fuse score: 0=perfect, 1=worst. <0.05 ≈ 90%+ similarity

const SENTENCE_SPLIT_RE = /(?<=[.!?…\n])\s+/u;

/** Normalize for comparison: NFC, lowercase, collapse whitespace. */
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
      // 1. Exact substring
      if (haystack.includes(nq)) return { text: q, verified: true };
      // 2. Fuzzy
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

/** Build the synthesized _raw_text string from a parsed CV — used by the Edge Function. */
export function synthesizeRawText(parsed: {
  personal: { full_name: string | null; location: string | null };
  experience: Array<{ company: string; title: string; description: string | null }>;
  education: Array<{ institution: string; degree: string | null; field: string | null }>;
  skills: string[];
  certifications: Array<{ name: string }>;
  languages: Array<{ name: string }>;
}): string {
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
