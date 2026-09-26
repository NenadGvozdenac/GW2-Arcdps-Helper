export type EnvironmentName = "development" | "production";

/** Which GW2 ArcDPS Helper deployment this build talks to. Fixed at build time (.env.<mode>). */
export interface AppEnvironment {
  name: EnvironmentName;
  apiUrl: string;
  webUrl: string;
}
