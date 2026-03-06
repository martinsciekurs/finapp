"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types/actions";
import {
  profileSchema,
  emailSchema,
  type ProfileValues,
  type EmailValues,
} from "@/lib/validations/profile";

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function updateProfile(
  data: ProfileValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid profile data",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      currency: parsed.data.currency,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Failed to update profile" };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function updateEmail(data: EmailValues): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = emailSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid email address",
    };
  }

  if (parsed.data.email === user.email) {
    return { success: false, error: "New email is the same as current" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: parsed.data.email,
  });

  if (error) {
    return { success: false, error: "Failed to update email" };
  }

  revalidatePath("/dashboard/settings/profile");
  return { success: true };
}
