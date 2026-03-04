/**
 * Banner presets for onboarding — matches the seeded banner_presets table.
 * During onboarding, only colors and gradients are shown (no photos for speed).
 */

/** Banner data stored in profiles.hero_banner (JSONB) */
export interface BannerData {
  type: "color" | "gradient";
  value: string;
}

export interface BannerPreset extends BannerData {
  label: string;
}

/** Regex: hex color or CSS linear-gradient — shared with onboarding actions */
export const BANNER_VALUE_RE = /^(#[0-9a-fA-F]{6}|linear-gradient\(.+\))$/;

/** Default banner shown when user has no banner set */
export const DEFAULT_BANNER: BannerData = {
  type: "gradient",
  value: "linear-gradient(135deg, #2d4a3e, #5b9a82)", // Forest
};

/**
 * Parse raw JSONB from database into a validated BannerData.
 * Returns null for invalid/missing data — never throws.
 */
export function parseBanner(raw: unknown): BannerData | null {
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "type" in raw &&
    "value" in raw
  ) {
    const obj = raw as { type: unknown; value: unknown };
    if (
      (obj.type === "color" || obj.type === "gradient") &&
      typeof obj.value === "string" &&
      BANNER_VALUE_RE.test(obj.value)
    ) {
      return { type: obj.type, value: obj.value };
    }
  }
  return null;
}

export const ONBOARDING_BANNER_PRESETS: BannerPreset[] = [
  // Solid colors
  { type: "color", value: "#fdf6ee", label: "Warm Cream" },
  { type: "color", value: "#2d4a3e", label: "Sage Green" },
  { type: "color", value: "#c4a0a0", label: "Dusty Rose" },
  { type: "color", value: "#c97b5e", label: "Terracotta" },
  { type: "color", value: "#5a7d8c", label: "Slate Blue" },
  { type: "color", value: "#3a3a3a", label: "Charcoal" },
  { type: "color", value: "#c9a84c", label: "Soft Gold" },
  { type: "color", value: "#9a8cb0", label: "Muted Lavender" },

  // Gradients
  { type: "gradient", value: "linear-gradient(135deg, #f5c6a0, #c9a84c)", label: "Sunrise" },
  { type: "gradient", value: "linear-gradient(135deg, #2d4a3e, #5b9a82)", label: "Forest" },
  { type: "gradient", value: "linear-gradient(135deg, #1a4a5a, #7ab8c9)", label: "Ocean" },
  { type: "gradient", value: "linear-gradient(135deg, #6b4c7a, #c97b5e)", label: "Dusk" },
  { type: "gradient", value: "linear-gradient(135deg, #d4c5a9, #a08c6a)", label: "Sand" },
  { type: "gradient", value: "linear-gradient(135deg, #7ab8a0, #e8f5e9)", label: "Mint" },
  { type: "gradient", value: "linear-gradient(135deg, #4a4a4a, #9a9a9a)", label: "Storm" },
  { type: "gradient", value: "linear-gradient(135deg, #c9a84c, #8b3a3a)", label: "Autumn" },
];
