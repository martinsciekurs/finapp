"use server";

import { createClient } from "@/lib/supabase/server";

const VALID_TOUR_STEPS = [
  "welcome-tour",
  "tip-budget",
  "tip-debts",
] as const;

type TourStep = (typeof VALID_TOUR_STEPS)[number];

export async function completeTour() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error: rpcError } = await supabase.rpc("append_tour_step", {
    profile_id: user.id,
    step: "welcome-tour",
  });

  if (rpcError) {
    return { success: false, error: "Failed to update tour step" };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ tour_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    return { success: false, error: "Failed to mark tour complete" };
  }

  return { success: true };
}

export async function dismissQuickTip(step: TourStep) {
  if (!VALID_TOUR_STEPS.includes(step)) {
    return { success: false, error: "Invalid tour step" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("append_tour_step", {
    profile_id: user.id,
    step,
  });

  if (error) {
    return { success: false, error: "Failed to dismiss tip" };
  }

  return { success: true };
}
