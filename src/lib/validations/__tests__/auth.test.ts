import { describe, it, expect } from "vitest";
import { loginSchema, signUpSchema } from "../auth";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password under 6 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("accepts password of exactly 6 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "123456",
    });
    expect(result.success).toBe(true);
  });
});

describe("signUpSchema", () => {
  it("accepts valid sign-up data", () => {
    const result = signUpSchema.safeParse({
      displayName: "Jane",
      email: "jane@example.com",
      password: "secure123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects displayName under 2 characters", () => {
    const result = signUpSchema.safeParse({
      displayName: "J",
      email: "j@example.com",
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects displayName over 50 characters", () => {
    const result = signUpSchema.safeParse({
      displayName: "A".repeat(51),
      email: "a@example.com",
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password over 72 characters", () => {
    const result = signUpSchema.safeParse({
      displayName: "Jane",
      email: "jane@example.com",
      password: "a".repeat(73),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing displayName", () => {
    const result = signUpSchema.safeParse({
      email: "jane@example.com",
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signUpSchema.safeParse({
      displayName: "Jane",
      email: "not-valid",
      password: "secure123",
    });
    expect(result.success).toBe(false);
  });
});
