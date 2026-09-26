import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { DPS_REPORT_TIMEOUT_MS, DPS_REPORT_UPLOAD_URL } from "../../config/constants";
import type { DpsReportUploadResponse } from "../../types/dpsReport.types";
import { AppError, fetchWithTimeout } from "../../utils/appError";

export const dpsReportClient = {
  /** Uploads one ArcDPS log and returns dps.report's JSON summary. */
  async upload(filePath: string, userToken: string): Promise<Required<Pick<DpsReportUploadResponse, "permalink">> & DpsReportUploadResponse> {
    const params = new URLSearchParams({ json: "1", generator: "ei" });
    if (userToken) params.set("userToken", userToken);

    const form = new FormData();
    form.append("file", new Blob([await readFile(filePath)]), basename(filePath));

    const res = await fetchWithTimeout(
      `${DPS_REPORT_UPLOAD_URL}?${params}`,
      { method: "POST", body: form },
      DPS_REPORT_TIMEOUT_MS,
    );
    const body = (await res.json().catch(() => null)) as DpsReportUploadResponse | null;

    if (!res.ok || !body) {
      throw new AppError("DPS_REPORT_FAILED", body?.error || `dps.report returned ${res.status}`, res.status);
    }
    if (body.error || !body.permalink) {
      throw new AppError("DPS_REPORT_FAILED", body.error || "dps.report did not return a permalink");
    }
    return body as DpsReportUploadResponse & { permalink: string };
  },
};
