import { createClient } from "@/lib/supabase/server";

export interface TourState {
  tourCompletedAt: string | null;
  tourCompletedSteps: string[];
}

export async function fetchTourState(): Promise<TourState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { tourCompletedAt: null, tourCompletedSteps: [] };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tour_completed_at, tour_completed_steps")
    .eq("id", user.id)
    .single();

  return {
    tourCompletedAt: profile?.tour_completed_at ?? null,
    tourCompletedSteps: (profile?.tour_completed_steps as string[]) ?? [],
  };
}
