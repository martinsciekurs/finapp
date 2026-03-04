import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { parseBanner } from "@/lib/config/banners";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error("Failed to authenticate user");
  }

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, hero_banner")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("Failed to load profile");
  }

  const displayName = profile?.display_name || "there";
  const banner = parseBanner(profile?.hero_banner);

  return (
    <DashboardShell displayName={displayName} banner={banner}>
      {children}
    </DashboardShell>
  );
}
