import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AttachmentData, AttachmentRecordType } from "@/lib/types/attachments";

const ATTACHMENTS_BUCKET = "attachments";

export async function fetchAttachmentsByRecordIds(
  recordType: AttachmentRecordType,
  recordIds: string[]
): Promise<Map<string, AttachmentData[]>> {
  const byRecord = new Map<string, AttachmentData[]>();

  if (recordIds.length === 0) {
    return byRecord;
  }

  const supabase = await createClient();

  const uniqueRecordIds = Array.from(new Set(recordIds));

  const { data, error } = await supabase
    .from("attachments")
    .select("id, record_id, file_path, file_name, file_size, mime_type, created_at")
    .eq("record_type", recordType)
    .in("record_id", uniqueRecordIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Failed to fetch attachments: ${error.message}`);
    return byRecord;
  }

  const rows = data ?? [];
  const signedUrlMap = new Map<string, string | null>();

  if (rows.length > 0) {
    const filePaths = rows.map((row) => row.file_path);
    const { data: signedUrls } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrls(filePaths, 60 * 60);

    if (signedUrls) {
      for (const item of signedUrls) {
        if (item.path && !item.error) {
          signedUrlMap.set(item.path, item.signedUrl);
        }
      }
    }
  }

  for (const row of rows) {
    const item: AttachmentData = {
      id: row.id,
      filePath: row.file_path,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      createdAt: row.created_at,
      previewUrl: signedUrlMap.get(row.file_path) ?? null,
    };

    const list = byRecord.get(row.record_id);
    if (list) {
      list.push(item);
    } else {
      byRecord.set(row.record_id, [item]);
    }
  }

  return byRecord;
}
