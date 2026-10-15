import { http } from "./httpClient";

/** One raid week as the API sends it: ISO dates and wing group ids. */
export interface RaidWeekDto {
  start: string;
  end: string;
  emboldened: string;
  callOfTheMists: string;
}

export const raidRepository = {
  /** The current raid week and the `weeks - 1` after it (the backend works out the rotation). */
  async weeklies(weeks: number): Promise<RaidWeekDto[]> {
    return (await http.get<{ weeks: RaidWeekDto[] }>(`/raids/weeklies?weeks=${weeks}`)).weeks;
  },
};
