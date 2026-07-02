import "server-only";
import { getAccessToken } from "./auth";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Minimal Graph HTTP helper (replaces @microsoft/microsoft-graph-client).
 * Returns the raw Response — callers classify errors themselves.
 */
export async function graphFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

/** POST JSON to Graph; throws GraphHttpError on non-2xx. */
export async function graphPost(path: string, body: unknown): Promise<Response> {
  const res = await graphFetch(path, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw await GraphHttpError.fromResponse(res);
  return res;
}

export class GraphHttpError extends Error {
  readonly statusCode: number;
  readonly retryAfterSec?: number;
  constructor(statusCode: number, message: string, retryAfterSec?: number) {
    super(message);
    this.name = "GraphHttpError";
    this.statusCode = statusCode;
    this.retryAfterSec = retryAfterSec;
  }
  static async fromResponse(res: Response): Promise<GraphHttpError> {
    const bodyText = await res.text().catch(() => "");
    let message = `Graph ${res.status}`;
    try {
      const parsed = JSON.parse(bodyText) as { error?: { code?: string; message?: string } };
      if (parsed.error) message = `${parsed.error.code}: ${parsed.error.message}`;
    } catch {
      if (bodyText) message = `${message}: ${bodyText.slice(0, 300)}`;
    }
    const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
    return new GraphHttpError(res.status, message, retryAfter);
  }
}
