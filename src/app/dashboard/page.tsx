import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, hero_banner")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold">
          Welcome, {profile?.display_name || "there"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your dashboard is being built. Phase 2 will add summary cards,
          transactions, budgets, and more.
        </p>
      </div>
    </div>
  );
}
