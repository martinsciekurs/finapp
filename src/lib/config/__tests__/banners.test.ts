import { describe, it, expect } from "vitest";
import { ONBOARDING_BANNER_PRESETS } from "../banners";

describe("ONBOARDING_BANNER_PRESETS", () => {
  it("has both colors and gradients", () => {
    const colors = ONBOARDING_BANNER_PRESETS.filter((p) => p.type === "color");
    const gradients = ONBOARDING_BANNER_PRESETS.filter(
      (p) => p.type === "gradient"
    );
    expect(colors.length).toBeGreaterThan(0);
    expect(gradients.length).toBeGreaterThan(0);
  });

  it("color presets have valid hex values", () => {
    const colors = ONBOARDING_BANNER_PRESETS.filter((p) => p.type === "color");
    for (const c of colors) {
      expect(c.value).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("gradient presets have valid CSS gradient values", () => {
    const gradients = ONBOARDING_BANNER_PRESETS.filter(
      (p) => p.type === "gradient"
    );
    for (const g of gradients) {
      expect(g.value).toMatch(/^linear-gradient\(/);
    }
  });

  it("all presets have unique labels", () => {
    const labels = ONBOARDING_BANNER_PRESETS.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
