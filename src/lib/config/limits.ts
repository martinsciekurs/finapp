/**
 * Parse an env var as a positive integer, falling back to the default.
 */
function safeParseInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Centralized plan limits — overridable via environment variables.
 */
export const PLAN_LIMITS = {
  free: {
    transactionsPerMonth: safeParseInt(
      process.env.LIMIT_FREE_TRANSACTIONS_PER_MONTH,
      40
    ),
    aiCreditsPerDay: safeParseInt(
      process.env.LIMIT_FREE_AI_CREDITS_PER_DAY,
      15
    ),
    maxAttachments: 3,
    maxAttachmentSize: 5 * 1024 * 1024, // 5MB
    telegramEnabled: false,
  },
  pro: {
    transactionsPerMonth: Infinity,
    aiCreditsPerDay: safeParseInt(
      process.env.LIMIT_PRO_AI_CREDITS_PER_DAY,
      500
    ),
    maxAttachments: 3,
    maxAttachmentSize: 5 * 1024 * 1024, // 5MB
    telegramEnabled: true,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export function getPlanLimits(tier: PlanTier) {
  return PLAN_LIMITS[tier];
}
