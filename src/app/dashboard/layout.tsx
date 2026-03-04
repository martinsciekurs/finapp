import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // For now, render children directly.
  // Phase 2 will add the dashboard shell: hero banner, nav, sidebar.
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
