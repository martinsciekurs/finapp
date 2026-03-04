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
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error("Failed to authenticate user");
  }

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
