import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = {
  title: "Onboarding",
};

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed_at, onboarding_completed_steps")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  // Determine which step to resume from
  const completedSteps = (profile?.onboarding_completed_steps as string[]) || [];
  const steps = ["welcome", "categories", "banner"];
  const currentStepIndex = steps.findIndex(
    (step) => !completedSteps.includes(step)
  );

  return (
    <OnboardingWizard
      displayName={profile?.display_name || "there"}
      initialStep={currentStepIndex >= 0 ? currentStepIndex : 0}
    />
  );
}
