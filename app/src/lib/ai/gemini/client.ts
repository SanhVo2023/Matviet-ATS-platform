/**
 * Lazy GoogleGenAI client for the Next.js side.
 *
 * Used for type checking + the rare server-side direct call (e.g. an admin
 * health-check route in G11). The hot path — production CV scoring — runs
 * in the Supabase Edge Function (Deno) which instantiates its own client.
 *
 * Env: GEMINI_API_KEY required. GEMINI_MODEL defaults to gemini-2.5-flash.
 */
import "server-only";
import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "@/types/env";

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = serverEnv.geminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa cấu hình.");
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

export function getGeminiModelName(): string {
  return serverEnv.geminiModel();
}
