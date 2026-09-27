import { DPS_REPORT_BASE_URL, DPS_REPORT_UPLOAD_TIMEOUT_MS } from "../../config/constants";
import type { DpsReportUploadResponse, EiJson, UploadMetadata } from "../../types/dpsreport.types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DPS_REPORT_BASE_URL}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`dps.report returned ${res.status} for ${path}`);
  const body = (await res.json()) as T & { error?: string };
  if (body && typeof body === "object" && body.error) throw new Error(`dps.report: ${body.error}`);
  return body;
}

export const logUrl = (permalink: string) => `${DPS_REPORT_BASE_URL}/${permalink}`;

/**
 * Uploads an ArcDPS log file to dps.report (parsed with Elite Insights) and returns its permalink URL.
 * With the user's dps.report token the log also lands in their dps.report account.
 */
export async function uploadLogFile(content: Buffer, fileName: string, userToken: string | null = null): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(content)]), fileName);
  const params = new URLSearchParams({ json: "1", generator: "ei" });
  if (userToken) params.set("userToken", userToken);
  const res = await fetch(`${DPS_REPORT_BASE_URL}/uploadContent?${params}`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(DPS_REPORT_UPLOAD_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as DpsReportUploadResponse | null;
  if (!res.ok || !body?.permalink || body.error) {
    throw new Error(body?.error || `dps.report returned ${res.status}`);
  }
  return body.permalink;
}

export const fetchUploadMetadata = (permalink: string) =>
  getJson<UploadMetadata>(`/getUploadMetadata?permalink=${encodeURIComponent(permalink)}`);

/** Returns null when the log has no EI JSON (e.g. very old uploads). */
export async function fetchEliteInsightsJson(permalink: string): Promise<EiJson | null> {
  try {
    return await getJson<EiJson>(`/getJson?permalink=${encodeURIComponent(permalink)}`);
  } catch {
    return null;
  }
}
