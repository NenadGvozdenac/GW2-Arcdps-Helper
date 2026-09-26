import type { z } from "zod";
import { validationError } from "../utils/httpError";

/** Parses input with a zod schema, throwing a 400 with the first issue's message on failure. */
export function validate<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error.issues[0]?.message ?? "Invalid request.");
  return result.data;
}
