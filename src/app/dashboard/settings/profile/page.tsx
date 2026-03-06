import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/profile-form";
import { EmailForm } from "@/components/settings/email-form";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error("Failed to authenticate user");
  }

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, currency")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error("Failed to load profile");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
          Settings
        </Link>
        <h2 className="font-serif text-xl font-bold sm:text-2xl">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your display name, currency, and email.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <ProfileForm
          defaultValues={{
            displayName: profile.display_name ?? "",
            currency: profile.currency,
          }}
        />

        <EmailForm defaultEmail={user.email ?? ""} />
      </div>
    </div>
  );
}
