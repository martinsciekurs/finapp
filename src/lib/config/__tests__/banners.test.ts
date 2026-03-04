import { describe, it, expect } from "vitest";
import {
  ONBOARDING_BANNER_PRESETS,
  BANNER_VALUE_RE,
  DEFAULT_BANNER,
  parseBanner,
} from "../banners";

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

describe("DEFAULT_BANNER", () => {
  it("is a valid gradient", () => {
    expect(DEFAULT_BANNER.type).toBe("gradient");
    expect(DEFAULT_BANNER.value).toMatch(/^linear-gradient\(/);
  });

  it("matches the Forest preset value", () => {
    const forest = ONBOARDING_BANNER_PRESETS.find(
      (p) => p.label === "Forest"
    );
    expect(DEFAULT_BANNER.value).toBe(forest?.value);
  });
});

describe("BANNER_VALUE_RE", () => {
  it("accepts valid hex colors", () => {
    expect(BANNER_VALUE_RE.test("#2d4a3e")).toBe(true);
    expect(BANNER_VALUE_RE.test("#FFFFFF")).toBe(true);
  });

  it("accepts valid gradients", () => {
    expect(
      BANNER_VALUE_RE.test("linear-gradient(135deg, #2d4a3e, #5b9a82)")
    ).toBe(true);
  });

  it("rejects 3-digit hex", () => {
    expect(BANNER_VALUE_RE.test("#fff")).toBe(false);
  });

  it("rejects arbitrary strings", () => {
    expect(BANNER_VALUE_RE.test("red")).toBe(false);
    expect(BANNER_VALUE_RE.test("<script>")).toBe(false);
    expect(BANNER_VALUE_RE.test("")).toBe(false);
  });
});

describe("parseBanner", () => {
  it("parses valid color banner", () => {
    expect(parseBanner({ type: "color", value: "#2d4a3e" })).toEqual({
      type: "color",
      value: "#2d4a3e",
    });
  });

  it("parses valid gradient banner", () => {
    const gradient = "linear-gradient(135deg, #2d4a3e, #5b9a82)";
    expect(parseBanner({ type: "gradient", value: gradient })).toEqual({
      type: "gradient",
      value: gradient,
    });
  });

  it("returns null for null input", () => {
    expect(parseBanner(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseBanner(undefined)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parseBanner("string")).toBeNull();
    expect(parseBanner(42)).toBeNull();
    expect(parseBanner(true)).toBeNull();
  });

  it("returns null for arrays", () => {
    expect(parseBanner([1, 2, 3])).toBeNull();
  });

  it("returns null for missing type field", () => {
    expect(parseBanner({ value: "#ffffff" })).toBeNull();
  });

  it("returns null for missing value field", () => {
    expect(parseBanner({ type: "color" })).toBeNull();
  });

  it("returns null for invalid type value", () => {
    expect(parseBanner({ type: "image", value: "url(...)" })).toBeNull();
  });

  it("returns null for non-string value", () => {
    expect(parseBanner({ type: "color", value: 123 })).toBeNull();
  });

  it("returns null for values failing regex validation", () => {
    expect(parseBanner({ type: "color", value: "#fff" })).toBeNull();
    expect(parseBanner({ type: "color", value: "red" })).toBeNull();
    expect(parseBanner({ type: "color", value: "<script>" })).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(parseBanner({})).toBeNull();
  });
});
