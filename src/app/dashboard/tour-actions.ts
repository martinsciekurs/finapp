"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";

const VALID_TOUR_STEPS = [
  "welcome-tour",
  "tip-budget",
  "tip-debts",
] as const;

export type TourStep = (typeof VALID_TOUR_STEPS)[number];
export type QuickTipId = Exclude<TourStep, "welcome-tour">;
type AuthState =
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
    }
  | {
      error: string;
    };

const WELCOME_TOUR_STEP: TourStep = VALID_TOUR_STEPS[0];

async function requireAuth(): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { error: "Failed to authenticate user" };
  }

  if (!user) {
    return { error: "Not authenticated" };
  }

  return { supabase, userId: user.id };
}

export async function completeTour(): Promise<ActionResult> {
  const auth = await requireAuth();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { supabase, userId } = auth;

  const { error: rpcError } = await supabase.rpc("append_tour_step", {
    profile_id: userId,
    step: WELCOME_TOUR_STEP,
  });

  if (rpcError) {
    return { success: false, error: "Failed to update tour step" };
  }

  return { success: true };
}

export async function dismissQuickTip(step: QuickTipId): Promise<ActionResult> {
  if (!VALID_TOUR_STEPS.includes(step)) {
    return { success: false, error: "Invalid tour step" };
  }

  const auth = await requireAuth();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { supabase, userId } = auth;

  const { error } = await supabase.rpc("append_tour_step", {
    profile_id: userId,
    step,
  });

  if (error) {
    return { success: false, error: "Failed to dismiss tip" };
  }

  return { success: true };
}
