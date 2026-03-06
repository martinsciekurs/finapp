/**
 * Preset tag color palette.
 * 12 colors chosen to be visually distinct and work in both light/dark modes.
 */
export const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
] as const;

export const MAX_TAGS_PER_TRANSACTION = 5;
export const MAX_TAGS_PER_USER = 50;
export const TAG_NAME_MAX_LENGTH = 30;
