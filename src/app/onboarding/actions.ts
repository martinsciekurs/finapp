"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { CategoryPreset } from "@/lib/config/categories";

const VALID_STEPS = ["welcome", "categories", "banner"] as const;
type OnboardingStep = (typeof VALID_STEPS)[number];

/** Regex: hex color or CSS linear-gradient */
const BANNER_VALUE_RE = /^(#[0-9a-fA-F]{6}|linear-gradient\(.+\))$/;

interface OnboardingData {
  categories: CategoryPreset[];
  banner: { type: "color" | "gradient"; value: string };
}

export async function completeOnboarding(data: OnboardingData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate banner value to prevent XSS via style injection
  if (!BANNER_VALUE_RE.test(data.banner.value)) {
    return { success: false, error: "Invalid banner value" };
  }

  // Validate category fields before processing
  if (!Array.isArray(data.categories)) {
    return { success: false, error: "Invalid categories data" };
  }

  for (const cat of data.categories) {
    if (
      typeof cat.name !== "string" ||
      typeof cat.icon !== "string" ||
      typeof cat.color !== "string" ||
      (cat.type !== "income" && cat.type !== "expense")
    ) {
      return { success: false, error: "Invalid category data" };
    }
  }

  // Validate minimum categories
  const expenseCategories = data.categories.filter((c) => c.type === "expense");
  if (expenseCategories.length < 2) {
    return { success: false, error: "At least 2 expense categories required" };
  }

  // Create all selected categories — sanitize fields to prevent injection
  const categoriesToInsert = data.categories.map((cat, index) => ({
    user_id: user.id,
    name: cat.name.slice(0, 100),
    type: cat.type === "income" ? "income" as const : "expense" as const,
    icon: cat.icon.slice(0, 50),
    color: cat.color.slice(0, 20),
    sort_order: index,
  }));

  // Upsert for idempotency — safe on retry if profile update below fails
  const { error: categoriesError } = await supabase
    .from("categories")
    .upsert(categoriesToInsert, { onConflict: "user_id,type,name", ignoreDuplicates: true });

  if (categoriesError) {
    return { success: false, error: "Failed to create categories" };
  }

  // Update profile with banner and mark onboarding complete
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      hero_banner: data.banner,
      onboarding_completed_steps: ["welcome", "categories", "banner"],
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: "Failed to update profile" };
  }

  redirect("/dashboard");
}

export async function updateOnboardingStep(step: OnboardingStep) {
  // Validate step name against allowed values
  if (!VALID_STEPS.includes(step)) {
    return { success: false, error: "Invalid step" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get current steps
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_completed_steps")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "Failed to read profile" };
  }

  const currentSteps = (profile.onboarding_completed_steps as string[]) || [];

  if (!currentSteps.includes(step)) {
    const { error } = await supabase
      .from("profiles")
      .update({
        onboarding_completed_steps: [...currentSteps, step],
      })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: "Failed to update step" };
    }
  }

  return { success: true };
}
