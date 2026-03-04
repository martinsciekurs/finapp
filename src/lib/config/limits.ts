/**
 * Centralized plan limits — overridable via environment variables.
 */
export const PLAN_LIMITS = {
  free: {
    transactionsPerMonth: parseInt(
      process.env.LIMIT_FREE_TRANSACTIONS_PER_MONTH || "40",
      10
    ),
    aiCreditsPerDay: parseInt(
      process.env.LIMIT_FREE_AI_CREDITS_PER_DAY || "15",
      10
    ),
    maxAttachments: 3,
    maxAttachmentSize: 5 * 1024 * 1024, // 5MB
    telegramEnabled: false,
  },
  pro: {
    transactionsPerMonth: Infinity,
    aiCreditsPerDay: parseInt(
      process.env.LIMIT_PRO_AI_CREDITS_PER_DAY || "500",
      10
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
