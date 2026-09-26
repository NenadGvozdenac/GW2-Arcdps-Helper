import { z } from "zod";
import { MAX_URLS_PER_CALL } from "../config/constants";

const gw2Account = z
  .string()
  .trim()
  .refine((v) => v === "" || /^.{3,32}\.\d{4}$/.test(v), "GW2 account must look like Name.1234");

export const registerSchema = z.object({
  email: z.email("Invalid email address.").trim().max(254),
  password: z.string().min(6, "Password must be at least 6 characters.").max(200),
  displayName: z.string().trim().min(1, "Display name is required.").max(40),
  gw2Account: gw2Account.default(""),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required.").max(40).optional(),
  gw2Account: gw2Account.optional(),
});

export const submitLogsSchema = z.object({
  urls: z
    .array(z.string().trim().min(1))
    .min(1, "No links provided.")
    .max(MAX_URLS_PER_CALL, `At most ${MAX_URLS_PER_CALL} links per request.`)
    .transform((urls) => [...new Set(urls)]),
});

export const idParamSchema = z.object({
  id: z.uuid("Invalid ID."),
});
