"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { CategoryPreset } from "@/lib/config/categories";
import { BANNER_VALUE_RE, type BannerData } from "@/lib/config/banners";

const VALID_STEPS = ["welcome", "categories", "banner"] as const;
type OnboardingStep = (typeof VALID_STEPS)[number];

interface OnboardingData {
  categories: CategoryPreset[];
  banner: BannerData;
}

export async function completeOnboarding(data: OnboardingData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate top-level data shape before accessing nested properties
  if (typeof data !== "object" || data === null) {
    return { success: false, error: "Invalid onboarding data" };
  }

  // Validate banner payload shape before reading nested values
  if (
    typeof data.banner !== "object" ||
    data.banner === null ||
    typeof data.banner.type !== "string" ||
    typeof data.banner.value !== "string"
  ) {
    return { success: false, error: "Invalid banner value" };
  }

  // Validate banner type is one of the allowed values
  if (data.banner.type !== "color" && data.banner.type !== "gradient") {
    return { success: false, error: "Invalid banner type" };
  }

  // Validate banner value to prevent XSS via style injection
  if (!BANNER_VALUE_RE.test(data.banner.value)) {
    return { success: false, error: "Invalid banner value" };
  }

  // Normalize banner into a strongly-typed object
  const normalizedBanner: { type: "color" | "gradient"; value: string } = {
    type: data.banner.type,
    value: data.banner.value,
  };

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

  // Create default category groups first
  const expenseGroupPresets = [
    "Essentials",
    "Lifestyle",
    "Health & Growth",
    "Financial",
    "Other",
  ];
  const groupsToInsert = [
    ...expenseGroupPresets.map((name, i) => ({
      user_id: user.id,
      name,
      type: "expense" as const,
      sort_order: i,
    })),
    {
      user_id: user.id,
      name: "Income",
      type: "income" as const,
      sort_order: 0,
    },
  ];

  const { error: groupsError } = await supabase
    .from("category_groups")
    .upsert(groupsToInsert, {
      onConflict: "user_id,type,name",
      ignoreDuplicates: true,
    });

  if (groupsError) {
    return { success: false, error: "Failed to create category groups" };
  }

  // Fetch created groups to get their IDs for category assignment
  const { data: createdGroups, error: fetchGroupsError } = await supabase
    .from("category_groups")
    .select("id, name, type")
    .eq("user_id", user.id);

  if (fetchGroupsError || !createdGroups || createdGroups.length === 0) {
    return { success: false, error: "Failed to fetch category groups" };
  }

  // Build a lookup: "type:name" -> group_id
  const groupLookup = new Map<string, string>();
  for (const g of createdGroups) {
    groupLookup.set(`${g.type}:${g.name}`, g.id);
  }

  // Guaranteed non-empty after the check above
  const fallbackGroupId = createdGroups[0].id;

  // Create all selected categories — sanitize fields to prevent injection
  const categoriesToInsert = data.categories.map((cat, index) => {
    const catType = cat.type === "income" ? "income" as const : "expense" as const;

    // For expense categories, use the preset's group field. For income, use "Income".
    const groupName = catType === "income" ? "Income" : (cat.group || "Other");
    const groupId = groupLookup.get(`${catType}:${groupName}`)
      ?? groupLookup.get(`${catType}:Other`)
      ?? fallbackGroupId;

    return {
      user_id: user.id,
      group_id: groupId,
      name: cat.name.slice(0, 100),
      type: catType,
      icon: cat.icon.slice(0, 50),
      color: cat.color.slice(0, 20),
      sort_order: index,
    };
  });

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
      hero_banner: normalizedBanner as Record<string, string>,
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

  // Atomically append the step to avoid read-then-write race conditions
  const { error } = await supabase.rpc("append_onboarding_step", {
    profile_id: user.id,
    step,
  });

  if (error) {
    return { success: false, error: "Failed to update step" };
  }

  return { success: true };
}
