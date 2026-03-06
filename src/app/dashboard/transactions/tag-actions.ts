"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createTagSchema,
  assignTagSchema,
  removeTagSchema,
  type CreateTagValues,
} from "@/lib/validations/tag";
import { MAX_TAGS_PER_TRANSACTION, MAX_TAGS_PER_USER } from "@/lib/config/tags";
import type { ActionResult } from "@/lib/types/actions";

// ────────────────────────────────────────────
// Create tag
// ────────────────────────────────────────────

export async function createTag(
  values: CreateTagValues
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createTagSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid tag data",
    };
  }

  const { count, error: countError } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    return { success: false, error: "Failed to check tag count" };
  }

  if ((count ?? 0) >= MAX_TAGS_PER_USER) {
    return {
      success: false,
      error: `You can have at most ${MAX_TAGS_PER_USER} tags`,
    };
  }

  const { data: tag, error } = await supabase
    .from("tags")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Failed to create tag" };
  }

  revalidatePath("/dashboard/transactions");

  return { success: true, data: { id: tag.id } };
}

// ────────────────────────────────────────────
// Delete tag
// ────────────────────────────────────────────

export async function deleteTag(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid tag ID" };
  }

  const { data: deleted, error } = await supabase
    .from("tags")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to delete tag" };
  }

  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Tag not found" };
  }

  revalidatePath("/dashboard/transactions");

  return { success: true };
}

// ────────────────────────────────────────────
// Assign tag to transaction
// ────────────────────────────────────────────

export async function assignTagToTransaction(
  transactionId: string,
  tagId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = assignTagSchema.safeParse({ transactionId, tagId });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid IDs",
    };
  }

  const { count, error: countError } = await supabase
    .from("transaction_tags")
    .select("tag_id", { count: "exact", head: true })
    .eq("transaction_id", transactionId)
    .eq("user_id", user.id);

  if (countError) {
    return { success: false, error: "Failed to check tag count" };
  }

  if ((count ?? 0) >= MAX_TAGS_PER_TRANSACTION) {
    return {
      success: false,
      error: `Transactions can have at most ${MAX_TAGS_PER_TRANSACTION} tags`,
    };
  }

  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("id")
    .eq("id", tagId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (tagError || !tag) {
    return { success: false, error: "Tag not found" };
  }

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (txError || !transaction) {
    return { success: false, error: "Transaction not found" };
  }

  const { error } = await supabase.from("transaction_tags").insert({
    transaction_id: transactionId,
    tag_id: tagId,
    user_id: user.id,
  });

  if (error) {
    return { success: false, error: "Failed to assign tag" };
  }

  revalidatePath("/dashboard/transactions");

  return { success: true };
}

// ────────────────────────────────────────────
// Remove tag from transaction
// ────────────────────────────────────────────

export async function removeTagFromTransaction(
  transactionId: string,
  tagId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = removeTagSchema.safeParse({ transactionId, tagId });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid IDs",
    };
  }

  const { error } = await supabase
    .from("transaction_tags")
    .delete()
    .eq("transaction_id", transactionId)
    .eq("tag_id", tagId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Failed to remove tag" };
  }

  revalidatePath("/dashboard/transactions");

  return { success: true };
}
