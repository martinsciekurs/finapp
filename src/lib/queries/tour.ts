import { createClient } from "@/lib/supabase/server";

export interface TourState {
  tourCompletedAt: string | null;
  tourCompletedSteps: string[];
}

export async function fetchTourState(): Promise<TourState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Failed to authenticate user: ${authError.message}`);
  }

  if (!user) {
    return { tourCompletedAt: null, tourCompletedSteps: [] };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tour_completed_at, tour_completed_steps")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch tour state: ${error.message}`);
  }

  if (!profile) {
    return { tourCompletedAt: null, tourCompletedSteps: [] };
  }

  const rawSteps = profile.tour_completed_steps;
  const tourCompletedSteps =
    Array.isArray(rawSteps) && rawSteps.every((step) => typeof step === "string")
      ? rawSteps
      : [];

  return {
    tourCompletedAt: profile.tour_completed_at ?? null,
    tourCompletedSteps,
  };
}
