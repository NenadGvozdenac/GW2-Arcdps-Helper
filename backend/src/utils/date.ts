/** Parses Elite Insights dates like "2023-01-09 19:05:05 +01:00". */
export function parseEiDate(value: string | undefined): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2}:?\d{2})$/);
  const date = new Date(m ? `${m[1]}T${m[2]}${m[3]}` : value);
  return isNaN(date.getTime()) ? null : date;
}
