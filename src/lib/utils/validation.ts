import type { z } from "zod";

/**
 * Extract the first human-readable error message from a Zod error.
 * Used by server actions to return a single error string to the client.
 */
export function formatParseError(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}
