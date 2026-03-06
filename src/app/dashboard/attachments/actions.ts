"use server";

import { revalidatePath } from "next/cache";

import { ALLOWED_ATTACHMENT_MIME_TYPES, PLAN_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { AttachmentData } from "@/lib/types/attachments";
import { formatParseError } from "@/lib/utils/validation";
import {
  deleteAttachmentSchema,
  uploadAttachmentSchema,
  type DeleteAttachmentValues,
} from "@/lib/validations/attachment";

const ATTACHMENTS_BUCKET = "attachments";

function revalidate(): void {
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/debts");
  revalidatePath("/dashboard/reminders");
  revalidatePath("/dashboard");
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "attachment";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function formatAttachmentData(
  row: {
    id: string;
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    created_at: string;
  },
  previewUrl: string | null
): AttachmentData {
  return {
    id: row.id,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    previewUrl,
  };
}

export async function uploadAttachment(
  formData: FormData
): Promise<ActionResult<{ attachment: AttachmentData }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = uploadAttachmentSchema.safeParse({
    record_type: formData.get("record_type"),
    record_id: formData.get("record_id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid attachment payload"),
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" };
  }

  if (file.size <= 0) {
    return { success: false, error: "File is empty" };
  }

  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return {
      success: false,
      error: "File type not supported. Allowed: PNG, JPG, WebP, GIF, PDF",
    };
  }

  const maxFileSize = PLAN_LIMITS.free.maxAttachmentSize;
  if (file.size > maxFileSize) {
    return { success: false, error: "File exceeds 5MB size limit" };
  }

  const { count, error: countError } = await supabase
    .from("attachments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("record_type", parsed.data.record_type)
    .eq("record_id", parsed.data.record_id);

  if (countError) {
    return { success: false, error: "Failed to validate attachment limit" };
  }

  const maxAttachments = PLAN_LIMITS.free.maxAttachments;
  if ((count ?? 0) >= maxAttachments) {
    return {
      success: false,
      error: `Only ${maxAttachments} attachments are allowed per record`,
    };
  }

  const safeName = sanitizeFileName(file.name);
  const filePath = `${user.id}/${parsed.data.record_type}/${parsed.data.record_id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      success: false,
      error: uploadError.message || "Failed to upload file",
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("attachments")
    .insert({
      user_id: user.id,
      record_type: parsed.data.record_type,
      record_id: parsed.data.record_id,
      file_path: filePath,
      file_name: safeName,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
    })
    .select("id, file_path, file_name, file_size, mime_type, created_at")
    .single();

  if (insertError) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([filePath]);
    return { success: false, error: "Failed to save attachment metadata" };
  }

  const { data: signedUrl } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(filePath, 60 * 60);

  revalidate();

  return {
    success: true,
    data: {
      attachment: formatAttachmentData(inserted, signedUrl?.signedUrl ?? null),
    },
  };
}

export async function deleteAttachment(
  values: DeleteAttachmentValues
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = deleteAttachmentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid attachment ID"),
    };
  }

  const { data: attachment, error: fetchError } = await supabase
    .from("attachments")
    .select("id, file_path")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: "Failed to load attachment" };
  }

  if (!attachment) {
    return { success: false, error: "Attachment not found" };
  }

  const { error: storageDeleteError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .remove([attachment.file_path]);

  if (storageDeleteError) {
    return {
      success: false,
      error: storageDeleteError.message || "Failed to delete file",
    };
  }

  const { data: deleted, error: dbDeleteError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id");

  if (dbDeleteError) {
    return { success: false, error: "Failed to delete attachment" };
  }

  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Attachment not found" };
  }

  revalidate();
  return { success: true, data: { id: parsed.data.id } };
}
