/** Response of POST https://dps.report/uploadContent?json=1 (fields the uploader uses). */
export interface DpsReportUploadResponse {
  id?: string;
  permalink?: string;
  encounterTime?: number; // unix seconds
  encounter?: {
    boss: string;
    bossId: number;
    success: boolean;
    isCm: boolean;
    isLegendaryCm?: boolean;
    duration: number; // seconds
  };
  error?: string | null;
}
