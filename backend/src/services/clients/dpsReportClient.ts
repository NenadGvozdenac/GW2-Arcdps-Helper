import { DPS_REPORT_BASE_URL } from "../../config/constants";
import type { EiJson, UploadMetadata } from "../../types/dpsreport.types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DPS_REPORT_BASE_URL}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`dps.report returned ${res.status} for ${path}`);
  const body = (await res.json()) as T & { error?: string };
  if (body && typeof body === "object" && body.error) throw new Error(`dps.report: ${body.error}`);
  return body;
}

export const logUrl = (permalink: string) => `${DPS_REPORT_BASE_URL}/${permalink}`;

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
